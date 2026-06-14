import { useEffect, useRef, useState } from "react";
import type { Contact, GeoLocation } from "@/lib/voiceshield/types";
import {
  buildSMSBody,
  buildSmsLink,
  buildWhatsAppLink,
} from "@/lib/voiceshield/dispatch";

interface SOSOverlayProps {
  contacts: Contact[];
  detectedWords: string[];
  location: GeoLocation | null;
  stealthMode: boolean;
  onCancel: () => void;
  onFire: () => Promise<{ ok: boolean; demo: boolean } | null>;
}

const COUNTDOWN_SECONDS = 30;
const RING_CIRC = 2 * Math.PI * 68;

export function SOSOverlay({
  contacts,
  detectedWords,
  location,
  stealthMode,
  onCancel,
  onFire,
}: SOSOverlayProps) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [fired, setFired] = useState(false);
  const [stealthRevealed, setStealthRevealed] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    setSeconds(COUNTDOWN_SECONDS);
    setFired(false);
    setStealthRevealed(false);
    firedRef.current = false;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            void onFire().then((res) => {
              if (res?.ok) setFired(true);
            });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFire]);

  const dashOffset = RING_CIRC * (seconds / COUNTDOWN_SECONDS);
  const messageBody = buildSMSBody({ loc: location, triggerWords: detectedWords });

  // STEALTH MODE: render an opaque blackout that conceals the SOS.
  // Five quick taps anywhere reveal the cancel button so the owner can
  // still abort. Any onlooker just sees a black phone.
  if (stealthMode && !stealthRevealed) {
    let taps = 0;
    let lastTap = 0;
    return (
      <div
        className="stealth-screen"
        role="alertdialog"
        aria-modal
        onClick={() => {
          const now = Date.now();
          if (now - lastTap > 800) taps = 0;
          taps += 1;
          lastTap = now;
          if (taps >= 5) setStealthRevealed(true);
        }}
        data-testid="overlay-stealth"
      >
        <span className="stealth-dot" aria-hidden />
      </div>
    );
  }

  return (
    <div className="sos-screen" role="alertdialog" aria-modal>
      <div className="sos-bg-flash" />
      <div className="sos-inner">
        <span className="sos-icon" aria-hidden>
          🚨
        </span>
        <div className="sos-title">SOS TRIGGERED</div>
        <div className="sos-sub">Distress detected — sending help</div>

        <div className="sos-timer-wrap">
          <svg
            width="150"
            height="150"
            style={{ position: "absolute", inset: 0 }}
            aria-hidden
          >
            <circle
              cx="75"
              cy="75"
              r="68"
              fill="none"
              stroke="rgba(255,23,68,0.15)"
              strokeWidth="6"
            />
            <circle
              cx="75"
              cy="75"
              r="68"
              fill="none"
              stroke="var(--red)"
              strokeWidth="6"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "75px 75px",
                transition: "stroke-dashoffset 1s linear",
              }}
            />
          </svg>
          <div className="sos-countdown">
            <div className="sos-num" data-testid="text-sos-countdown">
              {seconds}
            </div>
            <div className="sos-sec">seconds</div>
          </div>
        </div>

        <p
          style={{
            color: "#888",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {fired
            ? "SOS dispatched — tap a contact to send"
            : "Cancel now to stop SOS"}
        </p>

        {contacts.length > 0 && (
          <div className="sos-contacts-row">
            {contacts.map((c) => {
              const sms = buildSmsLink([c.phone], messageBody);
              const wa = buildWhatsAppLink(c.phone, messageBody);
              return (
                <div className="sos-contact" key={c.id}>
                  <div className="sos-c-avatar">
                    {c.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="sos-c-name">{c.name}</div>
                  <div className="sos-c-status">
                    {fired ? "✓ Ready" : "Pending..."}
                  </div>
                  {fired && (
                    <div className="sos-c-actions">
                      <a
                        className="sos-c-btn sms"
                        href={sms}
                        data-testid={`button-sms-${c.id}`}
                      >
                        SMS
                      </a>
                      <a
                        className="sos-c-btn wa"
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`button-wa-${c.id}`}
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {location && (
          <div className="sos-geo">
            📍 GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (±
            {Math.round(location.acc)}m)
          </div>
        )}

        {detectedWords.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Trigger words:
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {detectedWords.map((w, i) => (
                <span
                  key={`${w}-${i}`}
                  style={{
                    border: "1px solid rgba(255,23,68,0.4)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 12,
                    color: "var(--red)",
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
          data-testid="button-cancel-sos"
        >
          ✕ Cancel SOS
        </button>
        {fired && (
          <div className="sms-sent">
            ✅ Native SMS + WhatsApp opened — tap Send in your composer to
            deliver to your contacts
          </div>
        )}
      </div>
    </div>
  );
}
