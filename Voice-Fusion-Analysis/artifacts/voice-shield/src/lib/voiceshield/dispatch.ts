/**
 * Direct SMS + WhatsApp deep-link dispatch from the browser.
 *
 * Browsers cannot send SMS/WhatsApp silently without a backend gateway
 * (Twilio etc.) — but we can build prefilled `sms:` and `wa.me` URIs that
 * open the device's native composer with the distress message + GPS link
 * already typed. On mobile this is one tap to deliver.
 */
import type { Contact, GeoLocation } from "./types";

export function buildMapsUrl(loc: GeoLocation | null): string | null {
  if (!loc) return null;
  return `https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`;
}

export function buildSMSBody(opts: {
  loc: GeoLocation | null;
  triggerWords: string[];
}): string {
  const map = buildMapsUrl(opts.loc);
  const lines = [
    "🚨 EMERGENCY — VoiceShield SOS",
    "I need help. My phone detected distress in my voice.",
  ];
  if (opts.triggerWords.length > 0) {
    lines.push(`Heard: ${opts.triggerWords.slice(0, 5).join(", ")}`);
  }
  if (map) {
    lines.push(`Live location: ${map}`);
    if (opts.loc) lines.push(`±${Math.round(opts.loc.acc)}m accuracy`);
  } else {
    lines.push("Location unavailable — please call me NOW.");
  }
  lines.push("(Sent automatically by VoiceShield)");
  return lines.join("\n");
}

/** Strip everything except digits and a leading +. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/[^\d+]/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

/** WhatsApp deep link uses the international number without `+`. */
export function buildWhatsAppLink(phone: string, body: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

/** SMS deep link supports comma-separated recipients on iOS/Android. */
export function buildSmsLink(phones: string[], body: string): string {
  const recipients = phones
    .map(normalizePhone)
    .filter(Boolean)
    .join(",");
  // iOS uses `&body=`, Android tolerates `?body=` with a separator.
  return `sms:${recipients}?body=${encodeURIComponent(body)}`;
}

export interface DispatchResult {
  attempted: number;
  whatsappOpened: boolean;
  smsLink: string | null;
  body: string;
}

/**
 * Best-effort dispatch to all armed contacts:
 *  - opens a single `sms:` link prefilled for ALL recipients (one tap)
 *  - opens WhatsApp for the first armed contact (multi-tab is popup-blocked)
 * Returns the link strings so the SOS overlay can also render per-contact
 * buttons that the user can tap individually.
 */
export function dispatchToContacts(
  contacts: Contact[],
  loc: GeoLocation | null,
  triggerWords: string[],
): DispatchResult {
  const armed = contacts.filter((c) => c.armed && c.phone.trim());
  const body = buildSMSBody({ loc, triggerWords });
  const smsLink =
    armed.length > 0 ? buildSmsLink(armed.map((c) => c.phone), body) : null;
  let whatsappOpened = false;

  if (armed.length > 0 && smsLink) {
    try {
      window.open(smsLink, "_blank");
    } catch {
      /* popup blocked — overlay still shows tap buttons */
    }
    try {
      const first = armed[0];
      if (first) {
        window.open(buildWhatsAppLink(first.phone, body), "_blank");
        whatsappOpened = true;
      }
    } catch {
      /* ignore */
    }
  }

  return {
    attempted: armed.length,
    whatsappOpened,
    smsLink,
    body,
  };
}
