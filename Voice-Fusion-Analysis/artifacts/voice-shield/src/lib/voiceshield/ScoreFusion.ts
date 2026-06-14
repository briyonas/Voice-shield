import type {
  ScoreFusionResult,
  Signals,
  SignalName,
  SOSTriggerData,
  ThresholdLevel,
  Weights,
} from "./types";

type SOSCallback = (data: SOSTriggerData) => void;
type WarningCallback = (data: SOSTriggerData) => void;

export class ScoreFusion {
  weights: Weights = {
    yamnet: 0.4,
    pitchSpike: 0.35,
    keywords: 0.25,
    silentMotion: 0,
  };

  signals: Signals = {
    yamnet: 0,
    pitchSpike: 0,
    keywords: 0,
    silentMotion: 0,
  };

  signalHistory: number[] = [];
  HISTORY_SIZE = 10;

  THRESHOLDS: Record<ThresholdLevel, { score: number; windows: number }> = {
    IMMEDIATE: { score: 0.85, windows: 2 },
    HIGH: { score: 0.72, windows: 3 },
    WARNING: { score: 0.55, windows: 1 },
  };

  consecutiveWindows: Record<ThresholdLevel, number> = {
    IMMEDIATE: 0,
    HIGH: 0,
    WARNING: 0,
  };
  locationMultiplier = 1.0;
  onSOSTrigger: SOSCallback | null = null;
  onWarning: WarningCallback | null = null;
  sosTriggered = false;

  setLocationMultiplier(multiplier: number): void {
    this.locationMultiplier = Math.min(Math.max(multiplier, 1.0), 1.35);
  }

  updateSignal(signalName: SignalName, score: number): void {
    if (signalName in this.signals) {
      this.signals[signalName] = Math.min(Math.max(score, 0), 1);
    }
  }

  compute(): ScoreFusionResult {
    let rawScore = 0;
    for (const key of Object.keys(this.weights) as SignalName[]) {
      rawScore += this.signals[key] * this.weights[key];
    }

    const finalScore = Math.min(rawScore * this.locationMultiplier, 1.0);

    this.signalHistory.push(finalScore);
    if (this.signalHistory.length > this.HISTORY_SIZE) {
      this.signalHistory.shift();
    }

    if (finalScore >= this.THRESHOLDS.IMMEDIATE.score) {
      this.consecutiveWindows.IMMEDIATE++;
      if (
        this.consecutiveWindows.IMMEDIATE >=
          this.THRESHOLDS.IMMEDIATE.windows &&
        !this.sosTriggered
      ) {
        this.sosTriggered = true;
        this.onSOSTrigger?.({
          score: finalScore,
          signals: { ...this.signals },
          level: "IMMEDIATE",
          timestamp: Date.now(),
        });
      }
    } else {
      this.consecutiveWindows.IMMEDIATE = 0;
    }

    if (finalScore >= this.THRESHOLDS.HIGH.score) {
      this.consecutiveWindows.HIGH++;
      if (
        this.consecutiveWindows.HIGH >= this.THRESHOLDS.HIGH.windows &&
        !this.sosTriggered
      ) {
        this.sosTriggered = true;
        this.onSOSTrigger?.({
          score: finalScore,
          signals: { ...this.signals },
          level: "HIGH",
          timestamp: Date.now(),
        });
      }
    } else {
      this.consecutiveWindows.HIGH = 0;
    }

    if (finalScore >= this.THRESHOLDS.WARNING.score && !this.sosTriggered) {
      this.consecutiveWindows.WARNING++;
      this.onWarning?.({
        score: finalScore,
        signals: { ...this.signals },
        level: "WARNING",
        timestamp: Date.now(),
      });
    } else {
      this.consecutiveWindows.WARNING = 0;
    }

    return {
      finalScore,
      rawScore,
      signals: { ...this.signals },
      locationMultiplier: this.locationMultiplier,
      consecutiveWindows: { ...this.consecutiveWindows },
    };
  }

  reset(): void {
    this.signals = {
      yamnet: 0,
      pitchSpike: 0,
      keywords: 0,
      silentMotion: 0,
    };
    this.consecutiveWindows = { IMMEDIATE: 0, HIGH: 0, WARNING: 0 };
    this.signalHistory = [];
    this.sosTriggered = false;
  }

  getStatus() {
    const avg =
      this.signalHistory.length > 0
        ? this.signalHistory.reduce((a, b) => a + b, 0) /
          this.signalHistory.length
        : 0;
    return {
      currentSignals: { ...this.signals },
      averageScore: avg,
      sosTriggered: this.sosTriggered,
      locationMultiplier: this.locationMultiplier,
    };
  }
}

const scoreFusion = new ScoreFusion();
export default scoreFusion;
