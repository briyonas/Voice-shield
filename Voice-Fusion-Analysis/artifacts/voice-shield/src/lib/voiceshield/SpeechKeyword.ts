/**
 * SpeechKeyword — Web Speech API wrapper for multilingual distress
 * keyword recognition. Listens continuously and emits a normalized
 * score in [0, 1] plus the matched keywords.
 */

export const KEYWORDS = {
  en: [
    "help",
    "help me",
    "stop",
    "let me go",
    "no",
    "please stop",
    "leave me alone",
    "someone help",
    "don't",
    "don't touch me",
  ],
  hi: [
    "bachao",
    "chodo",
    "mujhe chod do",
    "madad karo",
    "ruko",
    "nahi",
    "chhod",
    "darr",
    "बचाओ",
    "मदद करो",
    "छोड़ो",
    "मुझे छोड़ दो",
    "रुको",
    "नहीं",
  ],
  gu: [
    "bachavo",
    "chhodo",
    "madad karo",
    "nahi",
    "roko",
    "jaava do",
    "બચાવો",
    "છોડો",
    "મદદ કરો",
    "નહી",
    "રોકો",
  ],
};

const ALL_KW = [...KEYWORDS.en, ...KEYWORDS.hi, ...KEYWORDS.gu];

interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SRConstructor = new () => SpeechRecognitionLike;

interface KeywordEvent {
  score: number;
  detected: string[];
  newlyDetected: string[];
  transcript: string;
}

type Listener = (e: KeywordEvent) => void;

export class SpeechKeyword {
  private recog: SpeechRecognitionLike | null = null;
  private listeners: Listener[] = [];
  detectedWords: string[] = [];
  isRunning = false;
  isSupported: boolean;
  smoothedScore = 0;

  constructor() {
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    this.isSupported = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  onKeyword(cb: Listener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((c) => c !== cb);
    };
  }

  start(): boolean {
    if (this.isRunning || !this.isSupported) return false;
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition)!;
    const recog = new Ctor();
    recog.continuous = true;
    recog.interimResults = true;
    // hi-IN tends to recognize Hindi/English mix; the API isn't truly multi-lang
    recog.lang = "hi-IN";

    recog.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => (r as SpeechRecognitionResultLike)[0].transcript)
        .join(" ")
        .toLowerCase();
      const found = ALL_KW.filter((kw) =>
        transcript.includes(kw.toLowerCase()),
      );
      const newly: string[] = [];
      if (found.length > 0) {
        for (const w of found) {
          if (!this.detectedWords.includes(w)) {
            this.detectedWords.push(w);
            newly.push(w);
          }
        }
        const raw = Math.min(1, found.length * 0.4);
        this.smoothedScore = Math.max(this.smoothedScore, raw);
      } else {
        this.smoothedScore *= 0.75;
      }
      for (const cb of this.listeners) {
        cb({
          score: this.smoothedScore,
          detected: [...this.detectedWords],
          newlyDetected: newly,
          transcript,
        });
      }
    };

    recog.onerror = () => {
      // Soft-fail: try to keep going on next 'end' event
    };

    recog.onend = () => {
      if (this.isRunning) {
        try {
          recog.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      recog.start();
    } catch {
      return false;
    }
    this.recog = recog;
    this.isRunning = true;
    return true;
  }

  /** Decay the keyword score over time when no new keywords are heard. */
  decay(factor = 0.92): number {
    this.smoothedScore *= factor;
    if (this.smoothedScore < 0.01) this.smoothedScore = 0;
    return this.smoothedScore;
  }

  stop(): void {
    this.isRunning = false;
    if (this.recog) {
      try {
        this.recog.stop();
      } catch {
        /* ignore */
      }
      this.recog = null;
    }
    this.smoothedScore = 0;
    this.detectedWords = [];
  }
}

const speechKeyword = new SpeechKeyword();
export default speechKeyword;
