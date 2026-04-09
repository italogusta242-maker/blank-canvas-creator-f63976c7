import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type PushState = "loading" | "granted" | "denied" | "prompt" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function updateAppBadge(count: number) {
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pushState, setPushState] = useState<PushState>("loading");
  const navigateRef = useRef<ReturnType<typeof useNavigate> | null>(null);
  const subscribedRef = useRef(false);

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigateRef.current = useNavigate();
  } catch {
    // Outside router context
  }

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // ─── Core subscription logic (no toasts, no permission request) ──
  const subscribeCurrentUser = useCallback(async () => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log("[Push] Fetching VAPID key...");
    const vapidRes = await fetch(
      `${supabaseUrl}/functions/v1/push-notifications?action=vapid-key`,
      { headers: { apikey } }
    );
    if (!vapidRes.ok) throw new Error(`VAPID key fetch failed: ${vapidRes.status}`);

    const { publicKey } = await vapidRes.json();
    if (!publicKey) throw new Error("VAPID key not returned");

    console.log("[Push] Waiting for service worker...");
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW timeout")), 8000)
      ),
    ]);

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      console.log("[Push] New subscription created");
    } else {
      console.log("[Push] Reusing existing subscription");
    }

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error("No auth session");

    console.log("[Push] Saving subscription to backend...");
    const res = await fetch(
      `${supabaseUrl}/functions/v1/push-notifications?action=subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Subscribe failed: ${res.status} ${errBody}`);
    }

    console.log("[Push] ✅ Subscription saved successfully");
    subscribedRef.current = true;
  }, [user]);

  // ─── Silent state detection + auto-subscribe if already granted ──
  useEffect(() => {
    if (!user) { setPushState("loading"); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") { setPushState("denied"); return; }
    if (perm === "default") { setPushState("prompt"); return; }

    setPushState("granted");

    // If already granted, silently ensure subscription is saved (no toasts)
    if (!subscribedRef.current) {
      subscribeCurrentUser().catch((err) => {
        console.warn("[Push] Silent auto-subscribe failed:", err.message);
        // No toast — this is background work
      });
    }
  }, [user, subscribeCurrentUser]);

  // ─── Foreground push listener (postMessage from SW) ──────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_FOREGROUND") return;
      const { title, body, url } = event.data.payload || {};

      toast(title || "🔔 Nova notificação", {
        description: body || "",
        duration: 6000,
        action: url
          ? { label: "Ver", onClick: () => navigateRef.current?.(url) }
          : undefined,
      });

      if (user) {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [user, queryClient]);

  // ─── PWA install prompt ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstallable(false);
    setDeferredPrompt(null);
  };

  // ─── Request permission (ONLY from user click) ──────────────────
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    try {
      console.log("[Push] Requesting permission (user-initiated)...");
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPushState("granted");
        await subscribeCurrentUser();
        toast.success("Notificações ativadas! 🔔");
      } else if (result === "denied") {
        setPushState("denied");
        toast.error("Permissão negada. Ative nas configurações do navegador.");
      } else {
        setPushState("prompt");
      }
    } catch (err: any) {
      console.error("[Push] Permission error:", err);
      toast.error("Erro ao ativar notificações: " + (err.message || "erro desconhecido"));
    }
  }, [subscribeCurrentUser]);

  // ─── Notifications from DB ──────────────────────────────────────
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Badge API ──────────────────────────────────────────────────
  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  // ─── Realtime for in-app updates ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`rt_notif_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // ─── Mark as read ───────────────────────────────────────────────
  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return {
    pushState,
    requestPermission,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isInstallable,
    installPWA,
  };
}

// ─── Utility: frontend NEVER calls push directly anymore ──────────
// Chat push is handled by the DB trigger on notifications table.
// This function is kept only for backward compatibility but now
// creates a notification record (which triggers push via DB trigger).
export async function sendPushToConversation(
  conversationId: string,
  title: string,
  body: string
) {
  // No-op: push is now fully event-driven via DB triggers.
  // Chat messages should create notification records server-side.
  console.log("[Push] sendPushToConversation is deprecated — push is event-driven via DB trigger");
}
