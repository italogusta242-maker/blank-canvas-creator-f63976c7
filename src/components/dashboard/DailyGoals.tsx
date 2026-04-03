import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Droplets, Moon, TrendingUp, Check, History, Camera, X, Loader2, ImageIcon, Footprints, BookOpen, CandyOff, Heart, Activity, Shield, Smartphone, Flame } from "lucide-react";
import DailyGoalsHistoryModal from "./DailyGoalsHistoryModal";
import type { DayPerformance } from "@/hooks/useRealPerformance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getGoalsForUser, getPhase, getPhaseLabel, type GoalKey } from "@/lib/progressiveGoals";
import { SFX } from "@/hooks/useSoundEffects";
import { useDailyHabits } from "@/hooks/useDailyHabits";

interface DailyGoalsProps {
  waterIntake: number;
  waterGoal: number;
  sleepHours: number;
  sleepGoal: number;
  setWaterIntake: (val: number) => void;
  iconAccentClass: string;
  dropletsClass: string;
  waterBarColor: string;
  sleepBarColor: string;
  performanceData?: DayPerformance[];
  planDaysElapsed?: number;
  plannerType?: string;
}

const CheckCircle = ({ done, color, onClick }: { done: boolean; color: string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""} ${
      done ? "scale-110 shadow-lg" : "border-muted-foreground/30 bg-transparent"
    }`}
    style={done ? { borderColor: color, backgroundColor: color, boxShadow: `0 0 8px ${color}40` } : {}}
  >
    {done && <Check size={10} className="text-white" strokeWidth={3} />}
  </div>
);

function MealPhotoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (url: string) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `meal-proofs/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("community_media")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("community_media").getPublicUrl(path);
      toast.success("Foto de refeição enviada! 🎉", { description: "Sua prova está registrada." });
      onSuccess(publicUrl);
    } catch (e: any) {
      toast.error("Falha ao enviar foto: " + (e.message ?? "erro desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl relative space-y-5"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>

          <div className="text-center">
            <Camera size={28} className="mx-auto mb-2 text-accent" />
            <h3 className="font-cinzel font-bold text-foreground">Prova de Refeição</h3>
            <p className="text-xs text-muted-foreground mt-1">Registre sua refeição saudável para validação</p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full aspect-video rounded-2xl border-2 overflow-hidden flex items-center justify-center transition-all ${
              preview ? "border-accent/40" : "border-dashed border-border hover:border-accent/50 bg-secondary/20"
            }`}
          >
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">Toque para selecionar</p>
                <p className="text-[10px] mt-0.5">Câmera ou galeria</p>
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3.5 bg-accent text-white font-cinzel font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-accent/20 disabled:opacity-40 hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            {uploading ? "Enviando..." : "Confirmar Prova"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const GOAL_ICONS: Record<string, any> = {
  treino: Flame,
  agua: Droplets,
  sono: Moon,
  cardio: Activity,
  dieta_cafe: UtensilsCrossed,
  dieta_almoco: UtensilsCrossed,
  dieta_jantar: UtensilsCrossed,
  dieta_completa: UtensilsCrossed,
  nao_beliscar: Shield,
  autocuidado: Heart,
  sem_preguica: Flame,
  sem_celular: Smartphone,
  sem_acucar: CandyOff,
};

const GOAL_COLORS: Record<string, string> = {
  treino: "#ff2a5f",
  agua: "#3b82f6",
  sono: "#8b5cf6",
  cardio: "#f97316",
  dieta_cafe: "#f59e0b",
  dieta_almoco: "#f59e0b",
  dieta_jantar: "#f59e0b",
  dieta_completa: "#f59e0b",
  nao_beliscar: "#10b981",
  autocuidado: "#06b6d4",
  sem_preguica: "#ff2a5f",
  sem_celular: "#6366f1",
  sem_acucar: "#ef4444",
};

const DailyGoals = ({
  waterIntake,
  waterGoal,
  sleepHours,
  sleepGoal,
  setWaterIntake,
  iconAccentClass,
  dropletsClass,
  waterBarColor,
  sleepBarColor,
  performanceData = [],
  planDaysElapsed = 1,
  plannerType,
}: DailyGoalsProps) => {
  const { user } = useAuth();
  const last7 = performanceData.slice(-7);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mealPhotoOpen, setMealPhotoOpen] = useState(false);
  const [mealProofUrl, setMealProofUrl] = useState<string | null>(null);

  const { completedGoals, toggleGoal, waterIntake: hookWater, mealsCompletedCount } = useDailyHabits();

  const waterDone = waterIntake >= waterGoal || hookWater >= waterGoal;
  const sleepDone = sleepHours >= sleepGoal;

  const dailyGoalsConfig = getGoalsForUser(plannerType, planDaysElapsed);
  const activeGoals = dailyGoalsConfig.goals;
  
  const phase = getPhase(planDaysElapsed);
  const phaseLabel = getPhaseLabel(phase);

  const isGoalDone = (key: GoalKey): boolean => {
    switch (key) {
      case "agua": return waterDone;
      case "sono": return sleepDone;
      case "treino": 
        return performanceData.length > 0 && (performanceData[performanceData.length - 1]?.training || 0) > 0;
      case "dieta_completa":
        return mealsCompletedCount >= 5;
      case "dieta_cafe":
        return mealsCompletedCount >= 1;
      case "dieta_almoco":
        return mealsCompletedCount >= 3;
      case "dieta_jantar":
        return mealsCompletedCount >= 5;
      default: 
        return completedGoals.has(key);
    }
  };

  const isAutoGoal = (key: string) => {
    return ["treino", "dieta_cafe", "dieta_almoco", "dieta_jantar", "dieta_completa"].includes(key);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-2xl md:rounded-[2rem] border border-border p-2 md:p-6 shadow-xl flex flex-col gap-2 md:gap-6 h-full"
    >
      <div className="flex items-center justify-between mb-1 md:mb-4 px-2 pt-1 border-b border-border/50 pb-2">
        <div>
          <h3 className="font-cinzel text-sm md:text-xl font-bold text-primary">Metas Diárias</h3>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{phaseLabel}</p>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          title="Ver histórico"
        >
          <History size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-1.5 md:space-y-3">
        {activeGoals.map((goal) => {
          const done = isGoalDone(goal.key);
          const GoalIcon = GOAL_ICONS[goal.key] || Droplets;
          const color = GOAL_COLORS[goal.key] || waterBarColor;
          const auto = isAutoGoal(goal.key);

          if (goal.key === "agua") {
            return (
              <div key={goal.key} className="bg-secondary/5 p-2 md:p-3 rounded-xl md:rounded-2xl border border-secondary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle done={waterDone} color={color} onClick={() => setWaterIntake(waterDone ? 0 : waterGoal)} />
                    <div>
                      <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        <Droplets size={14} className={dropletsClass} /> Água
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground/60">{(waterIntake || hookWater).toFixed(1)}L / {waterGoal}L</span>
                    </div>
                  </div>
                  <span className={`hidden md:inline text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${waterDone ? "bg-green-500/20 text-green-400" : "bg-muted/20 text-muted-foreground"}`}>
                    {waterDone ? "OK" : "P"}
                  </span>
                </div>
              </div>
            );
          }

          if (goal.key === "sono") {
            return (
              <div key={goal.key} className="bg-secondary/5 p-2 md:p-3 rounded-xl md:rounded-2xl border border-secondary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle done={sleepDone} color={color} />
                    <div>
                      <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        <Moon size={14} className={iconAccentClass} /> Sono
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground/60">{sleepHours} / {sleepGoal}h</span>
                    </div>
                  </div>
                  <span className={`hidden md:inline text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sleepDone ? "bg-green-500/20 text-green-400" : "bg-muted/20 text-muted-foreground"}`}>
                    {sleepDone ? "OK" : "P"}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={goal.key} className="bg-secondary/5 p-2 md:p-3 rounded-xl md:rounded-2xl border border-secondary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle 
                    done={done} 
                    color={color} 
                    onClick={!auto ? () => toggleGoal(goal.key) : undefined} 
                  />
                  <div>
                    <span className={`flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider ${done ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                      <GoalIcon size={14} style={{ color: done ? `${color}80` : color }} /> {goal.label}
                      {auto && <span className="text-[9px] opacity-40 font-normal italic lowercase ml-1">(Auto)</span>}
                    </span>
                    <span className="text-[10px] md:text-xs text-muted-foreground/40 leading-tight block">{goal.description}</span>
                  </div>
                </div>
                <span className={`hidden md:inline text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${done ? "bg-green-500/20 text-green-400" : "bg-muted/20 text-muted-foreground"}`}>
                  {done ? "OK" : "P"}
                </span>
              </div>
            </div>
          );
        })}

        {/* Histórico 7 Dias */}
        {last7.length > 0 && (() => {
          // Optimistic update: recompute today's score from LOCAL state for instant feedback
          const optimisticLast7 = last7.map((d, i) => {
            if (i !== last7.length - 1) return d;
            
            // Use server values for training & diet (authoritative)
            const trainingPts = d.training || 0;
            const dietPts = d.diet || 0;
            
            // Compute dailyGoals entirely from current LOCAL UI state
            let plannerCount = 0;
            if (waterDone) plannerCount++;
            if (sleepDone) plannerCount++;
            if (trainingPts > 0) plannerCount++;
            
            // Count all non-auto goals that are checked right now
            activeGoals.forEach(g => {
              if (["agua", "sono", "treino"].includes(g.key)) return; // already counted above
              if (isGoalDone(g.key)) plannerCount++;
            });
            
            const localDailyGoals = Math.round(Math.min(20, plannerCount * 2.5));
            // Compute fresh score — no Math.max, this IS the authoritative optimistic score
            const optimisticScore = Math.min(100, trainingPts + dietPts + localDailyGoals);
            
            return { ...d, score: optimisticScore, dailyGoals: localDailyGoals };
          });
          
          return (
          <div className="bg-secondary/5 p-3 md:p-5 rounded-2xl border border-secondary/10 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className={iconAccentClass} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Histórico 7 Dias</span>
            </div>
            <div className="flex items-end justify-between gap-1 h-16">
              {optimisticLast7.map((d, i) => {
                const pct = Math.max(4, d.score);
                const isToday = i === optimisticLast7.length - 1;
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: "48px" }}>
                      <div
                        style={{ width: "100%", height: `${pct}%`, transition: "height 0.3s ease-out" }}
                        className={`rounded-t-sm ${
                          isToday ? "bg-primary"
                            : d.score >= 70 ? "bg-emerald-500/60"
                            : d.score >= 40 ? "bg-amber-500/50"
                            : "bg-muted/40"
                        }`}
                        title={`${d.day}: ${d.score}pts`}
                      />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider truncate ${isToday ? "text-primary" : "text-muted-foreground/40"}`}>
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}
      </div>

      <DailyGoalsHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        waterGoal={waterGoal}
        sleepGoal={sleepGoal}
      />

      {mealPhotoOpen && (
        <MealPhotoModal
          onClose={() => setMealPhotoOpen(false)}
          onSuccess={(url) => {
            setMealProofUrl(url);
            setMealPhotoOpen(false);
          }}
        />
      )}
    </motion.div>
  );
};

export default DailyGoals;
