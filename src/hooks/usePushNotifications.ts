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

// ─── Badge API helpers ──────────────────────────────────────────
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

  // Safe navigate — we store it via ref so the SW listener can use it
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigateRef.current = useNavigate();
  } catch {
    // Outside router context — ignore
  }

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // ─── Subscribe current user to push ───────────────────────────
  const subscribeCurrentUser = useCallback(async () => {
    if (!user) throw new Error("Usuária não autenticada");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notifications não suportadas neste dispositivo");
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log("[Push] Fetching VAPID key...");
    const vapidRes = await fetch(
      `${supabaseUrl}/functions/v1/push-notifications?action=vapid-key`,
      { headers: { apikey } }
    );

    if (!vapidRes.ok) {
      const errorBody = await vapidRes.text().catch(() => "");
      throw new Error(`Falha ao buscar VAPID key (${vapidRes.status}) ${errorBody}`.trim());
    }

    const { publicKey } = await vapidRes.json();
    if (!publicKey) throw new Error("VAPID key não retornada pelo backend");

    console.log("[Push] Waiting for service worker...");
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Service Worker não ficou pronto a tempo")), 8000)
      ),
    ]);
    console.log("[Push] SW ready, scope:", registration.scope);

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      try {
        const testRes = await fetch(subscription.endpoint, { method: "HEAD" }).catch(() => null);
        if (testRes && (testRes.status === 410 || testRes.status === 404)) {
          console.log("[Push] Subscription expired, resubscribing...");
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch {
        console.log("[Push] Existing subscription kept after validation failure");
      }
    }

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
    if (!token) throw new Error("Sessão inválida para salvar a inscrição push");

    console.log("[Push] Sending subscription to backend...");
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
      throw new Error(`Falha ao salvar subscription (${res.status}) ${errBody}`.trim());
    }

    console.log("[Push] ✅ Subscription saved successfully");
  }, [user]);

  // ─── Detect push state silently ───────────────────────────────
  useEffect(() => {
    if (!user) {
      setPushState("loading");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") { setPushState("denied"); return; }
    if (perm === "default") { setPushState("prompt"); return; }
    setPushState("granted");
  }, [user]);

  // ─── Foreground push listener (postMessage from SW) ───────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_FOREGROUND") return;

      const { title, body, url } = event.data.payload || {};

      toast(title || "🔔 Nova notificação", {
        description: body || "",
        duration: 6000,
        action: url
          ? {
              label: "Ver",
              onClick: () => navigateRef.current?.(url),
            }
          : undefined,
      });

      // Invalidate notifications query so the bell updates
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [user, queryClient]);

  // ─── PWA install prompt ───────────────────────────────────────
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

  // ─── Request permission (user-initiated only) ────────────────
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    try {
      console.log("[Push] Requesting notification permission from user interaction...");
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPushState("granted");
        await subscribeCurrentUser();
        toast.success("Notificações ativadas! 🔔");
      } else if (result === "denied") {
        setPushState("denied");
        toast.error("Permissão de notificações negada. Ative nas configurações do navegador.");
      } else {
        setPushState("prompt");
      }
    } catch (err) {
      console.error("[Push] Permission request error:", err);
      toast.error("Erro ao solicitar permissão de notificações.");
    }
  }, [subscribeCurrentUser]);

  // ─── Notifications from DB (in-app) ──────────────────────────
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Badge API — sync badge with unread count ─────────────────
  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  // ─── Realtime for in-app toast ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`rt_notif_${user.id}_${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as any;
            toast.success(n.title, {
              description: n.body,
              icon: "🔔",
            });
            queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          }
        )
        .subscribe();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // ─── Mark as read (+ clear badge) ────────────────────────────
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

export async function sendPushToConversation(
  conversationId: string,
  title: string,
  body: string
) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    fetch(
      `${supabaseUrl}/functions/v1/push-notifications?action=send-to-conversation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversation_id: conversationId, title, body }),
      }
    ).catch(() => {});
  } catch {}
}
