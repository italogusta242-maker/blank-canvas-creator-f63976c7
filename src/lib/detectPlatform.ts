export type Platform =
  | "standalone"
  | "ios-safari"
  | "ios-webview"
  | "android-chrome"
  | "android-webview"
  | "desktop";

export function detectPlatform(): Platform {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent || (navigator as any).vendor || (window as any).opera || "";

  // 1. Already installed as PWA
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  ) {
    return "standalone";
  }

  // 2. OS flags
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /android/i.test(ua);

  // 3. Webview detection (Instagram, Facebook, WhatsApp, TikTok, Twitter, LinkedIn, generic Android wv)
  const isWebview =
    /Instagram|FBAV|FBAN|WhatsApp|TikTok|musical_ly|Twitter|LinkedIn/i.test(ua) ||
    (isAndroid && /\bwv\b/.test(ua));

  if (isIOS) return isWebview ? "ios-webview" : "ios-safari";
  if (isAndroid) return isWebview ? "android-webview" : "android-chrome";

  return "desktop";
}
