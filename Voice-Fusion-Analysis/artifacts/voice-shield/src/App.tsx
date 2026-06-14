import { useEffect } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { BgDecor } from "@/components/BgDecor";
import { Nav } from "@/components/Nav";
import { SOSOverlay } from "@/components/SOSOverlay";
import { FakeCallOverlay } from "@/components/FakeCallOverlay";
import { useContacts } from "@/hooks/useContacts";
import { useFeatures } from "@/hooks/useFeatures";
import { useVoiceShield } from "@/hooks/useVoiceShield";
import Landing from "@/pages/Landing";
import Setup from "@/pages/Setup";
import Armed from "@/pages/Armed";

function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <h1
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 48,
          fontWeight: 900,
        }}
      >
        404
      </h1>
      <button
        type="button"
        className="btn-outline"
        onClick={() => setLocation("/")}
      >
        Back to home
      </button>
    </div>
  );
}

function AppShell() {
  const { contacts, add, remove, toggle } = useContacts();
  const {
    state,
    tick,
    logs,
    sosContext,
    location,
    armingError,
    arm,
    disarm,
    fireSOS,
    cancelSOS,
    triggerManualSOS,
    sendImmediateSMS,
  } = useVoiceShield(contacts);
  const features = useFeatures({
    onSafeWalkExpire: () =>
      triggerManualSOS("Safe-walk timer expired"),
  });
  const [path, setPath] = useLocation();

  // If the user lands directly on /armed but isn't armed, send them to setup
  useEffect(() => {
    if (path === "/armed" && state === "DISARMED") {
      setPath("/setup");
    }
  }, [path, state, setPath]);

  return (
    <>
      <BgDecor />
      <Nav
        state={state}
        onDisarm={() => {
          void disarm();
          setPath("/");
        }}
      />

      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/setup">
          <Setup
            contacts={contacts}
            onAdd={add}
            onRemove={remove}
            onToggle={toggle}
            onArm={arm}
            onTestSMS={async () => {
              await sendImmediateSMS();
            }}
            armingError={armingError}
            isArming={state === "ARMING"}
          />
        </Route>
        <Route path="/armed">
          <Armed
            tick={tick}
            logs={logs}
            contacts={contacts}
            onToggle={toggle}
            onAdd={add}
            location={location}
            features={features}
            onPanic={() => triggerManualSOS("Manual panic button")}
            onSendNow={async () => {
              await sendImmediateSMS();
            }}
            onDisarm={() => {
              void disarm();
            }}
          />
        </Route>
        <Route component={NotFound} />
      </Switch>

      {sosContext && (
        <SOSOverlay
          contacts={sosContext.contacts}
          detectedWords={sosContext.detectedWords}
          location={sosContext.location}
          stealthMode={features.flags.stealthMode}
          onCancel={() => {
            void cancelSOS();
          }}
          onFire={() =>
            fireSOS({ evidenceEnabled: features.flags.evidenceRec })
          }
        />
      )}

      {features.fakeCallActive && (
        <FakeCallOverlay onDismiss={features.dismissFakeCall} />
      )}
    </>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppShell />
    </WouterRouter>
  );
}
