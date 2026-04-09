import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type PushState = "loading" | "granted" | "denied" | "prompt" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Wait for SW ready with a timeout */
async function waitForSWReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Service Worker not ready after " + timeoutMs + "ms")), timeoutMs)
    ),
  ]);
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pushState, setPushState] = useState<PushState>("loading");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Unsupported: SW or PushManager missing");
      setPushState("unsupported");
      return;
    }
    const permission = Notification.permission as PermissionState | "default";
    if (permission === "granted") {
      setPushState("granted");
    } else if (permission === "denied") {
      setPushState("denied");
    } else {
      setPushState("prompt");
    }
  }, []);

  useEffect(() => {
    if (pushState === "granted" && user) {
      registerSubscription();
    }
  }, [pushState, user]);

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

  const registerSubscription = useCallback(async () => {
    try {
      if (!user) return;
      console.log("[Push] Starting subscription registration for user", user.id);

      // 1. Wait for SW with timeout
      let registration: ServiceWorkerRegistration;
      try {
        registration = await waitForSWReady(8000);
        console.log("[Push] SW ready, scope:", registration.scope);
      } catch (swErr) {
        console.error("[Push] SW not ready:", swErr);
        toast.error("Erro: Service Worker não carregou. Tente reinstalar o app.");
        return;
      }

      // 2. Fetch VAPID key
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      console.log("[Push] Fetching VAPID key...");
      const vapidRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-notifications?action=vapid-key`,
        {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        }
      );
      if (!vapidRes.ok) {
        const errText = await vapidRes.text().catch(() => "");
        console.error("[Push] VAPID key fetch failed:", vapidRes.status, errText);
        toast.error("Erro ao configurar notificações push.");
        return;
      }
      const { publicKey: vapidPublicKey } = await vapidRes.json();
      console.log("[Push] VAPID key obtained:", vapidPublicKey?.slice(0, 20) + "...");

      // 3. Subscribe to push
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log("[Push] No existing subscription, creating new...");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
        });
        console.log("[Push] New subscription created");
      } else {
        console.log("[Push] Reusing existing subscription");
      }

      // 4. Send subscription to backend
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      console.log("[Push] Sending subscription to backend...");
      const subRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-notifications?action=subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        }
      );

      if (!subRes.ok) {
        const errBody = await subRes.text().catch(() => "");
        console.error("[Push] Subscribe call failed:", subRes.status, errBody);
        toast.error("Erro ao salvar notificação push. Tente novamente.");
        return;
      }

      console.log("[Push] ✅ Subscription registered successfully!");
    } catch (err) {
      console.error("[Push] Registration error:", err);
      toast.error("Erro ao ativar notificações. Verifique as permissões do navegador.");
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setPushState("granted");
        toast.success("Notificações ativadas! 🔔");
        await registerSubscription();
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
  }, [registerSubscription]);

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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    await fetch(
      `https://${projectId}.supabase.co/functions/v1/push-notifications?action=send-to-conversation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ conversation_id: conversationId, title, body }),
      }
    );
  } catch (err) {
    console.error("[Push] Send to conversation error:", err);
  }
}
