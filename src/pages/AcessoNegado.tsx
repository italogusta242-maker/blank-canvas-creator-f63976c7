import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldOff, Flame, Zap, Crown, Lock, ArrowRight, Clock } from "lucide-react";

const UPSELL_PERKS = [
  { icon: Flame, label: "Streak & Gamificação", desc: "Mantenha sua sequência de conquistas ativa" },
  { icon: Zap, label: "Planos de Treino", desc: "Cronograma personalizado pelo seu especialista" },
  { icon: Crown, label: "Comunidade VIP", desc: "Feed exclusivo, ranking semanal e desafios em grupo" },
  { icon: Clock, label: "Histórico Completo", desc: "Acesso total ao seu histórico de performance" },
];

const REASON_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  no_access: {
    title: "Você ainda não tem acesso",
    subtitle: "Para desbloquear todos os recursos do ANAAC Club, escolha um plano.",
  },
  expired: {
    title: "Seu acesso expirou",
    subtitle: "Renove agora para continuar sua jornada sem interrupções.",
  },
  default: {
    title: "Acesso Restrito",
    subtitle: "Esta área é exclusiva para membros ativos do ANAAC Club.",
  },
};

const AcessoNegado = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason") ?? "default";
  const msg = REASON_MESSAGES[reason] ?? REASON_MESSAGES.default;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ backgroundColor: "#08090C" }}
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[hsl(342,100%,57%)]/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
          style={{
            background: "linear-gradient(135deg, hsl(342 100% 57% / 0.2), hsl(342 100% 57% / 0.05))",
            border: "1px solid hsl(342 100% 57% / 0.3)",
          }}
        >
          <Lock size={36} style={{ color: "hsl(342 100% 57%)" }} />
        </motion.div>

        {/* Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
            <ShieldOff size={12} className="text-white/40" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Acesso bloqueado</span>
          </div>
          <h1 className="text-2xl font-cinzel font-bold text-white mb-3 leading-tight">
            {msg.title}
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            {msg.subtitle}
          </p>
        </div>

        {/* Perks */}
        <div className="space-y-3 mb-8">
          {UPSELL_PERKS.map((perk, i) => (
            <motion.div
              key={perk.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="flex items-center gap-4 p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(342 100% 57% / 0.12)" }}
              >
                <perk.icon size={18} style={{ color: "hsl(342 100% 57%)" }} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{perk.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{perk.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/funnel")}
          className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide flex items-center justify-center gap-3 mb-4"
          style={{
            background: "linear-gradient(135deg, hsl(342 100% 57%), hsl(342 100% 47%))",
            boxShadow: "0 0 40px hsl(342 100% 57% / 0.35), 0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          Quero o acesso completo
          <ArrowRight size={18} />
        </motion.button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 text-sm text-white/30 hover:text-white/60 transition-colors font-cinzel tracking-widest uppercase"
        >
          ← Voltar
        </button>
      </motion.div>
    </div>
  );
};

export default AcessoNegado;
