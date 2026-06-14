import type { Contact } from "@/lib/voiceshield/types";
import type { FeatureFlags } from "@/hooks/useFeatures";

interface FeaturesPanelProps {
  flags: FeatureFlags;
  toggle: (key: keyof FeatureFlags) => void;
  contacts: Contact[];
  safeWalk: {
    active: boolean;
    secondsLeft: number;
    totalSeconds: number;
  };
  startSafeWalk: () => void;
  stopSafeWalk: () => void;
  triggerFakeCall: () => void;
  evidence: {
    state: "idle" | "recording" | "ready";
    durationMs: number;
    blobUrl: string | null;
  };
}

const FEATURE_DEFS: Array<{
  key: keyof FeatureFlags;
  icon: string;
  title: string;
  desc: string;
  iconBg: string;
  isAction?: boolean;
}> = [
  {
    key: "stealthMode",
    icon: "🌑",
    iconBg: "linear-gradient(135deg,#9c27b0,#5b1e87)",
    title: "Stealth Mode",
    desc: "Blackout UI on distress",
  },
  {
    key: "evidenceRec",
    icon: "🎙",
    iconBg: "linear-gradient(135deg,#7c7c8a,#3a3a48)",
    title: "Evidence Rec",
    desc: "30s audio on trigger",
  },
  {
    key: "guardianNet",
    icon: "🛡️",
    iconBg: "linear-gradient(135deg,#0ea5e9,#0369a1)",
    title: "Guardian Net",
    desc: "Alert 500m users",
  },
  {
    key: "fakeCallEnabled",
    icon: "📞",
    iconBg: "linear-gradient(135deg,#e91e8c,#7c1d54)",
    title: "Fake Call",
    desc: "Social exit trigger",
    isAction: true,
  },
];

const PROGRESS_R = 36;
const PROGRESS_C = 2 * Math.PI * PROGRESS_R;

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FeaturesPanel({
  flags,
  toggle,
  contacts,
  safeWalk,
  startSafeWalk,
  stopSafeWalk,
  triggerFakeCall,
  evidence,
}: FeaturesPanelProps) {
  const ringPct = safeWalk.active
    ? safeWalk.secondsLeft / safeWalk.totalSeconds
    : 1;
  const ringOffset = PROGRESS_C * (1 - ringPct);

  return (
    <div className="features-panel">
      {/* Active Features */}
      <div className="fp-card">
        <div className="fp-card-hdr">— ACTIVE FEATURES</div>
        <div className="fp-feature-grid">
          {FEATURE_DEFS.map((f) => {
            const on = flags[f.key];
            return (
              <div
                key={f.key}
                className={`fp-feature${on ? " on" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (f.key === "fakeCallEnabled") triggerFakeCall();
                  else toggle(f.key);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (f.key === "fakeCallEnabled") triggerFakeCall();
                    else toggle(f.key);
                  }
                }}
                data-testid={`feature-${f.key}`}
              >
                <span
                  className={`fp-feature-pill${on ? " on" : ""}`}
                >
                  {f.isAction ? "TAP" : on ? "ON" : "OFF"}
                </span>
                <div
                  className="fp-feature-icon"
                  style={{ background: f.iconBg }}
                  aria-hidden
                >
                  {f.icon}
                </div>
                <div className="fp-feature-title">{f.title}</div>
                <div className="fp-feature-desc">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe-Walk Timer */}
      <div className="fp-card">
        <div className="fp-card-hdr">— SAFE-WALK TIMER</div>
        <div className="fp-sw-row">
          <div className="fp-sw-ring-wrap">
            <svg width="88" height="88" aria-hidden>
              <circle
                cx="44"
                cy="44"
                r={PROGRESS_R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
              />
              <circle
                cx="44"
                cy="44"
                r={PROGRESS_R}
                fill="none"
                stroke="var(--pink)"
                strokeWidth="4"
                strokeDasharray={PROGRESS_C}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "44px 44px",
                  transition: "stroke-dashoffset 1s linear",
                }}
              />
            </svg>
          </div>
          <div className="fp-sw-info">
            <div
              className="fp-sw-time"
              data-testid="text-safewalk-time"
            >
              {fmt(safeWalk.active ? safeWalk.secondsLeft : 600)}
            </div>
            <div className="fp-sw-label">WATCH ME WALK</div>
            <div className="fp-sw-ctas">
              <button
                type="button"
                className="fp-sw-start"
                onClick={() => startSafeWalk()}
                disabled={safeWalk.active}
                data-testid="button-safewalk-start"
              >
                Start Walk
              </button>
              <button
                type="button"
                className="fp-sw-safe"
                onClick={stopSafeWalk}
                disabled={!safeWalk.active}
                data-testid="button-safewalk-safe"
              >
                I'm Safe ✓
              </button>
            </div>
          </div>
        </div>
        <div className="fp-sw-help">
          Auto-fires SOS to your contacts if you don't tap "I'm Safe"
          before the timer ends.
        </div>
      </div>

      {/* Live Evidence Recording */}
      <div className="fp-card">
        <div className="fp-card-hdr">— LIVE EVIDENCE RECORDING</div>
        <div className="fp-ev-row">
          <div>
            <div className="fp-ev-title">30s Audio Evidence</div>
            <div className="fp-ev-desc">
              Auto-records on SOS · secure local link in alert
            </div>
          </div>
          <div
            className={`fp-ev-status fp-ev-${evidence.state}`}
            data-testid="text-evidence-status"
          >
            {evidence.state === "recording"
              ? "● REC"
              : evidence.state === "ready"
                ? "✓ READY"
                : flags.evidenceRec
                  ? "READY"
                  : "OFF"}
          </div>
        </div>
        {evidence.blobUrl && evidence.state === "ready" && (
          <div className="fp-ev-playback">
            <audio
              controls
              src={evidence.blobUrl}
              style={{ width: "100%" }}
            />
            <a
              className="fp-ev-download"
              href={evidence.blobUrl}
              download={`voiceshield-evidence-${Date.now()}.webm`}
            >
              ⬇ Download evidence
            </a>
          </div>
        )}
      </div>

      {/* Guardian Network */}
      <div className="fp-card">
        <div className="fp-card-hdr">— GUARDIAN NETWORK · 500M RADIUS</div>
        <div className="fp-gn-row">
          <div className="fp-gn-icon" aria-hidden>
            🛡️
          </div>
          <div className="fp-gn-info">
            <div className="fp-gn-title">
              {flags.guardianNet
                ? "Broadcasting to nearby users"
                : "Network broadcast paused"}
            </div>
            <div className="fp-gn-desc">
              When triggered, ping VoiceShield users within 500m so help
              can arrive faster than emergency services.
            </div>
          </div>
          <button
            type="button"
            className={`fp-gn-toggle${flags.guardianNet ? " on" : ""}`}
            onClick={() => toggle("guardianNet")}
            data-testid="button-toggle-guardian"
          >
            {flags.guardianNet ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Emergency Contacts (mirrors the panel from the mockup) */}
      <div className="fp-card">
        <div className="fp-card-hdr">— EMERGENCY CONTACTS</div>
        <div className="fp-ec-grid">
          {contacts.length === 0 && (
            <div className="fp-ec-empty">
              No contacts yet — add some on the Contacts tab.
            </div>
          )}
          {contacts.map((c) => (
            <div
              key={c.id}
              className={`fp-ec-card${c.armed ? " on" : ""}`}
              data-testid={`ec-card-${c.id}`}
            >
              <div className="fp-ec-avatar">
                {c.name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="fp-ec-info">
                <div className="fp-ec-name">{c.name}</div>
                <div className="fp-ec-phone">{c.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
