import { Bell, X, Download, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "push_banner_dismissed";

interface PushPermissionBannerProps {
  pushState: "loading" | "granted" | "denied" | "prompt" | "unsupported";
  onRequestPermission: () => void;
  isInstallable?: boolean;
  onInstall?: () => void;
}

const PushPermissionBanner = ({ pushState, onRequestPermission, isInstallable, onInstall }: PushPermissionBannerProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "true"; } catch { return false; }
  });

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );

  useEffect(() => {
    if (pushState === "granted") {
      try { localStorage.setItem(DISMISS_KEY, "true"); } catch {}
      setDismissed(true);
    }
  }, [pushState]);

  const handleDismiss = () => setDismissed(true);

  // Determine which mode to show
  const showInstall = isInstallable && !isIOS && !dismissed;
  const showPush = (!isInstallable || isIOS) && pushState === "prompt" && !dismissed;
  const showIOSGuide = isIOS && !isStandalone && pushState === "unsupported" && !dismissed;

  if (!showInstall && !showPush && !showIOSGuide) return null;

  let icon = <Bell size={16} />;
  let iconBg = "bg-accent/20 text-accent";
  let bannerBg = "bg-accent/10 border-accent/20";
  let title = "🔔 Não perca nenhum aviso!";
  let subtitle = "Ative as notificações do Clube para receber avisos importantes e aulas ao vivo.";
  let btnLabel = "Ativar";
  let btnClass = "bg-accent text-accent-foreground hover:bg-accent/90";
  let handleClick = onRequestPermission;

  if (showInstall) {
    icon = <Download size={16} />;
    iconBg = "bg-white text-black";
    bannerBg = "bg-slate-900/40 border-slate-500/20 shadow-lg shadow-white/5";
    title = "Instale o Aplicativo";
    subtitle = "Adicione à tela inicial para uma experiência rápida e com notificações.";
    btnLabel = "Instalar";
    btnClass = "bg-white text-black hover:bg-white/90";
    handleClick = () => onInstall?.();
  } else if (showIOSGuide) {
    icon = <Smartphone size={16} />;
    iconBg = "bg-accent/20 text-accent";
    bannerBg = "bg-accent/10 border-accent/20";
    title = "📲 Instale o app para notificações";
    subtitle = "No iPhone, instale o app na tela inicial para receber avisos e notificações.";
    btnLabel = "Como instalar";
    btnClass = "bg-accent text-accent-foreground hover:bg-accent/90";
    handleClick = () => navigate("/instalar");
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`mx-4 mt-2 mb-1 p-3 rounded-xl flex items-center gap-3 border ${bannerBg}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={handleClick}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${btnClass}`}
        >
          {btnLabel}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default PushPermissionBanner;
