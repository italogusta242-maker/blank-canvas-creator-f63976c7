import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PushState = "loading" | "granted" | "denied" | "prompt" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const attemptedRef = useRef(false);
  const [pushState, setPushState] = useState<PushState>("loading");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Detect push state
  useEffect(() => {
    if (!user) {
      setPushState("loading");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Unsupported: SW or PushManager missing");
      setPushState("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") {
      setPushState("denied");
      return;
    }

    if (perm === "default") {
      setPushState("prompt");
      return;
    }

    // Permission is granted - subscribe
    setPushState("granted");

    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const subscribe = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        console.log("[Push] Fetching VAPID key...");
        const vapidRes = await fetch(
          `${supabaseUrl}/functions/v1/push-notifications?action=vapid-key`,
          { headers: { apikey } }
        );
        if (!vapidRes.ok) {
          console.error("[Push] Failed to get VAPID key:", vapidRes.status);
          return;
        }
        const { publicKey } = await vapidRes.json();
        if (!publicKey) return;
        console.log("[Push] VAPID key obtained");

        const registration = await navigator.serviceWorker.ready;
        console.log("[Push] SW ready, scope:", registration.scope);

        // Check/renew subscription
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
            // Keep existing subscription
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

        // Send subscription to server
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

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

        if (res.ok) {
          console.log("[Push] ✅ Subscription saved successfully");
        } else {
          const errBody = await res.text().catch(() => "");
          console.error("[Push] Failed to save subscription:", res.status, errBody);
          toast.error("Erro ao salvar notificação push. Tente novamente.");
        }
      } catch (e) {
        console.error("[Push] Subscription failed:", e);
        toast.error("Erro ao ativar notificações. Verifique as permissões do navegador.");
      }
    };

    const timer = setTimeout(subscribe, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  // PWA install prompt
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

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPushState("granted");
        attemptedRef.current = false; // Allow re-subscribe attempt
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
  }, []);

  // Notifications from DB (in-app)
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

  // Realtime for in-app toast
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
            const newNotification = payload.new as any;
            toast.success(newNotification.title, {
              description: newNotification.body,
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
