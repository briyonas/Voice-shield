import { useState } from "react";
import { useLocation } from "wouter";
import type { Contact } from "@/lib/voiceshield/types";

interface SetupProps {
  contacts: Contact[];
  onAdd: (name: string, phone: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onArm: () => Promise<void>;
  onTestSMS: () => Promise<void>;
  armingError: string | null;
  isArming: boolean;
}

export default function Setup({
  contacts,
  onAdd,
  onRemove,
  onToggle,
  onArm,
  onTestSMS,
  armingError,
  isArming,
}: SetupProps) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const armedCount = contacts.filter((c) => c.armed).length;

  const handleTest = async () => {
    if (testBusy || armedCount === 0) return;
    setTestBusy(true);
    try {
      await onTestSMS();
    } finally {
      setTestBusy(false);
    }
  };

  const submit = () => {
    if (!name.trim() || !phone.trim()) return;
    onAdd(name, phone);
    setName("");
    setPhone("");
  };

  const handleArm = async () => {
    try {
      await onArm();
      setLocation("/armed");
    } catch {
      // armingError already set in the hook
    }
  };

  return (
    <div className="page setup">
      <div className="setup-card">
        <div className="sec-tag">STEP 1 OF 2</div>
        <h2
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-1px",
            marginBottom: 8,
          }}
        >
          Set Up Your Contacts
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 13,
            marginBottom: 28,
          }}
        >
          These people get SMS + live GPS the moment distress is detected.
        </p>

        <div className="contact-list" data-testid="list-contacts">
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
                data-testid={`button-toggle-${c.id}`}
              >
                {c.armed ? "✓ Armed" : "Disarmed"}
              </button>
              <button
                type="button"
                className="c-remove"
                onClick={() => onRemove(c.id)}
                aria-label={`Remove ${c.name}`}
                data-testid={`button-remove-${c.id}`}
              >
                ✕
              </button>
            </div>
          ))}
          {contacts.length === 0 && (
            <div
              style={{
                color: "#555",
                fontSize: 13,
                textAlign: "center",
                padding: 16,
              }}
            >
              Add at least one contact below.
            </div>
          )}
        </div>

        <div className="add-form" style={{ marginBottom: 28 }}>
          <input
            className="inp"
            placeholder="Contact name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            data-testid="input-name"
          />
          <input
            className="inp"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            data-testid="input-phone"
          />
          <button
            type="button"
            className="add-btn"
            onClick={submit}
            data-testid="button-add-contact"
          >
            +
          </button>
        </div>

        {armingError && (
          <div
            style={{
              background: "rgba(255,23,68,0.08)",
              border: "1px solid rgba(255,23,68,0.3)",
              color: "var(--red)",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              marginBottom: 12,
            }}
            role="alert"
          >
            {armingError}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          style={{ width: "100%" }}
          onClick={handleArm}
          disabled={armedCount === 0 || isArming}
          data-testid="button-arm"
        >
          {isArming
            ? "🛡️ Arming…"
            : `🛡️ Arm VoiceShield (${armedCount} contact${armedCount === 1 ? "" : "s"})`}
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ width: "100%", marginTop: 10 }}
          onClick={handleTest}
          disabled={armedCount === 0 || testBusy}
          data-testid="button-test-sms"
        >
          {testBusy
            ? "📨 Opening composer…"
            : "📨 Send Test SMS to Armed Contacts"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
