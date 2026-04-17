import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getQueueSize, processQueue, startQueueSync } from "@/lib/offlineQueue";

/**
 * Faixa discreta no topo que aparece quando o usuário está sem rede.
 * Também inicia o sync automático da fila offline ao montar.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    startQueueSync();

    const update = async () => {
      setIsOnline(navigator.onLine);
      setQueueSize(await getQueueSize());
    };

    void update();
    const onOnline = () => {
      setIsOnline(true);
      void processQueue().then(() => getQueueSize().then(setQueueSize));
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Re-check queue size every 30s
    const interval = setInterval(update, 30_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  const show = !isOnline || queueSize > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[60] bg-amber-500/95 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-md"
        >
          <WifiOff size={14} />
          {!isOnline ? (
            <span>
              Você está offline. Suas ações serão enviadas quando a conexão voltar
              {queueSize > 0 && ` (${queueSize} pendente${queueSize > 1 ? "s" : ""})`}.
            </span>
          ) : (
            <span>Sincronizando {queueSize} ação{queueSize > 1 ? "ões" : ""} pendente{queueSize > 1 ? "s" : ""}…</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
