import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { FeaturesPanel } from "@/components/FeaturesPanel";
import type { useFeatures } from "@/hooks/useFeatures";
import type {
  Contact,
  DispatcherTick,
  GeoLocation,
} from "@/lib/voiceshield/types";

type Tab = "detection" | "features" | "contacts" | "location";

interface ArmedProps {
  tick: DispatcherTick;
  logs: string[];
  contacts: Contact[];
  onToggle: (id: string) => void;
  onAdd: (name: string, phone: string) => void;
  location: GeoLocation | null;
  features: ReturnType<typeof useFeatures>;
  onPanic: () => void;
  onSendNow: () => Promise<void>;
  onDisarm: () => void;
}

const BAR_COUNT = 64;
const PROGRESS_R = 110;
const PROGRESS_CIRC = 2 * Math.PI * PROGRESS_R;

function colorFor(score: number): string {
  if (score > 0.72) return "#ff1744";
  if (score > 0.45) return "#ff9100";
  if (score > 0.2) return "#ffea00";
  return "#00e676";
}
function stateLabel(score: number): string {
  if (score > 0.72) return "🚨 CRITICAL";
  if (score > 0.45) return "⚠️ ELEVATED";
  if (score > 0.2) return "📊 ACTIVE";
  return "🛡️ SAFE";
}

function Waveform({
  freqData,
  score,
}: {
  freqData: Uint8Array;
  score: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = el.children;
    if (bars.length === 0) return;
    const step = Math.max(1, Math.floor(freqData.length / BAR_COUNT));
    const col = colorFor(score);
    for (let i = 0; i < bars.length; i++) {
      const v = (freqData[i * step] ?? 0) / 255;
      const h = Math.max(3, v * 72);
      const bar = bars[i] as HTMLDivElement;
      bar.style.height = `${h}px`;
      bar.style.background = `linear-gradient(to top, ${col}cc, ${col}44)`;
      bar.style.opacity = String(0.5 + v * 0.5);
    }
  }, [freqData, score]);

  return (
    <div className="waveform" ref={ref} aria-hidden>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          className="wave-bar"
          style={{
            background: "rgba(233,30,140,0.5)",
          }}
        />
      ))}
    </div>
  );
}

function StatusOrb({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const col = colorFor(score);
  const offset = PROGRESS_CIRC * (1 - score);

  return (
    <div className="orb-wrap">
      <div
        className="status-orb"
        style={{
          boxShadow: `0 0 ${40 + score * 80}px ${col}55, 0 0 ${
            80 + score * 150
          }px ${col}22`,
          borderColor: `${col}66`,
        }}
      >
        <div className="orb-score" style={{ color: col }}>
          {pct}%
        </div>
        <div className="orb-label">distress score</div>
        <div className="orb-state" style={{ color: col }}>
          {stateLabel(score)}
        </div>
      </div>
      <svg
        className="progress-ring"
        width="230"
        height="230"
        aria-hidden
      >
        <circle
          cx="115"
          cy="115"
          r={PROGRESS_R}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="3"
        />
        <circle
          cx="115"
          cy="115"
          r={PROGRESS_R}
          fill="none"
          stroke={col}
          strokeWidth="3"
          strokeDasharray={PROGRESS_CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "115px 115px",
            transition: "all .35s ease",
          }}
        />
      </svg>
    </div>
  );
}

function SignalRow({
  icon,
  name,
  weight,
  score,
  color,
  testId,
}: {
  icon: string;
  name: string;
  weight: string;
  score: number;
  color: string;
  testId: string;
}) {
  const pct = Math.round(score * 100);
  return (
    <div className="sig-row">
      <div className="sig-left">
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div className="sig-name">{name}</div>
          <div className="sig-wt">weight: {weight}</div>
        </div>
      </div>
      <div className="sig-right">
        <div className="mini-bar">
          <div
            className="mini-fill"
            style={{
              width: `${pct}%`,
              background: color,
              boxShadow: `0 0 8px ${color}88`,
            }}
          />
        </div>
        <div
          className="sig-pct"
          style={{ color }}
          data-testid={testId}
        >
          {pct}%
        </div>
      </div>
    </div>
  );
}

export default function Armed({
  tick,
  logs,
  contacts,
  onToggle,
  onAdd,
  location,
  features,
  onPanic,
  onSendNow,
  onDisarm,
}: ArmedProps) {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("detection");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const armedCount = contacts.filter((c) => c.armed).length;

  const handleSend = async () => {
    if (smsBusy) return;
    setSmsBusy(true);
    try {
      await onSendNow();
    } finally {
      setSmsBusy(false);
    }
  };

  const score = tick.finalScore;
  const winCount = tick.consecutiveWindows.HIGH;
  const winColor = colorFor(score);

  const mapsUrl = location
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : null;

  const detectedKeywords = useMemo(
    () => tick.detectedKeywords.slice(-8),
    [tick.detectedKeywords],
  );

  const handleDisarm = () => {
    onDisarm();
    setLocation("/");
  };

  return (
    <div className="page armed">
      <div className="panic-bar">
        <button
          type="button"
          className="panic-btn"
          onClick={onPanic}
          disabled={armedCount === 0}
          data-testid="button-panic-sos"
          aria-label="Trigger SOS now"
        >
          <span className="panic-icon" aria-hidden>🚨</span>
          <span className="panic-label">
            <strong>SOS NOW</strong>
            <small>30s countdown to send</small>
          </span>
        </button>
        <button
          type="button"
          className="sms-now-btn"
          onClick={handleSend}
          disabled={armedCount === 0 || smsBusy}
          data-testid="button-send-sms-now"
          aria-label="Send SMS now"
        >
          <span className="panic-icon" aria-hidden>📨</span>
          <span className="panic-label">
            <strong>{smsBusy ? "Opening…" : "Send SMS Now"}</strong>
            <small>{armedCount} armed</small>
          </span>
        </button>
      </div>

      <StatusOrb score={score} />
      <Waveform freqData={tick.freqData} score={score} />

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={`tab-btn${tab === "detection" ? " active" : ""}`}
          onClick={() => setTab("detection")}
          role="tab"
          aria-selected={tab === "detection"}
          data-testid="tab-detection"
        >
          📊 Detect
        </button>
        <button
          type="button"
          className={`tab-btn${tab === "features" ? " active" : ""}`}
          onClick={() => setTab("features")}
          role="tab"
          aria-selected={tab === "features"}
          data-testid="tab-features"
        >
          ✨ Features
        </button>
        <button
          type="button"
          className={`tab-btn${tab === "contacts" ? " active" : ""}`}
          onClick={() => setTab("contacts")}
          role="tab"
          aria-selected={tab === "contacts"}
          data-testid="tab-contacts"
        >
          👥 Contacts
        </button>
        <button
          type="button"
          className={`tab-btn${tab === "location" ? " active" : ""}`}
          onClick={() => setTab("location")}
          role="tab"
          aria-selected={tab === "location"}
          data-testid="tab-location"
        >
          📍 Location
        </button>
      </div>

      {tab === "features" && (
        <div className="tab-content">
          <FeaturesPanel
            flags={features.flags}
            toggle={features.toggle}
            contacts={contacts}
            safeWalk={features.safeWalk}
            startSafeWalk={() => features.startSafeWalk(10)}
            stopSafeWalk={features.stopSafeWalk}
            triggerFakeCall={features.triggerFakeCall}
            evidence={features.evidence}
          />
        </div>
      )}

      {tab === "detection" && (
        <div className="tab-content">
          <div className="sig-grid">
            <SignalRow
              icon="🧠"
              name="YAMNet Audio AI"
              weight="40%"
              score={tick.signals.yamnet}
              color="#e91e8c"
              testId="signal-yamnet"
            />
            <SignalRow
              icon="📊"
              name="Pitch + Energy FFT"
              weight="35%"
              score={tick.signals.pitchSpike}
              color="#9c7dff"
              testId="signal-pitch"
            />
            <SignalRow
              icon="🗣️"
              name="Keyword Detection"
              weight="25%"
              score={tick.signals.keywords}
              color="#0ea5e9"
              testId="signal-keyword"
            />
          </div>

          <div className="win-row">
            <span className="win-label">Consecutive windows:</span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="win-dot"
                style={{
                  background: i < winCount ? winColor : "#222",
                  boxShadow:
                    i < winCount ? `0 0 8px ${winColor}` : "none",
                }}
              />
            ))}
            <span
              style={{
                fontSize: 11,
                color: "#555",
                marginLeft: 4,
              }}
              data-testid="text-window-count"
            >
              {Math.min(3, winCount)}/3
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#666",
            }}
          >
            <div>
              <div style={{ color: "#555" }}>Pitch</div>
              <div style={{ color: "#9c7dff", fontSize: 13 }}>
                {Math.round(tick.pitchHz)} Hz
              </div>
              <div style={{ color: "#444" }}>
                baseline {Math.round(tick.pitchBaseline)} Hz
              </div>
            </div>
            <div>
              <div style={{ color: "#555" }}>YAMNet class</div>
              <div style={{ color: "#e91e8c", fontSize: 13 }}>
                {tick.yamnetClass}
              </div>
              <div style={{ color: "#444" }}>
                rms {tick.rms.toFixed(3)}
              </div>
            </div>
          </div>

          {detectedKeywords.length > 0 && (
            <div className="kw-detected">
              <div className="kw-det-label">Detected Keywords</div>
              <div className="kw-det-chips">
                {detectedKeywords.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className="kw-det-chip"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="log-box" data-testid="log-activity">
            <div className="log-hdr">// ACTIVITY LOG</div>
            {logs.length === 0 ? (
              <div className="log-line" style={{ color: "#444" }}>
                Waiting for activity...
              </div>
            ) : (
              logs.map((line, i) => (
                <div className="log-line" key={i}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div className="tab-content">
          <div className="contact-list" style={{ marginBottom: 16 }}>
            {contacts.map((c) => (
              <div className="contact-row" key={c.id}>
                <div className="c-avatar">
                  {c.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="c-info">
                  <div className="c-name">{c.name}</div>
                  <div className="c-phone">{c.phone}</div>
                </div>
                <button
                  type="button"
                  className="c-toggle"
                  onClick={() => onToggle(c.id)}
                  style={{
                    background: c.armed
                      ? "rgba(0,230,118,0.12)"
                      : "rgba(255,255,255,0.05)",
                    borderColor: c.armed ? "var(--green)" : "#444",
                    color: c.armed ? "var(--green)" : "#666",
                  }}
                >
                  {c.armed ? "✓ Armed" : "Off"}
                </button>
              </div>
            ))}
          </div>
          <div className="add-form">
            <input
              className="inp"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="inp"
              placeholder="+91 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              type="button"
              className="add-btn"
              onClick={() => {
                if (name.trim() && phone.trim()) {
                  onAdd(name, phone);
                  setName("");
                  setPhone("");
                }
              }}
            >
              +
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#555",
              marginTop: 12,
            }}
          >
            {contacts.filter((c) => c.armed).length} contacts armed
          </div>
        </div>
      )}

      {tab === "location" && (
        <div className="tab-content">
          <div className="geo-card">
            <div className="geo-hdr">
              <span
                className="pulse-dot"
                style={{
                  background: location ? "var(--green)" : "#555",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: location ? "var(--green)" : "#555",
                }}
              >
                {location
                  ? "Live tracking active"
                  : "Acquiring GPS signal..."}
              </span>
            </div>
            {location ? (
              <>
                <div className="geo-row">
                  <span className="geo-label">Latitude</span>
                  <span className="geo-val">
                    {location.lat.toFixed(6)}°
                  </span>
                </div>
                <div className="geo-row">
                  <span className="geo-label">Longitude</span>
                  <span className="geo-val">
                    {location.lng.toFixed(6)}°
                  </span>
                </div>
                <div className="geo-row">
                  <span className="geo-label">Accuracy</span>
                  <span className="geo-val">
                    ±{Math.round(location.acc)}m
                  </span>
                </div>
                <div className="geo-row">
                  <span className="geo-label">Updated</span>
                  <span className="geo-val">
                    {new Date(location.ts).toLocaleTimeString()}
                  </span>
                </div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="maps-btn"
                  >
                    📍 Open in Google Maps →
                  </a>
                )}
                {mapsUrl && (
                  <div className="share-box">
                    <div className="share-label">
                      SOS contacts will receive this link:
                    </div>
                    <div className="share-url">{mapsUrl}</div>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  color: "#444",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 20,
                }}
              >
                Waiting for GPS lock — make sure location access is allowed.
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="disarm-btn"
        onClick={handleDisarm}
        data-testid="button-disarm"
      >
        Disarm & Exit
      </button>
    </div>
  );
}
