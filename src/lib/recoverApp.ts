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

export const recoverAppToLogin = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.error("[recoverApp] service worker cleanup failed", error);
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("[recoverApp] sign out failed", error);
  }

  clearStorage();
  window.location.replace("/");
};