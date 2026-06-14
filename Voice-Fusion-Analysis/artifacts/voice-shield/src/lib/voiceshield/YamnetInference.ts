/**
 * YamnetInference — wrapper around Google's YAMNet audio classifier.
 *
 * In this build YAMNet runs in deterministic "MOCK" mode: it derives a
 * distress score from the audio frame's RMS + high-frequency energy,
 * which is what the live FFT engine already gives us. This keeps the
 * app fully on-device, dependency-free, and always responsive.
 *
 * To enable real YAMNet inference, dynamically import @tensorflow/tfjs
 * and load the TFHub graph model — the public API below is identical.
 */

export interface YamnetResult {
  score: number;
  detectedClass: string;
  mock: boolean;
}

export class YamnetInference {
  isLoaded = false;
  isLoading = false;
  mode: "MOCK" | "LIVE" = "MOCK";

  async loadModel(): Promise<void> {
    // Mock-mode is always "loaded" — no model fetch.
    this.isLoaded = true;
  }

  /** Score is computed from rms + high-frequency energy (0..1). */
  analyze(rms: number, highFreqEnergy: number): YamnetResult {
    // Loud + sharp → likely scream / shout / glass break
    const loudness = Math.min(1, rms * 5);
    const sharpness = Math.min(1, highFreqEnergy * 1.4);
    const score = Math.min(1, loudness * 0.65 + sharpness * 0.45);

    let detectedClass = "Quiet";
    if (score > 0.8) detectedClass = "Scream";
    else if (score > 0.6) detectedClass = "Shout";
    else if (score > 0.4) detectedClass = "Loud speech";
    else if (score > 0.2) detectedClass = "Speech";

    return { score, detectedClass, mock: true };
  }

  getStatus() {
    return { loaded: this.isLoaded, loading: this.isLoading, mode: this.mode };
  }
}

const yamnet = new YamnetInference();
export default yamnet;
