import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Dumbbell, UtensilsCrossed, Target, Droplets, Moon, Flame, Activity, Shield, Heart, Smartphone, CandyOff, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { DayPerformance } from "@/hooks/useRealPerformance";
import { getGoalsForUser, type GoalKey } from "@/lib/progressiveGoals";

interface PerformanceDetailModalProps {
  open: boolean;
  onClose: () => void;
  weekData: DayPerformance[];
  monthData: DayPerformance[];
  plannerType?: string;
  planDaysElapsed?: number;
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
  treino: "hsl(var(--primary))",
  agua: "#3b82f6",
  sono: "#8b5cf6",
  cardio: "#f97316",
  dieta_cafe: "#f59e0b",
  dieta_almoco: "#f59e0b",
  dieta_jantar: "#f59e0b",
  dieta_completa: "#f59e0b",
  nao_beliscar: "#10b981",
  autocuidado: "#06b6d4",
  sem_preguica: "hsl(var(--primary))",
  sem_celular: "#6366f1",
  sem_acucar: "#ef4444",
};

const PerformanceDetailModal = ({ open, onClose, weekData, monthData, plannerType, planDaysElapsed = 1 }: PerformanceDetailModalProps) => {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState<DayPerformance | null>(null);

  const goalsConfig = useMemo(() => getGoalsForUser(plannerType, planDaysElapsed), [plannerType, planDaysElapsed]);
  const activeGoals = goalsConfig.goals;

  if (!open) return null;

  const data = period === "week" ? weekData : monthData;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length) : 0;
  const maxScore = data.length > 0 ? Math.max(...data.map(d => d.score)) : 0;
  const daysWithTraining = data.filter(d => d.training > 0).length;

  const handleDotClick = (dayLabel: string) => {
    const day = data.find(d => d.day === dayLabel);
    if (day) setSelectedDay(selectedDay?.date === day.date ? null : day);
  };

  // Compute completed goals count for a day
  const getCompletedCount = (day: DayPerformance) => {
    const total = activeGoals.length || 8;
    return Math.round((day.score / 100) * total);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="font-cinzel text-base font-bold text-foreground">Evolução de Performance</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Period toggle */}
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setSelectedDay(null); }}
                className={`flex-1 py-2 rounded-md text-xs font-cinzel font-semibold transition-all ${
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "week" ? "7 Dias" : "30 Dias"}
              </button>
            ))}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{avgScore}%</p>
              <p className="text-[10px] text-muted-foreground">Média</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-accent">{maxScore}%</p>
              <p className="text-[10px] text-muted-foreground">Máximo</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-primary">{daysWithTraining}</p>
              <p className="text-[10px] text-muted-foreground">Dias treino</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-secondary/20 rounded-xl border border-border p-3">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} onClick={(e: any) => {
                  if (e?.activeLabel) handleDotClick(e.activeLabel);
                }}>
                  <defs>
                    <linearGradient id="perfGradModal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: period === "month" ? 8 : 10, fill: "hsl(43, 10%, 55%)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={period === "month" ? 4 : 0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(43, 10%, 55%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                      borderRadius: "8px", fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Adesão"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    fill="url(#perfGradModal)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", r: period === "month" ? 2 : 3, cursor: "pointer" }}
                    activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Toque em um ponto para ver o detalhamento do dia
            </p>
          </div>

          {/* Selected day breakdown — expanded goals */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-secondary/20 rounded-xl border border-accent/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cinzel text-sm font-bold text-foreground">
                      {selectedDay.day} — {selectedDay.date}
                    </h3>
                    <span className="text-lg font-bold text-accent">{selectedDay.score}%</span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Target size={14} className="text-accent" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Metas Concluídas: {getCompletedCount(selectedDay)}/{activeGoals.length}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full overflow-hidden bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedDay.score}%`,
                        background: selectedDay.score >= 70
                          ? "hsl(140, 60%, 40%)"
                          : selectedDay.score >= 40
                          ? "hsl(40, 80%, 50%)"
                          : "hsl(var(--primary))",
                      }}
                    />
                  </div>

                  {/* Individual goals list */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {activeGoals.map((goal) => {
                      const GoalIcon = GOAL_ICONS[goal.key] || Target;
                      const color = GOAL_COLORS[goal.key] || "hsl(var(--accent))";
                      return (
                        <div
                          key={goal.key}
                          className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/30"
                        >
                          <GoalIcon size={12} style={{ color }} />
                          <span className="text-[10px] text-muted-foreground truncate">{goal.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daily list */}
          <div>
            <h3 className="font-cinzel text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Resumo por dia
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {[...data].reverse().map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(selectedDay?.date === day.date ? null : day)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all text-left ${
                    selectedDay?.date === day.date
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-secondary/20 hover:bg-secondary/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground w-12">{day.day}</span>
                    <div className="flex gap-1">
                      {day.training > 0 && <Dumbbell size={12} className="text-primary" />}
                      {day.diet > 0 && <UtensilsCrossed size={12} className="text-green-500" />}
                      {day.dailyGoals > 0 && <Target size={12} className="text-accent" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${day.score}%`,
                          background: day.score >= 70 ? "hsl(140, 60%, 40%)" : day.score >= 40 ? "hsl(40, 80%, 50%)" : "hsl(0, 70%, 45%)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-8 text-right">{day.score}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PerformanceDetailModal;