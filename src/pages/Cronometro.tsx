import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import InsanoLogo from "@/components/InsanoLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Target: April 3, 2026 (Friday) at 20:00 Brasília time
const TARGET_DATE = new Date("2026-04-03T20:00:00-03:00");

const Cronometro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isExpired = timeLeft.total <= 0;

  // Auto-redirect when countdown expires
  useEffect(() => {
    if (isExpired) {
      navigate("/", { replace: true });
    }
  }, [isExpired, navigate]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Blurred fake background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 opacity-20 blur-md">
          <div className="grid grid-cols-2 gap-4 p-6 pt-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/5" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 backdrop-blur-xl bg-black/60" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <InsanoLogo size={100} className="mx-auto mb-6" showText={false} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 mb-8"
        >
          <h1 className="text-2xl font-black font-cinzel text-white tracking-wider">
            ALGO INCRÍVEL
          </h1>
          <h2 className="text-2xl font-black font-cinzel bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            ESTÁ CHEGANDO
          </h2>
          <div className="w-20 h-px mx-auto bg-gradient-to-r from-transparent via-pink-500 to-transparent mt-4" />
        </motion.div>

        {isExpired ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Sparkles size={48} className="text-pink-400 animate-pulse" />
            <p className="text-xl font-bold text-white">Bem-vinda! 🎉</p>
            <a
              href="/aluno"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold tracking-wider shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-shadow"
            >
              ACESSAR PLATAFORMA
            </a>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 mb-6"
            >
              <Clock size={16} className="text-pink-400" />
              <span className="text-xs text-white/50 uppercase tracking-[0.3em] font-medium">
                Contagem Regressiva
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-4 gap-3 mb-10"
            >
              {[
                { value: timeLeft.days, label: "DIAS" },
                { value: timeLeft.hours, label: "HORAS" },
                { value: timeLeft.minutes, label: "MIN" },
                { value: timeLeft.seconds, label: "SEG" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-[72px] h-[72px] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center mb-2 shadow-lg shadow-black/20">
                    <span className="text-3xl font-black text-white tabular-nums font-cinzel">
                      {String(item.value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/40 tracking-[0.25em] font-semibold">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="space-y-4 max-w-xs"
            >
              <p className="text-xs text-white/30 leading-relaxed text-center">
                Estamos preparando tudo com muito carinho para você.
                <br />
                <span className="text-pink-400/60">Fique atenta! ✨</span>
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-pink-400/80 font-bold text-center mb-3">
                  ⚡ Enquanto aguarda, prepare-se:
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="text-white/50 text-xs font-bold shrink-0">1.</span>
                  <p className="text-[11px] text-white/50 leading-snug">
                    <span className="text-white/70 font-semibold">Instale o app:</span> Toque nos 3 pontinhos do navegador → "Adicionar à tela inicial"
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-white/50 text-xs font-bold shrink-0">2.</span>
                  <p className="text-[11px] text-white/50 leading-snug">
                    <span className="text-white/70 font-semibold">Ative notificações:</span> Quando aparecer o pedido de permissão, clique em "Permitir" para não perder nada!
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-8 w-32 h-32 bg-pink-500/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-8 w-40 h-40 bg-rose-500/5 rounded-full blur-[100px]" />
    </div>
  );
};

function getTimeLeft() {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default Cronometro;
