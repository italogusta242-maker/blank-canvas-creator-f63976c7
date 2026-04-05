import { motion } from "framer-motion";
import { TrendingUp, ChevronRight } from "lucide-react";

interface WeeklyVolumeProps {
  volumeResumido: any[];
  volumeDetalhado: any[];
  volumeLimits: Record<string, { min: number; max: number }>;
  volumeBarColor: string;
  setVolumeFilter: (val: "all" | "superior" | "inferior") => void;
  setVolumeExpanded: (val: boolean) => void;
  iconAccentClass: string;
  cardBg: string;
  cardBorder: string;
}

const WeeklyVolume = ({
  volumeResumido,
  volumeDetalhado,
  volumeLimits,
  volumeBarColor,
  setVolumeFilter,
  setVolumeExpanded,
  iconAccentClass,
  cardBg,
  cardBorder,
}: WeeklyVolumeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`${cardBg} rounded-[2.5rem] border ${cardBorder} p-8 shadow-xl h-full flex flex-col`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-cinzel text-xl font-bold text-primary italic">Volume Semanal</h3>
        <TrendingUp size={20} className={iconAccentClass} />
      </div>
      <p className="text-[10px] text-muted-foreground mb-8 uppercase tracking-[0.2em]">Séries de trabalho por região muscular</p>
      
      <div className="space-y-4 flex-1">
        {volumeResumido.map((r) => {
          const regionItems = volumeDetalhado.filter(v => v.regiao === r.grupo.toLowerCase());
          const totalMax = regionItems.reduce((s, v) => s + (volumeLimits[v.grupo]?.max ?? 20), 0);
          const pct = Math.min((r.series / totalMax) * 100, 100);
          
          return (
            <button 
              key={r.grupo} 
              onClick={() => { 
                setVolumeFilter(r.grupo.toLowerCase() as "superior" | "inferior"); 
                setVolumeExpanded(true); 
              }}
              className="w-full p-6 rounded-3xl bg-secondary/10 hover:bg-secondary/20 transition-all text-left border border-border group"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-black text-primary group-hover:text-accent transition-colors italic">{r.grupo}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{r.total} grupos · {r.series} séries totais</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-background/50 flex items-center justify-center text-muted-foreground group-hover:text-accent group-hover:bg-accent/10 transition-all border border-border/50">
                  <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-secondary/20 border border-border/10">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${pct}%`, background: volumeBarColor }} 
                />
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default WeeklyVolume;
