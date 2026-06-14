# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### voice-shield (`artifacts/voice-shield`)

**VoiceShield** — zero-touch SOS distress detection web app.

- React + Vite + TypeScript + wouter, Tailwind v4 with custom dark pink/purple/cyan theme (Syne + DM Sans fonts).
- Routes: `/` (landing), `/setup` (contacts), `/armed` (live dashboard).
- Core engine in `src/lib/voiceshield/`:
  - `AudioEngine` — captures the mic via `getUserMedia` and runs an `AnalyserNode` FFT loop, emitting RMS, dominant pitch, smoothed pitch-spike score, volume score, and raw frequency data on every animation frame.
  - `SpeechKeyword` — Web Speech API wrapper that listens continuously (`hi-IN`, interim results, auto-restart) for distress keywords in English / Hindi / Gujarati (Latin + native scripts), with score decay.
  - `YamnetInference` — deterministic mock that derives a YAMNet-style distress class from `rms + highFreqEnergy` (no network round-trip; fully on-device).
  - `LocationTracker` — geolocation watcher with home-location anomaly score and a 30s SOS tracking interval.
  - `ScoreFusion` — weighted fuse: `yamnet 0.40 + pitchSpike 0.35 + keywords 0.25` with consecutive-window thresholds (HIGH 0.72×3, IMMEDIATE 0.85×2, WARNING 0.55×1) and location multiplier.
  - `SOSDispatcher` — orchestrates engine + speech + location + fusion and emits `state` / `tick` / `sos` / `log` events.
  - `api` — POSTs SOS payloads to `${VITE_API_URL}/sos/trigger` and falls back to demo mode (console log) if the backend is unreachable.
- React glue: `useVoiceShield` (subscribes to dispatcher events) and `useContacts` (localStorage-backed contact list).
- Components: `Nav`, `BgDecor` (animated gradient orbs + grid), `SOSOverlay` (30s countdown + cancel + auto-fire).

#### VoiceShield features layer (added)
- **`dispatch.ts`** — builds prefilled `sms:` (multi-recipient) and `wa.me` deep links and opens the device's native SMS + WhatsApp composers when SOS fires. The prefilled message contains the live Google Maps GPS link, accuracy, and detected trigger words. This is the no-backend SMS path; if a backend is reachable it ALSO POSTs the payload for an SMS gateway like Twilio.
- **`EvidenceRecorder.ts`** — `MediaRecorder` wrapper that records 30s of audio from the same mic stream the AudioEngine uses, exposes a downloadable Blob via the `useFeatures` hook (audio/webm).
- **`useFeatures` hook** — toggleable feature flags persisted to localStorage (Stealth Mode, Evidence Rec, Guardian Net, Fake Call), Safe-Walk timer (10min countdown that auto-fires SOS via `triggerManualSOS`), and live evidence playback URL.
- **`FeaturesPanel`** — fourth tab on the armed dashboard. Renders the four Active Features cards, the Safe-Walk Timer with countdown ring, the Live Evidence Recording card with playback + download, the Guardian Network 500m broadcaster, and an Emergency Contacts grid mirroring the mockup.
- **`FakeCallOverlay`** — full-screen "incoming call" UI (Mom calling) that vibrates the device, supports Accept (starts call timer) / Decline.
- **Stealth mode in `SOSOverlay`** — when stealth is enabled, the SOS overlay renders an opaque blackout with a tiny red dot; tapping anywhere 5x within 4s reveals the cancel UI. Per-contact rows now include tap-to-send SMS + WhatsApp action buttons after the countdown fires.
- **`SOSDispatcher.triggerManual(reason)`** — public method for outside callers (Safe-Walk timer, manual panic) to escalate straight to `SOS_ACTIVE`.
