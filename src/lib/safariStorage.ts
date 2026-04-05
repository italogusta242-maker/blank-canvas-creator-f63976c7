/**
 * Safari-safe storage adapter.
 * Writes to both localStorage AND cookies so that data survives
 * Safari's Intelligent Tracking Prevention (ITP) localStorage purges.
 * Reads localStorage first; falls back to cookies.
 */
export const safariStorage = {
  getItem(k: string): string | null {
    try {
      const v = localStorage.getItem(k);
      if (v != null) return v;
    } catch {
      // localStorage unavailable (Private Mode, etc.)
    }
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${encodeURIComponent(k)}=([^;]*)`)
    );
    return m ? decodeURIComponent(m[1]) : null;
  },

  setItem(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      // localStorage unavailable
    }
    // Only mirror small values to cookies (< 3 KB) to avoid header bloat
    if (v.length < 3072) {
      document.cookie = `${encodeURIComponent(k)}=${encodeURIComponent(v)}; path=/; max-age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
  },

  removeItem(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      // localStorage unavailable
    }
    document.cookie = `${encodeURIComponent(k)}=; path=/; max-age=0; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  },
};

/** Safe wrapper: reads localStorage without throwing */
export function safeGetItem(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

/** Safe wrapper: writes localStorage without throwing */
export function safeSetItem(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // Private mode or quota exceeded
  }
}

/** Safe wrapper: removes from localStorage without throwing */
export function safeRemoveItem(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    // Private mode
  }
}
