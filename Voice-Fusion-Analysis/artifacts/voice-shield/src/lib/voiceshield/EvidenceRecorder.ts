/**
 * 30-second audio evidence recorder.
 * Captures from the same MediaStream the AudioEngine is using and emits
 * a downloadable Blob when finished.
 */

type RecorderListener = (e: {
  state: "idle" | "recording" | "ready";
  durationMs: number;
  blob: Blob | null;
}) => void;

export class EvidenceRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private listeners: RecorderListener[] = [];
  private timeoutId: number | null = null;
  state: "idle" | "recording" | "ready" = "idle";
  lastBlob: Blob | null = null;
  lastDurationMs = 0;

  isSupported(): boolean {
    return typeof MediaRecorder !== "undefined";
  }

  onUpdate(cb: RecorderListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private emit() {
    for (const cb of this.listeners) {
      cb({
        state: this.state,
        durationMs: this.lastDurationMs,
        blob: this.lastBlob,
      });
    }
  }

  start(stream: MediaStream, durationMs = 30_000): boolean {
    if (!this.isSupported()) return false;
    this.stop(); // stop any prior session
    try {
      const mime = pickMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      this.chunks = [];
      this.recorder = recorder;
      this.startedAt = Date.now();
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
      };
      recorder.onstop = () => {
        this.lastDurationMs = Date.now() - this.startedAt;
        this.lastBlob = new Blob(this.chunks, {
          type: mime || "audio/webm",
        });
        this.state = "ready";
        this.emit();
      };
      recorder.start();
      this.state = "recording";
      this.emit();
      this.timeoutId = window.setTimeout(() => this.stop(), durationMs);
      return true;
    } catch (err) {
      console.warn("[EvidenceRecorder] start failed", err);
      this.recorder = null;
      this.state = "idle";
      this.emit();
      return false;
    }
  }

  stop() {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.recorder = null;
  }

  reset() {
    this.stop();
    this.lastBlob = null;
    this.lastDurationMs = 0;
    this.state = "idle";
    this.emit();
  }
}

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return null;
}

const evidenceRecorder = new EvidenceRecorder();
export default evidenceRecorder;
