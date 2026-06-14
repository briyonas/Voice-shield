import { useLocation } from "wouter";

const KEYWORD_LANGS = [
  {
    label: "हिंदी (Hindi)",
    color: "#e91e8c",
    border: "rgba(233,30,140,0.4)",
    chips: ["बचाओ", "छोड़ो", "मुझे छोड़ दो", "मदद करो", "रुको", "नहीं"],
  },
  {
    label: "English",
    color: "#9c7dff",
    border: "rgba(124,58,237,0.4)",
    chips: ["help", "stop", "let me go", "don't", "help me", "leave me"],
  },
  {
    label: "ગુજરાતી (Gujarati)",
    color: "#0ea5e9",
    border: "rgba(14,165,233,0.4)",
    chips: ["બચાવો", "છોડો", "મદદ કરો", "નહી", "રોકો"],
  },
];

const PIPELINE = [
  {
    n: "01",
    icon: "🎙️",
    title: "Passive Listening",
    desc: "Phone listens in background — screen locked, hands free, zero interaction",
  },
  {
    n: "02",
    icon: "⚡",
    title: "AI Detects Distress",
    desc: "3-signal fusion scores audio in under 600ms per window",
  },
  {
    n: "03",
    icon: "✅",
    title: "Confirms Pattern",
    desc: "Consecutive-window check filters noise before firing to prevent false alarms",
  },
  {
    n: "04",
    icon: "📱",
    title: "Silent SOS Fires",
    desc: "SMS + WhatsApp sent to armed contacts with live GPS link instantly",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const goSetup = () => setLocation("/setup");

  return (
    <div className="page landing">
      <section className="hero">
        <div className="hero-tag">ZERO TOUCH · ON-DEVICE</div>
        <h1 className="hero-title">
          Voice<span className="hero-accent">Shield</span>
        </h1>
        <p className="hero-sub">Zero touch. No button. No free hand needed.</p>
        <p className="hero-desc">
          Real-time AI distress detection — your phone listens passively. When
          it hears danger in your voice, it silently fires SOS with live GPS to
          your trusted contacts.
        </p>
        <div className="hero-ctas">
          <button
            type="button"
            className="btn-primary"
            onClick={goSetup}
            data-testid="button-hero-cta"
          >
            Get Protected →
          </button>
          <a href="#how" className="btn-outline">
            How it works
          </a>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-val">0ms</span>
            <span className="stat-label">Server lag</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">3</span>
            <span className="stat-label">Signal types</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">100%</span>
            <span className="stat-label">On-device ML</span>
          </div>
          <div className="stat-card">
            <span className="stat-val">3+</span>
            <span className="stat-label">Languages</span>
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="sec-tag">HOW IT WORKS</div>
        <h2 className="sec-title">Three-Signal Distress Detection</h2>
        <div className="cards-grid">
          <div className="card">
            <div
              className="card-badge"
              style={{ background: "#e91e8c" }}
            >
              40%
            </div>
            <div className="card-icon">🧠</div>
            <div className="card-title">YAMNet Audio AI</div>
            <div className="card-desc">
              An on-device audio model scores screams, cries, and panic sounds
              from raw RMS + high-frequency energy. No audio ever leaves your
              phone.
            </div>
          </div>
          <div className="card">
            <div
              className="card-badge"
              style={{ background: "#7c3aed" }}
            >
              35%
            </div>
            <div className="card-icon">📊</div>
            <div className="card-title">Pitch + Energy FFT</div>
            <div className="card-desc">
              Real-time frequency analysis detects pitch spikes more than 40%
              above your personal baseline — the acoustic signature of fear.
            </div>
          </div>
          <div className="card">
            <div
              className="card-badge"
              style={{ background: "#0284c7" }}
            >
              25%
            </div>
            <div className="card-icon">🗣️</div>
            <div className="card-title">Keyword Detection</div>
            <div className="card-desc">
              The Web Speech API listens for distress words in English, Hindi
              and Gujarati: bachao, chodo, help, mujhe chod do, madad karo.
            </div>
          </div>
        </div>
        <div className="formula-box">
          <div className="formula">
            Score = YAMNet × 0.40 + Pitch × 0.35 + Keyword × 0.25
            <br />
            <span className="formula-green">
              If score &gt; 0.72 for 3 consecutive windows → SOS fires
            </span>
          </div>
        </div>
      </section>

      <section
        className="section"
        style={{
          background: "rgba(233,30,140,0.03)",
          borderRadius: 24,
        }}
      >
        <div className="sec-tag">DETECTION PIPELINE</div>
        <h2 className="sec-title">Safety in 4 Steps</h2>
        <div className="pipeline">
          {PIPELINE.map((s) => (
            <div className="pipe-step" key={s.n}>
              <div className="pipe-num">{s.n}</div>
              <div className="pipe-icon">{s.icon}</div>
              <div className="pipe-title">{s.title}</div>
              <div className="pipe-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sec-tag">MULTILINGUAL DETECTION</div>
        <h2 className="sec-title">Built for the women who need it most</h2>
        <div className="kw-grid">
          {KEYWORD_LANGS.map((lang) => (
            <div className="kw-card" key={lang.label}>
              <div className="kw-lang" style={{ color: lang.color }}>
                {lang.label}
              </div>
              <div className="kw-chips">
                {lang.chips.map((c) => (
                  <span
                    className="kw-chip"
                    key={c}
                    style={{
                      borderColor: lang.border,
                      color: lang.color,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="section"
        style={{ textAlign: "center", paddingBottom: 120 }}
      >
        <div className="sec-tag" style={{ textAlign: "center" }}>
          GET PROTECTED
        </div>
        <h2
          className="sec-title"
          style={{ fontSize: "clamp(32px,6vw,56px)" }}
        >
          Ready to be protected?
        </h2>
        <p
          style={{
            color: "var(--muted)",
            marginBottom: 36,
            fontSize: 15,
          }}
        >
          Set up takes 60 seconds. No install. Works in any modern browser.
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ fontSize: 18, padding: "20px 60px" }}
          onClick={goSetup}
          data-testid="button-final-cta"
        >
          Arm VoiceShield Now →
        </button>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: 32,
          borderTop: "1px solid var(--border)",
          color: "#333",
          fontSize: 12,
        }}
      >
        VoiceShield · On-device ML · No ads · No data sale · No surveillance
      </footer>
    </div>
  );
}
