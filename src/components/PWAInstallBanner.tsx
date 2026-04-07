import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

interface PWAInstallBannerProps {
  isInstallable: boolean;
  onInstall: () => void;
}

/**
 * Bottom-right toast popup that appears for users who haven't installed the app.
 * Only shows if:
 * - The browser supports install (beforeinstallprompt) OR it's iOS Safari (manual instructions)
 * - The app is NOT already running in standalone mode (already installed)
 * - The user hasn't dismissed it recently (24h cooldown)
 */
const PWAInstallBanner = ({ isInstallable, onInstall }: PWAInstallBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already in standalone mode (app is installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    // Check dismiss cooldown (24h)
    const dismissedAt = localStorage.getItem("pwa_install_dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) return; // Less than 24h ago
    }

    // Detect iOS Safari (no beforeinstallprompt)
    const ua = navigator.userAgent;
    const isiOS = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    setIsIOS(isiOS && isSafari);

    // Show after a short delay for better UX
    const timer = setTimeout(() => {
      if (isInstallable || (isiOS && isSafari)) {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  const handleInstall = () => {
    if (isIOS) {
      // Can't programmatically install on iOS - show instructions
      setVisible(false);
      return;
    }
    onInstall();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed bottom-24 right-4 z-50 w-[300px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-4">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-bold text-foreground">
                  Instale o App
                </h4>
                {isIOS ? (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Toque em <span className="font-semibold">Compartilhar</span> (ícone ↑) e depois em{" "}
                    <span className="font-semibold">"Adicionar à Tela Inicial"</span>.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Acesse mais rápido direto da sua tela inicial, como um app de verdade.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Download size={14} />
                  Instalar Agora
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`${isIOS ? "flex-1" : ""} py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/50 transition-colors`}
              >
                {isIOS ? "Entendi" : "Depois"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
