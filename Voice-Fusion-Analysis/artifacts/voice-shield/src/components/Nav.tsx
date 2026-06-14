import type { DispatcherState } from "@/lib/voiceshield/types";

interface NavProps {
  state: DispatcherState;
  onDisarm: () => void;
}

export function Nav({ state, onDisarm }: NavProps) {
  const isArmed =
    state === "ARMED" ||
    state === "WARNING" ||
    state === "ARMING" ||
    state === "SOS_ACTIVE";
  const isSOS = state === "SOS_ACTIVE";
  const isWarn = state === "WARNING";

  const color = isSOS
    ? "var(--red)"
    : isWarn
      ? "var(--orange)"
      : "var(--green)";
  const label = isSOS
    ? "SOS ACTIVE"
    : isWarn
      ? "ELEVATED"
      : state === "ARMING"
        ? "ARMING…"
        : "ARMED";

  return (
    <nav className="vs-nav">
      <div className="nav-logo">
        <span style={{ fontSize: 22 }}>🛡️</span>
        <span className="logo-text">VoiceShield</span>
        <span className="logo-badge">ZERO TOUCH SOS</span>
      </div>
      <div className="nav-btns">
        {isArmed && (
          <div className="nav-status">
            <span
              className="pulse-dot"
              style={{ background: color }}
            />
            <span
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color,
              }}
            >
              {label}
            </span>
          </div>
        )}
        {isArmed && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onDisarm}
            data-testid="button-nav-disarm"
          >
            Disarm
          </button>
        )}
      </div>
    </nav>
  );
}
