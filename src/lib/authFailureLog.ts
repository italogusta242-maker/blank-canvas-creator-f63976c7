import { supabase } from "@/integrations/supabase/client";

const NETWORK_PATTERNS = [
  /load failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /tempo limite excedido/i,
  /timeout/i,
  /aborterror/i,
];

const TIMEOUT_PATTERNS = [/tempo limite/i, /timeout/i];
const CREDENTIAL_PATTERNS = [/invalid login credentials/i, /invalid_grant/i, /email not confirmed/i];

function classifyError(msg: string): "network" | "timeout" | "credential" | "other" {
  if (TIMEOUT_PATTERNS.some((re) => re.test(msg))) return "timeout";
  if (NETWORK_PATTERNS.some((re) => re.test(msg))) return "network";
  if (CREDENTIAL_PATTERNS.some((re) => re.test(msg))) return "credential";
  return "other";
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  return "desktop";
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Fire-and-forget: registra uma tentativa de login falha via sendBeacon
 * (ou fetch keepalive) para uma edge function pública, evitando depender
 * do mesmo cliente Supabase que está falhando. Nunca lança erro.
 */
export function logAuthFailure(email: string | undefined, errorMessage: string): void {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
    const payload = {
      email: (email || "").trim().toLowerCase() || null,
      error_message: errorMessage?.slice(0, 500) || null,
      error_type: classifyError(errorMessage || ""),
      user_agent: ua,
      platform: detectPlatform(),
    };

    const url = `${SUPABASE_URL}/functions/v1/log-auth-failure`;
    const body = JSON.stringify(payload);

    // Prefer sendBeacon (survives page unload); fall back to fetch keepalive
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon(url, blob);
        if (ok) return;
      } catch {
        // fall through to fetch
      }
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch((e) => console.warn("logAuthFailure fetch failed:", e?.message));
  } catch (e) {
    console.warn("logAuthFailure exception:", e);
  }
}
