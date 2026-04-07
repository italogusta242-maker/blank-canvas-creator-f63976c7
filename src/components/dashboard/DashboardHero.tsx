import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FlameState } from "@/hooks/useFlameState";

interface DashboardHeroProps {
  hasTrainingPlan: boolean;
  todayScheduleName: string;
  adherence: number;
  streak: number;
  ranking: number;
  totalPoints: number;
  flameState?: FlameState;
}

const DashboardHero = ({ 
  hasTrainingPlan, 
  todayScheduleName, 
  adherence, 
  streak, 
  ranking,
  totalPoints,
  flameState = "ativa",
  currentDayLabel
}: DashboardHeroProps & { currentDayLabel?: string }) => {
  const navigate = useNavigate();
  const cappedAdherence = Math.min(adherence, 100);

  return (
    <div className="relative z-10 w-full mb-6 md:mb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl md:rounded-[2.5rem] border-none dark:border dark:border-white/5 p-5 md:p-8 lg:p-12 overflow-hidden shadow-2xl flex flex-row items-center justify-between gap-4 md:gap-12 transition-colors duration-500 ${
          flameState === "frozen"
            ? "bg-gradient-to-br from-[#1E3A8A] to-[#06B6D4] shadow-blue-500/20"
            : "bg-gradient-to-br from-[#FF2768] to-[#FF4B8B] dark:from-[#0A0A0A] dark:to-[#0A0A0A] shadow-pink-500/20"
        }`}
      >
        {/* Background Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
        
        {/* Left: Text + Button */}
        <div className="relative z-10 flex-1 space-y-3 md:space-y-8 min-w-0">
          <div className="space-y-2 md:space-y-6">
            {hasTrainingPlan && currentDayLabel && (
              <p className="text-white/70 font-sans font-black text-[10px] md:text-sm tracking-[0.2em] mb-[-4px] md:mb-[-12px] uppercase">
                {currentDayLabel}
              </p>
            )}
            <h2 className="font-sans text-lg md:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight text-wrap">
              {hasTrainingPlan ? todayScheduleName.toUpperCase() : "SEU DESAFIO COMEÇA AGORA"}
            </h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => hasTrainingPlan ? navigate("/aluno/treinos") : navigate("/aluno/desafio")}
            className="px-5 py-3 md:px-10 md:py-5 bg-white dark:bg-foreground text-black font-sans font-black text-xs md:text-sm rounded-xl md:rounded-2xl tracking-wider shadow-xl uppercase"
          >
            {hasTrainingPlan ? "Iniciar Treino" : "Escolha o plano"}
          </motion.button>
        </div>

        {/* Right: Circular Progress + Stats */}
        <div className="relative z-10 flex flex-col items-center gap-3 md:gap-10 shrink-0">
           <div className="relative w-24 h-24 md:w-48 md:h-48 lg:w-64 lg:h-64 flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border border-white/20 dark:border-white/[0.03] animate-spin-slow" />
             <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
               <circle
                 cx="60" cy="60" r="54"
                 stroke="currentColor" strokeWidth="6"
                 fill="transparent"
                 className="text-white/30 dark:text-white/5"
               />
               <motion.circle
                 cx="60" cy="60" r="54"
                 stroke="currentColor" strokeWidth="6"
                 fill="transparent"
                 strokeDasharray="339.29"
                 initial={{ strokeDashoffset: 339.29 }}
                 animate={{ strokeDashoffset: 339.29 - (339.29 * cappedAdherence) / 100 }}
                 transition={{ duration: 2, ease: "easeOut" }}
                 strokeLinecap="round"
                 className="text-white dark:text-accent"
               />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Flame className="text-white dark:text-accent animate-pulse mb-0.5 md:mb-3 w-5 h-5 md:w-10 md:h-10" />
                <span className="text-xl md:text-4xl lg:text-6xl font-sans font-bold text-white">{cappedAdherence}%</span>
               <span className="text-[9px] md:text-sm font-cinzel font-bold text-white/80 dark:text-accent tracking-[0.3em] md:tracking-[0.4em] mt-0.5 md:mt-2 uppercase">Adesão</span>
             </div>
           </div>
           
           <div className="flex gap-4 md:gap-10">
              <div className="text-center">
                <p className="text-base md:text-2xl font-cinzel font-bold text-white">{streak}</p>
                <p className="text-[9px] md:text-[10px] text-white/80 dark:text-muted-foreground uppercase tracking-widest">Streak</p>
              </div>
              <div className="w-[1px] h-6 md:h-12 bg-white/30 dark:bg-white/10" />
               <div className="text-center">
                <p className="text-base md:text-2xl font-cinzel font-bold text-white">{totalPoints.toLocaleString()}</p>
                <p className="text-[9px] md:text-[10px] text-white/80 dark:text-muted-foreground uppercase tracking-widest">Pontos</p>
              </div>
              <div className="w-[1px] h-6 md:h-12 bg-white/30 dark:bg-white/10" />
               <div className="text-center">
                <p className="text-base md:text-2xl font-cinzel font-bold text-white">{ranking}#</p>
                <p className="text-[9px] md:text-[10px] text-white/80 dark:text-muted-foreground uppercase tracking-widest">Ranking</p>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHero;
