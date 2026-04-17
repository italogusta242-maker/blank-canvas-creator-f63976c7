import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEYS_TO_REMOVE = [
  "USE_MOCK",
  "lovable-theme",
  "supabase.auth.token",
];

const clearStorage = () => {
  try {
    for (const key of STORAGE_KEYS_TO_REMOVE) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }

    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-") || key.startsWith("supabase."))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("sb-") || key.startsWith("supabase."))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    console.error("[recoverApp] storage cleanup failed", error);
  }
};

/** Race signOut against a short timeout so a stuck lock can never block recovery. */
const signOutWithTimeout = async (ms = 1500) => {
  try {
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => setTimeout(resolve, ms)),
    ]);
  } catch (error: any) {
    // AbortError "Lock was stolen" is benign — storage cleanup below covers it.
    if (error?.name !== "AbortError") {
      console.error("[recoverApp] sign out failed", error);
    }
  }
};

export const recoverAppToLogin = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.error("[recoverApp] service worker cleanup failed", error);
  }

  // Run signOut and storage cleanup in parallel so a stuck lock cannot block recovery.
  await Promise.all([signOutWithTimeout(1500), Promise.resolve().then(clearStorage)]);
  // Final cleanup pass after signOut (in case SDK rewrote keys)
  clearStorage();
  window.location.replace("/");
};
