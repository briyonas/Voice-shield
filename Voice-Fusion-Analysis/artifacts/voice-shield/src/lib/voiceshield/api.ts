/**
 * Thin API wrapper for the optional VoiceShield backend.
 * If no backend is reachable the dispatcher silently runs in demo mode.
 */
import type { Contact, GeoLocation, Signals } from "./types";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "/api";

export interface SOSPayload {
  userId: string;
  contacts: Contact[];
  location: GeoLocation | null;
  audioScore: number;
  signals: Signals;
  triggerWords: string[];
  timestamp: string;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  triggerSOS: (payload: SOSPayload) =>
    request<{ eventId?: string; ok: boolean }>("/sos/trigger", {
      method: "POST",
      body: payload,
    }),
  cancelSOS: (eventId: string | null, cancelSpeed: number) =>
    request<{ ok: boolean }>("/sos/cancel", {
      method: "POST",
      body: { eventId, cancelSpeed },
    }),
  updateLocation: (eventId: string, loc: GeoLocation) =>
    request<{ ok: boolean }>("/sos/location", {
      method: "POST",
      body: { eventId, ...loc },
    }),
};
