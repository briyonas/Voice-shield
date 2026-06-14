/**
 * AudioEngine
 * Captures microphone, runs continuous FFT via AnalyserNode and emits
 * RMS volume + dominant pitch + raw frequency data to listeners.
 *
 * Replaces the AudioWorklet-based AudioCapture from the original zip with
 * a portable AnalyserNode pipeline that works in every modern browser.
 */
export interface AudioFrame {
  rms: number;
  pitchHz: number;
  pitchBaseline: number;
  freqData: Uint8Array;
  highFreqEnergy: number;
  /** Smoothed pitch-spike score in [0, 1]. */
  pitchSpikeScore: number;
  /** Volume / energy heuristic in [0, 1] (used as YAMNet fallback). */
  volumeScore: number;
}

type Listener = (frame: AudioFrame) => void;

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private rafId: number | null = null;
  private listeners: Listener[] = [];

  private baselineSamples: number[] = [];
  private pitchBaseline = 200;
  private smoothedPitch = 0;
  private smoothedVolume = 0;

  isRunning = false;

  /** Returns the live mic MediaStream so other modules (e.g. evidence
   *  recorder) can subscribe to the same capture without prompting again. */
  getStream(): MediaStream | null {
    return this.micStream;
  }

  onFrame(cb: Listener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((c) => c !== cb);
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const Ctor: typeof AudioContext =
      window.AudioContext ||
      ((window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext as typeof AudioContext);
    this.audioCtx = new Ctor();
    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;
    source.connect(this.analyser);

    this.baselineSamples = [];
    this.pitchBaseline = 200;
    this.smoothedPitch = 0;
    this.smoothedVolume = 0;
    this.isRunning = true;
    this.tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isRunning = false;
  }

  private tick = () => {
    if (!this.analyser || !this.audioCtx) return;

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    const timeData = new Float32Array(this.analyser.fftSize);
    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getFloatTimeDomainData(timeData);

    // RMS volume
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) sumSq += timeData[i]! ** 2;
    const rms = Math.sqrt(sumSq / timeData.length);

    // Dominant frequency bin
    let maxAmp = 0;
    let maxIdx = 0;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i]! > maxAmp) {
        maxAmp = freqData[i]!;
        maxIdx = i;
      }
    }
    const sampleRate = this.audioCtx.sampleRate;
    const pitchHz =
      (maxIdx / this.analyser.frequencyBinCount) * (sampleRate / 2);

    // Baseline pitch calibration over the first ~40 frames (~0.7s @ 60fps)
    if (this.baselineSamples.length < 40) {
      this.baselineSamples.push(pitchHz);
      if (this.baselineSamples.length === 40) {
        const avg =
          this.baselineSamples.reduce((a, b) => a + b, 0) /
          this.baselineSamples.length;
        this.pitchBaseline = avg > 50 ? avg : 200;
      }
    }

    // High-frequency energy (rough proxy for sharp / panicked sounds)
    const sliceStart = Math.floor(freqData.length * 0.4);
    let highSum = 0;
    for (let i = sliceStart; i < freqData.length; i++) highSum += freqData[i]!;
    const highFreqEnergy =
      highSum / Math.max(1, (freqData.length - sliceStart) * 255);

    // Volume score (used as YAMNet fallback signal)
    const rawVol = Math.min(1, rms * 5 + highFreqEnergy * 0.5);
    this.smoothedVolume = this.smoothedVolume * 0.6 + rawVol * 0.4;

    // Pitch-spike score relative to baseline
    const pitchRatio = pitchHz / (this.pitchBaseline || 200);
    const rawPitch = Math.min(1, Math.max(0, (pitchRatio - 1) / 1.0));
    this.smoothedPitch = this.smoothedPitch * 0.7 + rawPitch * 0.3;

    const frame: AudioFrame = {
      rms,
      pitchHz,
      pitchBaseline: this.pitchBaseline,
      freqData,
      highFreqEnergy,
      pitchSpikeScore: this.smoothedPitch,
      volumeScore: this.smoothedVolume,
    };

    for (const cb of this.listeners) {
      try {
        cb(frame);
      } catch (e) {
        console.error("[AudioEngine] listener error:", e);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

const audioEngine = new AudioEngine();
export default audioEngine;
