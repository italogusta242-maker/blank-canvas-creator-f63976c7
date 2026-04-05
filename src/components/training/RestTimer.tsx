import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface RestTimerProps {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}

const RestTimer = ({ seconds, onDone, onSkip }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const rem = Math.max(0, seconds - elapsed);
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        onDone();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [seconds, onDone]);

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 w-64 shadow-xl">
        <p className="font-cinzel text-xs uppercase tracking-widest text-muted-foreground">Descanso</p>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-cinzel text-3xl font-bold text-foreground tabular-nums">
              {min}:{sec.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          Pular descanso
        </button>
      </div>
    </motion.div>
  );
};

export default RestTimer;
