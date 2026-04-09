// Push notification handler for Service Worker — v2 (native-grade)

// ─── PUSH EVENT ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const handlePush = async () => {
    try {
      const data = event.data.json();
      const deepUrl = data.data?.url || null;
      const conversationId = data.data?.conversation_id;
      const tag = data.tag || data.data?.tag || (conversationId ? "chat-" + conversationId : "notif-" + Date.now());

      // Check if app is focused — if so, relay via postMessage instead of OS notification
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const focusedClient = clients.find((c) => c.focused);

      if (focusedClient) {
        // If focused on the exact deep link target, skip entirely
        if (deepUrl && focusedClient.url.includes(deepUrl)) return;
        if (conversationId && focusedClient.url.includes("/chat/" + conversationId)) return;

        // App is visible — send in-app toast instead of OS notification
        focusedClient.postMessage({
          type: "PUSH_FOREGROUND",
          payload: {
            title: data.title || "ANAAC Club",
            body: data.body || "",
            url: deepUrl || (conversationId ? "/chat/" + conversationId : null),
            tag,
          },
        });
        return;
      }

      // App is in background — show native OS notification
      await self.registration.showNotification(data.title || "ANAAC Club", {
        body: data.body || "",
        icon: "/anaac-logo-pwa.svg",
        badge: "/anaac-logo-pwa.svg",
        vibrate: data.vibrate || [200, 100, 200],
        data: { url: deepUrl, conversation_id: conversationId, ...(data.data || {}) },
        tag,
        renotify: true,
      });
    } catch (e) {
      console.error("[SW] Push handler error:", e);
    }
  };

  event.waitUntil(handlePush());
});

// ─── NOTIFICATION CLICK — DEEP LINKING ──────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl =
    notifData.url ||
    (notifData.conversation_id ? "/chat/" + notifData.conversation_id : "/");

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing app window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // No window open — open new one at the deep link
        return self.clients.openWindow(targetUrl);
      })
  );
});
