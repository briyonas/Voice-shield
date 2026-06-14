import { useEffect, useRef, useState } from "react";
import sosDispatcher from "@/lib/voiceshield/SOSDispatcher";
import type {
  Contact,
  DispatcherState,
  DispatcherTick,
  GeoLocation,
  SOSTriggerData,
} from "@/lib/voiceshield/types";
import locationTracker from "@/lib/voiceshield/LocationTracker";
import {
  dispatchToContacts,
  type DispatchResult,
} from "@/lib/voiceshield/dispatch";

export interface SOSContext {
  trigger: SOSTriggerData;
  detectedWords: string[];
  contacts: Contact[];
  location: GeoLocation | null;
}

const EMPTY_TICK: DispatcherTick = {
  finalScore: 0,
  signals: { yamnet: 0, pitchSpike: 0, keywords: 0, silentMotion: 0 },
  consecutiveWindows: { IMMEDIATE: 0, HIGH: 0, WARNING: 0 },
  yamnetClass: "—",
  pitchHz: 0,
  pitchBaseline: 200,
  rms: 0,
  freqData: new Uint8Array(64),
  detectedKeywords: [],
};

export function useVoiceShield(contacts: Contact[]) {
  const [state, setState] = useState<DispatcherState>(sosDispatcher.state);
  const [tick, setTick] = useState<DispatcherTick>(EMPTY_TICK);
  const [logs, setLogs] = useState<string[]>([]);
  const [sosContext, setSosContext] = useState<SOSContext | null>(null);
  const [location, setLocation] = useState<GeoLocation | null>(
    locationTracker.current,
  );
  const [armingError, setArmingError] = useState<string | null>(null);

  // Keep dispatcher's contact list in sync
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  useEffect(() => {
    sosDispatcher.setContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    const offState = sosDispatcher.onState((s) => setState(s));
    const offTick = sosDispatcher.onTick((t) => setTick(t));
    const offSOS = sosDispatcher.onSOS((ctx) => setSosContext(ctx));
    const offLog = sosDispatcher.onLog((msg) => {
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      setLogs((l) => [line, ...l].slice(0, 40));
    });
    const offGeo = locationTracker.onUpdate((loc) => setLocation(loc));
    return () => {
      offState();
      offTick();
      offSOS();
      offLog();
      offGeo();
    };
  }, []);

  const arm = async () => {
    setArmingError(null);
    try {
      sosDispatcher.setContacts(contactsRef.current);
      await sosDispatcher.arm();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Microphone access denied. Please allow mic access and try again.";
      setArmingError(msg);
      throw err;
    }
  };

  const disarm = async () => {
    await sosDispatcher.disarm();
    setSosContext(null);
    setTick(EMPTY_TICK);
  };

  const fireSOS = async (opts: { evidenceEnabled?: boolean } = {}) => {
    if (!sosContext) return null;
    return sosDispatcher.fireSOS({
      trigger: sosContext.trigger,
      detectedWords: sosContext.detectedWords,
      evidenceEnabled: opts.evidenceEnabled,
    });
  };

  /** Manually escalate an SOS — used by Safe-Walk timer expiry, panic
   *  button, etc. Opens the 30s SOS overlay just like a real detection. */
  const triggerManualSOS = (reason: string) => {
    sosDispatcher.triggerManual(reason);
  };

  /** Open the device's SMS + WhatsApp composers RIGHT NOW (no countdown).
   *  Best effort: if no GPS lock yet, asks for one then dispatches. */
  const sendImmediateSMS = async (): Promise<DispatchResult | null> => {
    const armed = contactsRef.current.filter((c) => c.armed && c.phone.trim());
    if (armed.length === 0) return null;

    let loc = location ?? locationTracker.current;
    if (!loc) {
      try {
        loc = await locationTracker.getCurrentPosition();
      } catch {
        loc = null;
      }
    }
    return dispatchToContacts(armed, loc, []);
  };

  const cancelSOS = async () => {
    await sosDispatcher.cancelSOS();
    setSosContext(null);
  };

  return {
    state,
    tick,
    logs,
    sosContext,
    location,
    armingError,
    arm,
    disarm,
    fireSOS,
    cancelSOS,
    triggerManualSOS,
    sendImmediateSMS,
    clearSOS: () => setSosContext(null),
  };
}
