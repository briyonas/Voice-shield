export interface Contact {
  id: string;
  name: string;
  phone: string;
  armed: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  acc: number;
  ts: number;
}

export type SignalName = "yamnet" | "pitchSpike" | "keywords" | "silentMotion";

export type Weights = Record<SignalName, number>;
export type Signals = Record<SignalName, number>;

export type ThresholdLevel = "IMMEDIATE" | "HIGH" | "WARNING";

export interface ScoreFusionResult {
  finalScore: number;
  rawScore: number;
  signals: Signals;
  locationMultiplier: number;
  consecutiveWindows: Record<ThresholdLevel, number>;
}

export interface SOSTriggerData {
  score: number;
  signals: Signals;
  level: ThresholdLevel;
  timestamp: number;
}

export type DispatcherState =
  | "DISARMED"
  | "ARMING"
  | "ARMED"
  | "WARNING"
  | "SOS_ACTIVE"
  | "SOS_FAILED"
  | "SOS_CANCELLED";

export interface DispatcherTick {
  finalScore: number;
  signals: Signals;
  consecutiveWindows: Record<ThresholdLevel, number>;
  yamnetClass: string;
  pitchHz: number;
  pitchBaseline: number;
  rms: number;
  freqData: Uint8Array;
  detectedKeywords: string[];
}
