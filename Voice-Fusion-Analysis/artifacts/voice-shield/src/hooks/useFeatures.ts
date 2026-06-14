import { useCallback, useEffect, useRef, useState } from "react";
import evidenceRecorder from "@/lib/voiceshield/EvidenceRecorder";

export interface FeatureFlags {
  stealthMode: boolean;
  evidenceRec: boolean;
  guardianNet: boolean;
  fakeCallEnabled: boolean;
}

const STORAGE_KEY = "voiceshield_features_v1";
const DEFAULT_FLAGS: FeatureFlags = {
  stealthMode: false,
  evidenceRec: true,
  guardianNet: false,
  fakeCallEnabled: true,
};

function readStored(): FeatureFlags {
  if (typeof window === "undefined") return DEFAULT_FLAGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLAGS;
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return DEFAULT_FLAGS;
  }
}

const SAFE_WALK_DEFAULT_SECONDS = 600;

export function useFeatures(opts: {
  onSafeWalkExpire: () => void;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(readStored);
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [safeWalk, setSafeWalk] = useState({
    active: false,
    secondsLeft: SAFE_WALK_DEFAULT_SECONDS,
    totalSeconds: SAFE_WALK_DEFAULT_SECONDS,
  });
  const [evidence, setEvidence] = useState<{
    state: "idle" | "recording" | "ready";
    durationMs: number;
    blobUrl: string | null;
  }>({ state: "idle", durationMs: 0, blobUrl: null });
  const onExpireRef = useRef(opts.onSafeWalkExpire);
  onExpireRef.current = opts.onSafeWalkExpire;
  const blobUrlRef = useRef<string | null>(null);

  // Persist flags
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {
      /* ignore */
    }
  }, [flags]);

  // Subscribe to evidence recorder
  useEffect(() => {
    const off = evidenceRecorder.onUpdate((e) => {
      let url: string | null = null;
      if (e.blob) {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        url = URL.createObjectURL(e.blob);
        blobUrlRef.current = url;
      }
      setEvidence({
        state: e.state,
        durationMs: e.durationMs,
        blobUrl: url ?? blobUrlRef.current,
      });
    });
    return () => {
      off();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Safe-walk countdown
  useEffect(() => {
    if (!safeWalk.active) return;
    const id = window.setInterval(() => {
      setSafeWalk((s) => {
        if (!s.active) return s;
        if (s.secondsLeft <= 1) {
          window.clearInterval(id);
          onExpireRef.current();
          return { ...s, active: false, secondsLeft: 0 };
        }
        return { ...s, secondsLeft: s.secondsLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [safeWalk.active]);

  const toggle = useCallback(
    (key: keyof FeatureFlags) =>
      setFlags((f) => ({ ...f, [key]: !f[key] })),
    [],
  );

  const startSafeWalk = useCallback((minutes = 10) => {
    setSafeWalk({
      active: true,
      secondsLeft: minutes * 60,
      totalSeconds: minutes * 60,
    });
  }, []);

  const stopSafeWalk = useCallback(() => {
    setSafeWalk((s) => ({ ...s, active: false }));
  }, []);

  const triggerFakeCall = useCallback(() => setFakeCallActive(true), []);
  const dismissFakeCall = useCallback(() => setFakeCallActive(false), []);

  return {
    flags,
    toggle,
    fakeCallActive,
    triggerFakeCall,
    dismissFakeCall,
    safeWalk,
    startSafeWalk,
    stopSafeWalk,
    evidence,
  };
}
