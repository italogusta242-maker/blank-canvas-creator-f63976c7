import { motion } from "framer-motion";
import { Flame, AlertTriangle, Shield } from "lucide-react";
import type { FlameState } from "@/hooks/useFlameState";
import { getMessageForState } from "@/lib/motivationalMessages";

interface FlameBannerProps {
  state: FlameState;
}

/**
 * Top banner that appears only for trégua and extinta states.
 */
const FlameBanner = ({ state }: FlameBannerProps) => {
  // We remove the strict return null because we want to show it when it's late (>= 18h) and state is still normal
  if (state === "ativa") return null;

  const isTregua = state === "tregua";
  const hour = new Date().getHours();
  const isLate = hour >= 18 && (state === "normal" || state === "tregua");
  
  const msgState = state === "extinta" ? "extinguindo" : isLate ? "ameaca" : isTregua ? "ameaca" : "normal";
  const msgDef = getMessageForState(msgState);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl px-4 py-4 flex items-start gap-4 relative z-10 shadow-lg ${isLate ? 'animate-pulse-glow shadow-[0_0_20px_rgba(220,38,38,0.4)]' : ''}`}
      style={{
        background: isTregua
          ? "linear-gradient(135deg, hsl(210, 25%, 15%), hsl(210, 20%, 10%))"
          : isLate 
          ? "linear-gradient(135deg, hsl(350, 40%, 15%), hsl(350, 40%, 10%))"
          : "linear-gradient(135deg, hsl(260, 20%, 15%), hsl(260, 15%, 10%))",
        border: `1px solid ${isTregua ? "hsl(210, 40%, 30%)" : isLate ? "hsl(350, 60%, 40%)" : "hsl(260, 30%, 30%)"}`,
      }}
    >
      <div className="text-3xl mt-1">{msgDef.emoji}</div>
      <div>
        <p className="font-cinzel text-sm font-bold tracking-wide" style={{ color: isTregua ? "hsl(210, 70%, 70%)" : isLate ? "hsl(350, 80%, 65%)" : "hsl(270, 50%, 70%)" }}>
          {msgDef.title.toUpperCase()}
        </p>
        <p className="text-sm mt-1 leading-snug" style={{ color: "hsl(0, 0%, 80%)" }}>
          {msgDef.message}
        </p>
      </div>
    </motion.div>
  );
};

export default FlameBanner;
