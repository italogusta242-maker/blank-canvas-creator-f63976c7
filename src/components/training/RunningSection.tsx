/**
 * @purpose Running-only sports section, inheriting VictoryCard design language.
 * All other sports (Ciclismo, Natação, etc.) are hidden.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Activity, Plus, Flame } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { shouldIncrementFlame } from "@/hooks/useDailyFlameCheck";
import { optimisticFlameUpdate } from "@/lib/flameOptimistic";
import { checkAndUpdateFlame } from "@/lib/flameMotor";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatTime } from "./helpers";
import type { WorkoutLog } from "./types";

const WEEKLY_MINUTES_GOAL = 150;

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

interface RunningSectionProps {
  workoutHistory: WorkoutLog[];
  onSaveSuccess?: (durationSecs: number, distanceKm: number) => void;
}

const RunningSectionBeta = ({ workoutHistory, onSaveSuccess }: RunningSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  const weekStart = getWeekStart();

  const runningSessions = workoutHistory.filter(
    (w) => w.group_name === "Manual_Corrida" && w.finished_at
  );

  const thisWeekMins = runningSessions
    .filter((w) => new Date(w.started_at) >= weekStart)
    .reduce((sum, w) => sum + ((w.duration_seconds || 0) / 60), 0);

  const totalMins = runningSessions.reduce((sum, w) => sum + ((w.duration_seconds || 0) / 60), 0);
  const totalKm = runningSessions.reduce((sum, w) => {
    const match = w.comment?.match(/([\d.]+)km/);
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);

  const pct = Math.min(100, (thisWeekMins / WEEKLY_MINUTES_GOAL) * 100);

  const saveLog = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const mins = parseFloat(duration) || 0;
      if (mins <= 0) throw new Error("Duração inválida. Informe os minutos.");
      const durationSecs = Math.round(mins * 60);

      let commentStr = `${mins} min`;
      if (distance) {
        commentStr = `${distance}km — ${mins} min`;
      }

      const now = new Date().toISOString();
      const { error } = await supabase.from("workouts").insert({
        user_id: user.id,
        group_name: "Manual_Corrida",
        duration_seconds: durationSecs,
        comment: commentStr,
        started_at: now,
        finished_at: now,
        exercises: [],
      });
      if (error) throw error;
    },
    onMutate: async () => {
      if (!user) return;
      // Anti-duplication: check if flame already active today
      const shouldIncrement = await shouldIncrementFlame(user.id);
      if (shouldIncrement) {
        await queryClient.cancelQueries({ queryKey: ["flame-state", user.id] });
        optimisticFlameUpdate(queryClient, user.id, {
          adherenceDelta: 40,
          forceActive: true,
          streakIncrement: true,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["real-performance"] });
      if (user) checkAndUpdateFlame(user.id);
      setLogOpen(false);
      
      const distParsed = parseFloat(distance) || 0;
      const minsParsed = parseFloat(duration) || 0;
      
      setDistance("");
      setDuration("");
      toast.success("Corrida registrada! 🏃‍♀️🔥");
      
      if (onSaveSuccess) {
        onSaveSuccess(minsParsed * 60, distParsed);
      }
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar log"),
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Header Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Navigation size={22} className="text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-sans font-bold text-foreground text-base tracking-tight">Corrida</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Caminhada, rua, esteira</p>
          </div>
        </div>

        {/* Weekly Minutes bar */}
        <div className="mb-4 space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-2xl font-black text-foreground tabular-nums">{Math.round(thisWeekMins)}</span>
              <span className="text-sm text-muted-foreground ml-1">/ {WEEKLY_MINUTES_GOAL} min na semana</span>
            </div>
            <span className="text-xs font-bold text-accent">{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-center mb-5">
          <div className="flex-1 bg-secondary/50 rounded-xl p-3">
            <p className="text-xl font-black text-foreground">{runningSessions.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">sessões</p>
          </div>
          <div className="flex-1 bg-secondary/50 rounded-xl p-3">
            <p className="text-xl font-black text-foreground">{totalKm.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">km totais</p>
          </div>
          <div className="flex-1 bg-secondary/50 rounded-xl p-3">
            <p className="text-xl font-black text-foreground">{Math.round(totalMins)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">min totais</p>
          </div>
        </div>

        <button
          onClick={() => setLogOpen(true)}
          className="w-full py-3.5 bg-accent text-white font-cinzel font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-accent/20 hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Registrar Corrida
        </button>
      </div>

      {/* Recent history */}
      {runningSessions.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Histórico Rápido</p>
          {runningSessions.slice(0, 4).map((w) => {
            const date = new Date(w.started_at);
            return (
              <div key={w.id} className="bg-secondary/30 border border-border/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Corrida</p>
                  <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-accent">{w.comment}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Drawer */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setLogOpen(false)} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="relative bg-card border-t border-border rounded-t-3xl p-6 pb-10 max-w-lg mx-auto w-full shadow-2xl space-y-5"
          >
            <div className="w-12 h-1.5 bg-secondary rounded-full mx-auto mb-1" />
            <h3 className="font-cinzel font-bold text-lg text-foreground text-center">Registrar Corrida</h3>

            {/* Distance */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                <span>Distância (km)</span>
                <span className="text-accent">Recomendado</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 5.5"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="text-foreground bg-secondary/50 border-border"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tempo Total (Minutos) *</label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="Ex: 45"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="text-foreground bg-secondary/50 border-border font-bold text-lg"
              />
            </div>

            <button
              onClick={() => saveLog.mutate()}
              disabled={!duration || parseFloat(duration) <= 0 || saveLog.isPending}
              className="w-full py-4 bg-accent text-white font-cinzel font-bold text-sm rounded-xl tracking-wider shadow-lg shadow-accent/20 disabled:opacity-40 hover:bg-accent/90 transition-colors mt-4"
            >
              {saveLog.isPending ? <Activity className="animate-pulse mx-auto" size={18} /> : "Finalizar Corrida"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RunningSectionBeta;
