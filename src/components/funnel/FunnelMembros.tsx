import { motion } from "framer-motion";
import {
  CheckCircle2,
  Dumbbell,
  Utensils,
  Users,
  TrendingUp,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { useFunnelStore } from "@/stores/useFunnelStore";

const features = [
  { icon: Dumbbell, label: "Treinos", desc: "Personalizados para você" },
  { icon: Utensils, label: "Dieta", desc: "Plano alimentar completo" },
  { icon: Users, label: "Comunidade", desc: "Alunas e suporte" },
  { icon: TrendingUp, label: "Evolução", desc: "Acompanhe seu progresso" },
  { icon: Trophy, label: "Desafios", desc: "Gamificação diária" },
];

const FunnelMembros = () => {
  const { user, clearCheckout } = useFunnelStore();

  const handleEnter = () => {
    clearCheckout();
    window.location.href = "/";
  };

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-y-auto">
      {/* ── Top gradient ── */}
      <div
        className="absolute top-0 left-0 right-0 h-72 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.1) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          {/* ── Success icon ── */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-primary shadow-lg"
          >
            <CheckCircle2 className="w-7 h-7 text-primary-foreground" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-bold text-foreground mb-1 font-sans"
          >
            Bem-vinda, {user.nome.split(" ")[0] || "aluna"}! 🎉
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-xs mb-4"
          >
            Sua conta foi ativada com sucesso.
          </motion.p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {features.map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className={`
                  p-2.5 rounded-xl bg-card border border-border text-left
                  ${i === features.length - 1 && features.length % 2 !== 0 ? "col-span-2" : ""}
                `}
              >
                <Icon className="w-4 h-4 text-primary mb-1" />
                <p className="text-foreground font-semibold text-xs leading-tight">{label}</p>
                <p className="text-muted-foreground text-[10px]">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEnter}
            className="w-full py-3 rounded-xl text-primary-foreground font-bold text-sm tracking-wide flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 shadow-lg"
          >
            Entrar no Aplicativo
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default FunnelMembros;
