import { useEffect, useState } from "react";

interface FakeCallOverlayProps {
  callerName?: string;
  callerLine?: string;
  onDismiss: () => void;
}

export function FakeCallOverlay({
  callerName = "Mom",
  callerLine = "mobile · calling...",
  onDismiss,
}: FakeCallOverlayProps) {
  const [accepted, setAccepted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!accepted) return;
    const id = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [accepted]);

  // Try to vibrate (mobile only) to feel like a real call
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
    };
    if (typeof nav.vibrate !== "function") return;
    if (accepted) {
      nav.vibrate(0);
      return;
    }
    const pattern = [400, 600, 400, 600, 400, 600];
    nav.vibrate(pattern);
    const id = window.setInterval(() => nav.vibrate?.(pattern), 3000);
    return () => {
      window.clearInterval(id);
      nav.vibrate?.(0);
    };
  }, [accepted]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fake-call" role="dialog" aria-modal>
      <div className="fc-header">
        {accepted ? "ON CALL · MOBILE" : "INCOMING CALL · MOBILE"}
      </div>
      <div className="fc-avatar-wrap">
        <div className="fc-avatar-ring">
          <div className="fc-avatar">👩</div>
        </div>
      </div>
      <div className="fc-name" data-testid="text-fake-caller">
        {callerName}
      </div>
      <div className="fc-line">
        {accepted ? `On call · ${mm}:${ss}` : callerLine}
      </div>

      <div className="fc-controls">
        <button
          type="button"
          className="fc-btn fc-decline"
          onClick={onDismiss}
          data-testid="button-fake-decline"
          aria-label="Decline"
        >
          <span className="fc-icon">✕</span>
          <span className="fc-label">{accepted ? "End" : "Decline"}</span>
        </button>
        {!accepted && (
          <button
            type="button"
            className="fc-btn fc-accept"
            onClick={() => setAccepted(true)}
            data-testid="button-fake-accept"
            aria-label="Accept"
          >
            <span className="fc-icon">📞</span>
            <span className="fc-label">Accept</span>
          </button>
        )}
      </div>
    </div>
  );
}
