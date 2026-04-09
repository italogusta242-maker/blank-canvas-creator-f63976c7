import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, ExternalLink, Share } from "lucide-react";
import { detectPlatform, type Platform } from "@/lib/detectPlatform";

interface PWAInstallBannerProps {
  isInstallable: boolean;
  onInstall: () => void;
}

const PWAInstallBanner = ({ isInstallable, onInstall }: PWAInstallBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    // Don't show if already installed
    if (p === "standalone") return;

    // Check dismiss cooldown (24h)
    const dismissedAt = localStorage.getItem("pwa_install_dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) return;
    }

    const timer = setTimeout(() => {
      // Show for: webviews (always), iOS safari (always), android/desktop (only if installable)
      if (
        p === "ios-webview" ||
        p === "android-webview" ||
        p === "ios-safari" ||
        p === "android-chrome" ||
        isInstallable
      ) {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  const handleAction = () => {
    if (platform === "android-chrome" || platform === "desktop") {
      onInstall();
    }
    setVisible(false);
  };

  const renderContent = () => {
    switch (platform) {
      case "ios-webview":
      case "android-webview":
        return {
          icon: <ExternalLink size={20} className="text-primary" />,
          title: "Abra no navegador",
          description:
            platform === "ios-webview"
              ? "Toque no ícone do Safari (🧭) ou nos 3 pontinhos e escolha \"Abrir no navegador\"."
              : "Toque nos 3 pontinhos (⋮) e escolha \"Abrir no Chrome\".",
          buttonText: null,
          dismissText: "Entendi",
        };
      case "ios-safari":
        return {
          icon: <Share size={20} className="text-primary" />,
          title: "Instale o App",
          description:
            "Toque em Compartilhar (↑) e depois em \"Adicionar à Tela Inicial\".",
          buttonText: null,
          dismissText: "Entendi",
        };
      case "android-chrome":
        return isInstallable
          ? {
              icon: <Smartphone size={20} className="text-primary" />,
              title: "Instale o App",
              description:
                "Acesse mais rápido direto da sua tela inicial, como um app de verdade.",
              buttonText: "Instalar Agora",
              dismissText: "Depois",
            }
          : {
              icon: <Smartphone size={20} className="text-primary" />,
              title: "Instale o App",
              description:
                "Toque nos 3 pontinhos (⋮) no topo da tela e selecione \"Instalar aplicativo\" ou \"Adicionar à tela inicial\".",
              buttonText: null,
              dismissText: "Entendi",
            };
      default:
        return {
          icon: <Smartphone size={20} className="text-primary" />,
          title: "Instale o App",
          description:
            "Acesse mais rápido direto da sua tela inicial, como um app de verdade.",
          buttonText: "Instalar Agora",
          dismissText: "Depois",
        };
    }
  };

  const content = renderContent();

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
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-4 min-h-[120px]">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {content.icon}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-bold text-foreground">{content.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {content.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {content.buttonText && (
                <button
                  onClick={handleAction}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Download size={14} />
                  {content.buttonText}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`${!content.buttonText ? "flex-1" : ""} py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/50 transition-colors`}
              >
                {content.dismissText}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
