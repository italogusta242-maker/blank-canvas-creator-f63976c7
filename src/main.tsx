import "./index.css";
import { recoverAppToLogin } from "@/lib/recoverApp";

// === Global Error Trap — mostra o erro na tela em vez de tela branca ===
const showError = (msg: string) => {
  const err = document.getElementById("__crash__");
  if (err) {
    const text = err.querySelector("pre");
    if (text) text.textContent = "🚨 ERRO DE INICIALIZAÇÃO\n\n" + msg;
    return;
  }
  const div = document.createElement("div");
  div.id = "__crash__";
  div.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a2e;color:#ff6b6b;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:monospace;font-size:14px;z-index:99999;white-space:pre-wrap;overflow:auto;";
  const pre = document.createElement("pre");
  pre.style.cssText = "max-width:920px;white-space:pre-wrap;text-align:left;margin:0 0 16px;";
  pre.textContent = "🚨 ERRO DE INICIALIZAÇÃO\n\n" + msg;

  const button = document.createElement("button");
  button.textContent = "Voltar para login";
  button.style.cssText = "border:none;border-radius:12px;padding:12px 18px;background:#ff6b6b;color:#fff;font-weight:700;cursor:pointer;";
  button.onclick = () => {
    void recoverAppToLogin();
  };

  div.append(pre, button);
  document.body.appendChild(div);
  window.setTimeout(() => {
    void recoverAppToLogin();
  }, 2500);
};

window.onerror = (_msg, _src, _line, _col, err) => {
  showError(String(err?.stack || err || _msg));
  return false;
};

window.addEventListener("unhandledrejection", (e) => {
  const reason: any = e.reason;
  const name = reason?.name ?? "";
  const message = String(reason?.message ?? reason ?? "");

  // Benign Supabase/gotrue lock contention across tabs — never crash the app.
  if (
    name === "AbortError" ||
    /Lock was stolen/i.test(message) ||
    /NavigatorLockAcquireTimeoutError/i.test(message)
  ) {
    console.warn("[unhandledrejection] ignored benign lock error:", message);
    e.preventDefault?.();
    return;
  }

  showError("UnhandledRejection:\n" + String(reason?.stack || reason));
});

// Register push-handler service worker for Web Push notifications
// Only in production (not inside Lovable preview iframes)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  navigator.serviceWorker.register("/push-handler.js").then((reg) => {
    console.log("[SW] push-handler registered, scope:", reg.scope);
  }).catch((err) => {
    console.warn("[SW] push-handler registration failed:", err);
  });
} else if ("serviceWorker" in navigator) {
  // In preview/iframe: unregister any leftover SWs
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) reg.unregister();
  });
}

const bootstrapApp = async () => {
  try {
    // Restaura sessão do cookie ANTES de qualquer import que toque no Supabase
    // (sobrevive ao Safari ITP que limpa localStorage após ~7 dias)
    const { restoreSessionFromCookie } = await import("@/lib/sessionPersistence");
    restoreSessionFromCookie();

    const [{ createRoot }, { default: App }, { startSessionPersistence }] = await Promise.all([
      import("react-dom/client"),
      import("./App.tsx"),
      import("@/lib/sessionPersistence"),
    ]);

    // Ativa sync contínuo localStorage ↔ cookie
    startSessionPersistence();

    const rootEl = document.getElementById("root");
    if (!rootEl) throw new Error("Elemento #root não encontrado no DOM");

    createRoot(rootEl).render(<App />);
  } catch (e: any) {
    showError("Erro ao montar o app:\n" + String(e?.stack || e));
  }
};

void bootstrapApp();

