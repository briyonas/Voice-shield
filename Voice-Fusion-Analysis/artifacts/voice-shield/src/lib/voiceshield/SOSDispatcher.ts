import audioEngine, { type AudioFrame } from "./AudioEngine";
import speechKeyword from "./SpeechKeyword";
import yamnet from "./YamnetInference";
import scoreFusion from "./ScoreFusion";
import locationTracker from "./LocationTracker";
import evidenceRecorder from "./EvidenceRecorder";
import {
  dispatchToContacts,
  type DispatchResult,
} from "./dispatch";
import { api, type SOSPayload } from "./api";
import type {
  Contact,
  DispatcherState,
  DispatcherTick,
  GeoLocation,
  SOSTriggerData,
} from "./types";

type StateListener = (state: DispatcherState, payload?: unknown) => void;
type TickListener = (tick: DispatcherTick) => void;
type SOSListener = (data: {
  trigger: SOSTriggerData;
  detectedWords: string[];
  contacts: Contact[];
  location: GeoLocation | null;
}) => void;
type LogListener = (message: string) => void;

export class SOSDispatcher {
  isArmed = false;
  activeEventId: string | null = null;
  userId = "voiceshield_user";
  contacts: Contact[] = [];
  state: DispatcherState = "DISARMED";

  private stateListeners: StateListener[] = [];
  private tickListeners: TickListener[] = [];
  private sosListeners: SOSListener[] = [];
  private logListeners: LogListener[] = [];

  private unsubAudio: (() => void) | null = null;
  private unsubLocation: (() => void) | null = null;
  private unsubKeyword: (() => void) | null = null;
  private sosAppearedAt: number | null = null;

  setContacts(contacts: Contact[]) {
    this.contacts = contacts;
  }

  onState(cb: StateListener): () => void {
    this.stateListeners.push(cb);
    return () => {
      this.stateListeners = this.stateListeners.filter((c) => c !== cb);
    };
  }
  onTick(cb: TickListener): () => void {
    this.tickListeners.push(cb);
    return () => {
      this.tickListeners = this.tickListeners.filter((c) => c !== cb);
    };
  }
  onSOS(cb: SOSListener): () => void {
    this.sosListeners.push(cb);
    return () => {
      this.sosListeners = this.sosListeners.filter((c) => c !== cb);
    };
  }
  onLog(cb: LogListener): () => void {
    this.logListeners.push(cb);
    return () => {
      this.logListeners = this.logListeners.filter((c) => c !== cb);
    };
  }

  private setState(state: DispatcherState, payload?: unknown) {
    this.state = state;
    for (const cb of this.stateListeners) cb(state, payload);
  }

  private log(msg: string) {
    for (const cb of this.logListeners) cb(msg);
  }

  async arm(): Promise<void> {
    if (this.isArmed) return;
    this.setState("ARMING");
    await yamnet.loadModel();

    try {
      await locationTracker.getCurrentPosition();
      locationTracker.startWatching();
      const anomaly = locationTracker.getAnomaly();
      scoreFusion.setLocationMultiplier(1.0 + anomaly);
      this.log(`📍 GPS lock acquired (anomaly +${(anomaly * 100).toFixed(0)}%)`);
    } catch (err) {
      this.log("⚠️ GPS unavailable — running without location");
      console.warn("[SOSDispatcher] GPS error:", err);
    }

    scoreFusion.onSOSTrigger = (data) => this.handleSOSTrigger(data);
    scoreFusion.onWarning = (data) => this.setState("WARNING", data);

    // Speech keywords
    const speechOk = speechKeyword.start();
    if (speechOk) {
      this.log("🎙️ Speech recognition active (Hindi/English/Gujarati)");
    } else if (!speechKeyword.isSupported) {
      this.log("⚠️ Speech API not supported in this browser");
    }
    this.unsubKeyword = speechKeyword.onKeyword((e) => {
      scoreFusion.updateSignal("keywords", e.score);
      for (const word of e.newlyDetected) {
        this.log(`🔑 Keyword: "${word}"`);
      }
    });

    // Audio frames → YAMNet (mock) + pitch + volume → ScoreFusion
    this.unsubAudio = audioEngine.onFrame((frame: AudioFrame) => {
      const yResult = yamnet.analyze(frame.rms, frame.highFreqEnergy);
      scoreFusion.updateSignal("yamnet", yResult.score);
      scoreFusion.updateSignal("pitchSpike", frame.pitchSpikeScore);

      // Decay keywords if no new ones — keeps the bar honest
      const kwScore = speechKeyword.decay(0.985);
      scoreFusion.updateSignal("keywords", kwScore);

      const result = scoreFusion.compute();

      const tick: DispatcherTick = {
        finalScore: result.finalScore,
        signals: result.signals,
        consecutiveWindows: result.consecutiveWindows,
        yamnetClass: yResult.detectedClass,
        pitchHz: frame.pitchHz,
        pitchBaseline: frame.pitchBaseline,
        rms: frame.rms,
        freqData: frame.freqData,
        detectedKeywords: speechKeyword.detectedWords,
      };

      for (const cb of this.tickListeners) cb(tick);
    });

    this.unsubLocation = locationTracker.onUpdate(() => {
      const anomaly = locationTracker.getAnomaly();
      scoreFusion.setLocationMultiplier(1.0 + anomaly);
    });

    await audioEngine.start();
    this.isArmed = true;
    this.setState("ARMED");
    this.log("🛡️ VoiceShield armed");
  }

  async disarm(): Promise<void> {
    if (!this.isArmed && this.state === "DISARMED") return;
    audioEngine.stop();
    speechKeyword.stop();
    locationTracker.stopWatching();
    locationTracker.stopSOSTracking();
    evidenceRecorder.stop();
    scoreFusion.reset();
    this.unsubAudio?.();
    this.unsubKeyword?.();
    this.unsubLocation?.();
    this.unsubAudio = null;
    this.unsubKeyword = null;
    this.unsubLocation = null;
    this.activeEventId = null;
    this.isArmed = false;
    this.sosAppearedAt = null;
    this.setState("DISARMED");
    this.log("⏻ Disarmed");
  }

  /** Force an SOS trigger from outside (e.g. Safe-Walk timer expiry). */
  triggerManual(reason: string) {
    if (this.state === "SOS_ACTIVE") return;
    this.log(`🚨 Manual SOS trigger: ${reason}`);
    this.handleSOSTrigger({
      score: 1,
      signals: {
        yamnet: 0,
        pitchSpike: 0,
        keywords: 0,
        silentMotion: 1,
      },
      level: "IMMEDIATE",
      timestamp: Date.now(),
    });
  }

  private handleSOSTrigger(data: SOSTriggerData) {
    this.sosAppearedAt = Date.now();
    this.setState("SOS_ACTIVE", data);
    for (const cb of this.sosListeners) {
      cb({
        trigger: data,
        detectedWords: [...speechKeyword.detectedWords],
        contacts: this.contacts.filter((c) => c.armed),
        location: locationTracker.current,
      });
    }
  }

  async fireSOS(args: {
    trigger: SOSTriggerData;
    detectedWords: string[];
    evidenceEnabled?: boolean;
  }): Promise<{ ok: boolean; demo: boolean; dispatch: DispatchResult }> {
    const armed = this.contacts.filter((c) => c.armed);
    const payload: SOSPayload = {
      userId: this.userId,
      contacts: armed,
      location: locationTracker.current,
      audioScore: args.trigger.score,
      signals: args.trigger.signals,
      triggerWords: args.detectedWords,
      timestamp: new Date().toISOString(),
    };

    // Open native SMS + WhatsApp composers prefilled with the GPS link.
    // This must run synchronously inside the user-gesture dispatch chain
    // so the popup is allowed.
    const dispatch = dispatchToContacts(
      armed,
      locationTracker.current,
      args.detectedWords,
    );
    if (dispatch.attempted > 0) {
      this.log(
        `📨 Opened native SMS composer for ${dispatch.attempted} contact${
          dispatch.attempted === 1 ? "" : "s"
        }`,
      );
      if (dispatch.whatsappOpened) this.log("💬 Opened WhatsApp deep link");
    } else {
      this.log("⚠️ No armed contacts to dispatch to");
    }

    // Optional 30s audio evidence recording from the live mic stream.
    if (args.evidenceEnabled) {
      const stream = audioEngine.getStream();
      if (stream && evidenceRecorder.start(stream)) {
        this.log("🎙️ Evidence recording started (30s)");
      } else {
        this.log("⚠️ Evidence recording unavailable in this browser");
      }
    }

    // Optional backend gateway (Twilio etc.). Falls back to demo mode if
    // there's no server reachable.
    this.log("📡 Sending SOS to backend...");
    try {
      const res = await api.triggerSOS(payload);
      this.activeEventId = res.eventId || `local_${Date.now()}`;
      locationTracker.startSOSTracking((loc) => {
        if (this.activeEventId) {
          api
            .updateLocation(this.activeEventId, loc)
            .catch(() => {/* tolerate */});
        }
      });
      this.log("✅ Backend acknowledged — SMS gateway dispatched");
      return { ok: true, demo: false, dispatch };
    } catch (err) {
      console.warn("[VoiceShield SOS] Demo mode payload:", payload, err);
      this.log("📡 No backend — using device deep links (demo mode)");
      return { ok: true, demo: true, dispatch };
    }
  }

  async cancelSOS(): Promise<void> {
    const speed = this.sosAppearedAt
      ? Date.now() - this.sosAppearedAt
      : 0;
    if (this.activeEventId) {
      try {
        await api.cancelSOS(this.activeEventId, speed);
      } catch {
        /* tolerate */
      }
    }
    locationTracker.stopSOSTracking();
    scoreFusion.reset();
    this.activeEventId = null;
    this.sosAppearedAt = null;
    this.setState("SOS_CANCELLED");
    this.log(`✕ SOS cancelled by user (${speed}ms)`);
    // Keep listening
    if (this.isArmed) this.setState("ARMED");
  }
}

const sosDispatcher = new SOSDispatcher();
export default sosDispatcher;
