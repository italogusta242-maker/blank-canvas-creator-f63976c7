import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, TrendingUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useDailyHabitsRange } from "@/hooks/useDailyHabits";
import type { DailyHabit } from "@/hooks/useDailyHabits";

interface DailyGoalsHistoryModalProps {
  open: boolean;
  onClose: () => void;
  waterGoal: number;
  sleepGoal: number;
}

const DailyGoalsHistoryModal = ({ open, onClose, waterGoal, sleepGoal }: DailyGoalsHistoryModalProps) => {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const { data: habits = [] } = useDailyHabitsRange(30);

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Build a map of date -> habit
  const habitMap = new Map<string, DailyHabit>();
  habits.forEach(h => habitMap.set(h.date, h));

  // Get dates for display
  const getDates = () => {
    const days = viewMode === "week" ? 7 : 30;
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    // Most recent first (today at top)
    return dates;
  };

  const dates = getDates();

  const getStatus = (date: string) => {
    const h = habitMap.get(date);
    if (!h) return { water: false, complete: false, score: 0 };
    const waterOk = (h.water_liters ?? 0) >= waterGoal;
    const score = waterOk ? 1 : 0;
    return { water: waterOk, complete: waterOk, score };
  };

  const completedDays = dates.filter(d => getStatus(d).complete).length;
  const totalDays = dates.length;

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card rounded-3xl border border-border p-6 max-w-lg w-full max-h-[80vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-cinzel text-lg font-bold text-primary">Histórico de Metas</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedDays} de {totalDays} dias concluídos
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
              {(["week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors ${
                    viewMode === mode
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {mode === "week" ? "7 Dias" : "30 Dias"}
                </button>
              ))}
            </div>

            {/* Summary Bar */}
            <div className="bg-secondary/10 rounded-2xl border border-secondary/20 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Taxa de Êxito</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalDays > 0 ? (completedDays / totalDays) * 100 : 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  />
                </div>
                <span className="text-sm font-bold text-primary min-w-[3rem] text-right">
                  {totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Calendar Grid */}
            {viewMode === "week" ? (
              <div className="grid grid-cols-7 gap-2">
                {dates.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  const status = getStatus(date);
                  const isToday = date === today;
                  return (
                    <div
                      key={date}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                        isToday
                          ? "border-primary/50 bg-primary/5"
                          : status.complete
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border/50 bg-secondary/5"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {dayNames[d.getDay()]}
                      </span>
                      <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {d.getDate()}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        status.complete
                          ? "bg-emerald-500 text-white"
                          : status.score > 0
                          ? "bg-amber-500/30 text-amber-500"
                          : "bg-muted/30 text-muted-foreground/50"
                      }`}>
                        {status.complete ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <span className="text-[10px] font-bold">{status.score}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {dates.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  const status = getStatus(date);
                  const isToday = date === today;
                  const h = habitMap.get(date);
                  return (
                    <div
                      key={date}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                        isToday ? "bg-primary/5 border border-primary/30" : "bg-secondary/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          status.complete ? "bg-emerald-500" : status.score > 0 ? "bg-amber-500/50" : "bg-muted/30"
                        }`}>
                          {status.complete && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                            {dayNames[d.getDay()]} {d.getDate()}/{monthNames[d.getMonth()]}
                          </span>
                          {isToday && <span className="text-[10px] text-primary ml-1">(Hoje)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>💧 {(h?.water_liters ?? 0).toFixed(1)}L</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          status.complete ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/20 text-muted-foreground"
                        }`}>
                          {status.complete ? "✓" : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DailyGoalsHistoryModal;
