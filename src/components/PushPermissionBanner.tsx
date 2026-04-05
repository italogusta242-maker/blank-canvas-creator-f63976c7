import { Bell, X, Download } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PushPermissionBannerProps {
  pushState: "loading" | "granted" | "denied" | "prompt" | "unsupported";
  onRequestPermission: () => void;
  isInstallable?: boolean;
  onInstall?: () => void;
}

const PushPermissionBanner = ({ pushState, onRequestPermission, isInstallable, onInstall }: PushPermissionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  // Show install banner OR push prompt banner, never both at once
  const showInstall = isInstallable && !dismissed;
  const showPush = !isInstallable && pushState === "prompt" && !dismissed;

  if (!showInstall && !showPush) return null;

  const isInstallMode = showInstall;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`mx-4 mt-2 mb-1 p-3 rounded-xl flex items-center gap-3 border ${
          isInstallMode
            ? "bg-slate-900/40 border-slate-500/20 shadow-lg shadow-white/5"
            : "bg-accent/10 border-accent/20"
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isInstallMode ? "bg-white text-black" : "bg-accent/20 text-accent"
        }`}>
          {isInstallMode ? <Download size={16} /> : <Bell size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {isInstallMode ? "Instale o Aplicativo" : "Ative as notificações"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {isInstallMode
              ? "Adicione à tela inicial para uma experiência rápida e com notificações."
              : "Receba alertas de mensagens, treinos e atualizações no celular"}
          </p>
        </div>
        <button
          onClick={isInstallMode && onInstall ? onInstall : onRequestPermission}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
            isInstallMode
              ? "bg-white text-black hover:bg-white/90"
              : "bg-accent text-accent-foreground hover:bg-accent/90"
          }`}
        >
          {isInstallMode ? "Instalar" : "Ativar"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default PushPermissionBanner;
