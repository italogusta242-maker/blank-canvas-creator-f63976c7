import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Star, Quote } from "lucide-react";
import { ALL_TRAININGS } from "@/components/training/TrainingPlanData";

interface Props {
  configTrainingIndex?: number | null;
}

export function TrainingObjectiveCard({ configTrainingIndex }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const training = configTrainingIndex != null ? ALL_TRAININGS[configTrainingIndex] : null;
  const aboutText = training?.about;
  const title = training?.title;
  const emoji = training?.emoji || "🏋️";
  const level = training ? `${training.level} • ${training.frequency}` : "";

  if (!aboutText) return null;

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 shadow-sm hover:border-primary/20 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
            {emoji}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">SOBRE O TREINO</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">{level}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-5 rounded-2xl bg-secondary/30 border border-border/40 relative">
              <Quote className="absolute top-4 right-4 text-primary/5 w-16 h-16 pointer-events-none" />
              <div className="space-y-3 relative z-10 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line">
                {aboutText}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
