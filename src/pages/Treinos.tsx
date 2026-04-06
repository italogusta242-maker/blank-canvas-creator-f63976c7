import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { optimisticFlameUpdate } from "@/lib/flameOptimistic";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safariStorage";
import { checkAndUpdateFlame, triggerMilestonePost } from "@/lib/flameMotor";

import { shouldIncrementFlame } from "@/hooks/useDailyFlameCheck";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Play, ChevronDown, ChevronUp, ArrowLeft, Check,
  Timer, RefreshCw, Weight, Clock, Flame, MessageSquare,
  History, X, AlertTriangle, FileText
} from "lucide-react";

import VictoryCard from "@/components/training/VictoryCard";
import RestTimer from "@/components/training/RestTimer";
import TrainingAnalysisCards from "@/components/training/TrainingAnalysisCards";
import { TrainingObjectiveCard } from "@/components/training/TrainingObjectiveCard";
import ExerciseVideoEmbed from "@/components/training/ExerciseVideoEmbed";
import PlanilhaCorrida from "@/components/training/PlanilhaCorrida";
import SetInputPicker from "@/components/training/SetInputPicker";

const DAYS_OF_WEEK = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];

import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { useFlameState } from "@/hooks/useFlameState";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToday, parseSafeDate } from "@/lib/dateUtils";
import { useHustlePoints } from "@/hooks/useHustlePoints";

import type { Exercise, WorkoutGroup, WorkoutLog, TrainingView } from "@/components/training/types";
import {
  initSetsData, formatTime, parseRestSeconds,
  calcVolume, calcVolumeFromJson,
} from "@/components/training/helpers";

const MAX_WORKOUT_SECONDS = 3 * 60 * 60;

/** Auto-icon based on exercise name */
const getExerciseIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("corrida") || n.includes("correr")) return "🏃";
  if (n.includes("caminhada") || n.includes("andar")) return "🚶";
  if (n.includes("bike") || n.includes("bicicleta") || n.includes("cicl")) return "🚴";
  if (n.includes("abdomin") || n.includes("prancha")) return "🧘";
  if (n.includes("along") || n.includes("mobili")) return "🤸";
  return "🏋️";
};

const Treinos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { awardPoints } = useHustlePoints();

  // ─── Restore execution state from localStorage ─────────────
  const getPersistedExecution = () => {
    try {
      const raw = safeGetItem("workout-execution-state");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.date !== getToday()) {
        safeRemoveItem("workout-execution-state");
        return null;
      }
      if (!Array.isArray(parsed.exercises)) return null;
      const allValid = parsed.exercises.every((ex: any) => ex && Array.isArray(ex.setsData));
      if (!allValid) {
        safeRemoveItem("workout-execution-state");
        return null;
      }
      return parsed as {
        date: string; view: TrainingView; selectedGroup: number;
        startedAt: string; exercises: Exercise[]; expandedExercise: number | null;
      };
    } catch { return null; }
  };

  const persisted = getPersistedExecution();

  const [view, setView] = useState<TrainingView>(persisted?.view === "execution" ? "execution" : "list");
  const [activeTab, setActiveTab] = useState<"treino" | "extra">("treino");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(persisted?.selectedGroup ?? null);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(persisted?.expandedExercise ?? null);
  const [exercises, setExercises] = useState<Exercise[]>(persisted?.exercises ?? []);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [effortRating, setEffortRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [startedAt, setStartedAt] = useState<string>(persisted?.startedAt ?? "");
  const [timerRunning, setTimerRunning] = useState(!!persisted?.startedAt && persisted?.view === "execution");
  const [restTimerData, setRestTimerData] = useState<{ seconds: number } | null>(null);
  const [setPickerData, setSetPickerData] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [swapData, setSwapData] = useState<{ exIdx: number; oldName: string; pattern: string | null } | null>(null);
  const [runningCapture, setRunningCapture] = useState<{ durationSecs: number; distanceKm: number } | null>(null);

  const { state: flameState, streak } = useFlameState();

  const [timer, setTimer] = useState(() => {
    if (persisted?.startedAt) {
      const startTime = parseSafeDate(persisted.startedAt).getTime();
      return Math.floor((Date.now() - startTime) / 1000);
    }
    return 0;
  });

  // ─── DB Queries ────────────────────────────────────────────
  const { data: plan } = useTrainingPlan();

  const { data: workoutHistory = [] } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("workouts").select("*")
        .eq("user_id", user.id).order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as WorkoutLog[];
    },
    enabled: !!user,
  });

  const exerciseLibrary: any[] = [];

  const exerciseLibMap = useMemo(() => {
    const map = new Map<string, { gif_url: string | null; instructions: string | null; muscle_group: string | null; equipment: string | null }>();
    for (const e of exerciseLibrary) {
      map.set((e as any).name?.toLowerCase?.() ?? '', {
        gif_url: (e as any).gif_url, instructions: (e as any).instructions,
        muscle_group: (e as any).muscle_group, equipment: (e as any).equipment
      });
    }
    return map;
  }, [exerciseLibrary]);

  const sessionsCompleted = workoutHistory.filter((w) => w.finished_at).length;

  const workoutGroups: WorkoutGroup[] = plan?.groups && Array.isArray(plan.groups)
    ? (plan.groups as unknown as WorkoutGroup[]).map(g => ({
      ...g,
      exercises: Array.isArray(g.exercises) 
        ? [...g.exercises].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
        : [],
    }))
    : [];
  const totalSessions = plan?.total_sessions ?? 50;

  // Save workout mutation
  const saveWorkout = useMutation({
    mutationFn: async (data: {
      exercises: Exercise[]; duration: number; effortRating: number | null;
      comment: string; groupName: string; startedAtOverride?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const rawStart = data.startedAtOverride || startedAt;
      // Safari-safe: ensure started_at is valid ISO
      const resolvedStart = rawStart ? parseSafeDate(rawStart).toISOString() : new Date().toISOString();
      const { data: existing } = await supabase.from("workouts").select("id")
        .eq("user_id", user.id).eq("started_at", resolvedStart).limit(1);
      if (existing && existing.length > 0) return;
      const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const finishedAt = new Date().toISOString();
      const planId = plan?.id && isValidUuid(plan.id) ? plan.id : null;
      const payload = {
        user_id: user.id, exercises: data.exercises as any,
        duration_seconds: data.duration, effort_rating: data.effortRating,
        comment: data.comment || null, group_name: data.groupName,
        training_plan_id: planId, started_at: resolvedStart,
        finished_at: finishedAt,
      };
      let { error } = await supabase.from("workouts").insert(payload);
      // If FK constraint fails (plan deleted/missing), retry without training_plan_id
      if (error?.code === "23503" && planId) {
        console.warn("[saveWorkout] FK violation on training_plan_id, retrying without it");
        ({ error } = await supabase.from("workouts").insert({ ...payload, training_plan_id: null }));
      }
      if (error) {
        console.error("[saveWorkout] Insert error:", error);
        throw error;
      }

      // Update flame_status streak in DB (freeze semantics: never reset)
      try {
        const todayStr = getToday();
        const { data: flame } = await supabase
          .from("flame_status")
          .select("streak, last_approved_date, state")
          .eq("user_id", user.id)
          .maybeSingle();

        if (flame) {
          if (flame.last_approved_date !== todayStr) {
            // New day approved: increment streak
            await supabase.from("flame_status").update({
              streak: (flame.streak || 0) + 1,
              last_approved_date: todayStr,
              state: "ativa",
              updated_at: new Date().toISOString(),
            }).eq("user_id", user.id);
          } else {
            // Same day, just ensure state is active
            if (flame.state !== "ativa") {
              await supabase.from("flame_status").update({
                state: "ativa",
                updated_at: new Date().toISOString(),
              }).eq("user_id", user.id);
            }
          }
        } else {
          // First ever workout — create flame_status
          await supabase.from("flame_status").insert({
            user_id: user.id,
            state: "ativa",
            streak: 1,
            last_approved_date: todayStr,
          });
        }
      } catch (flameErr) {
        console.error("[saveWorkout] Flame update error (non-fatal):", flameErr);
      }
    },
    onMutate: async () => {
      if (!user) return;
      const shouldIncrement = await shouldIncrementFlame(user.id);
      await queryClient.cancelQueries({ queryKey: ["flame-state", user.id] });
      await queryClient.cancelQueries({ queryKey: ["workout-history"] });
      const previousFlame = queryClient.getQueryData(["flame-state", user.id]) as any;
      
      // Double check: if cache already says active, don't increment again
      if (shouldIncrement && previousFlame?.state !== "ativa") {
        optimisticFlameUpdate(queryClient, user.id, { adherenceDelta: 40, forceActive: true, streakIncrement: true });
      } else {
        // Just update adherence without touching the streak
        optimisticFlameUpdate(queryClient, user.id, { adherenceDelta: 40, forceActive: true, streakIncrement: false });
      }
      return { previousFlame };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFlame && user) {
        queryClient.setQueryData(["flame-state", user.id], context.previousFlame);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      queryClient.invalidateQueries({ queryKey: ["real-performance"] });
      if (user) checkAndUpdateFlame(user.id);
      awardPoints({ action: "workout_complete" });
      if (user) triggerMilestonePost(user.id, "workout");
    },
  });

  // Community post mutation
  const publishToCommunity = useMutation({
    mutationFn: async ({ caption, imageBlob }: { caption: string; imageBlob?: Blob }) => {
      if (!user) throw new Error("Not authenticated");
      let mediaUrl: string | null = null;
      if (imageBlob) {
        const ext = "png"; // Standard for html2canvas or blobs
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community_media").upload(path, imageBlob);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("community_media").getPublicUrl(path);
        mediaUrl = publicUrl;
      }
      
      const finalCaption = (caption && caption.trim().length > 0) 
        ? caption.trim() 
        : "Finalizei meu treino hoje! 💪🔥";

      const { error } = await (supabase as any).from("community_posts").insert({
        user_id: user.id,
        content: finalCaption,
        image_url: mediaUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    }
  });

  // Timer effect
  useEffect(() => {
    if (!timerRunning || !startedAt) return;
    const startTime = parseSafeDate(startedAt).getTime();
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, startedAt]);

  // Auto-finalize after 3 hours
  useEffect(() => {
    if (!timerRunning || timer < MAX_WORKOUT_SECONDS || selectedGroup === null) return;
    const groupName = workoutGroups[selectedGroup]?.name ?? "Treino";
    setTimerRunning(false);
    saveWorkout.mutate({ exercises, duration: MAX_WORKOUT_SECONDS, effortRating: null, comment: "Finalizado automaticamente (3h)", groupName, startedAtOverride: startedAt });
    safeRemoveItem("workout-execution-state");
    safeRemoveItem(`workout-in-progress-${selectedGroup}`);
    toast.success("⏱️ Treino finalizado automaticamente após 3h!");
    setView("list");
    setSelectedGroup(null);
  }, [timer, timerRunning]);

  // Persist execution state
  useEffect(() => {
    if (view === "execution" && selectedGroup !== null && startedAt) {
      safeSetItem("workout-execution-state", JSON.stringify({ date: getToday(), view, selectedGroup, startedAt, exercises, expandedExercise }));
    } else if (view !== "execution") {
      safeRemoveItem("workout-execution-state");
    }
  }, [view, selectedGroup, startedAt, exercises, expandedExercise]);

  const getNextGroupIndex = useCallback(() => {
    if (workoutGroups.length === 0) return 0;
    const counts = workoutGroups.map((g) => workoutHistory.filter((w) => w.group_name === g.name && w.finished_at).length);
    return counts.indexOf(Math.min(...counts));
  }, [workoutGroups, workoutHistory]);

  const nextGroupIndex = getNextGroupIndex();

  const openGroup = (index: number) => {
    const group = workoutGroups[index];
    if (!group?.exercises || !Array.isArray(group.exercises) || group.exercises.length === 0) {
      toast.error("Este treino ainda não possui exercícios.");
      return;
    }
    const storageKey = `workout-in-progress-${index}`;
    try {
      const saved = safeGetItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === getToday() && parsed.exercises?.length === group.exercises.length) {
          setExercises(parsed.exercises); setSelectedGroup(index); setExpandedExercise(null); setView("detail"); return;
        }
      }
    } catch { }
    const groupExercises = Array.isArray(group.exercises) ? group.exercises : [];
    const exs = groupExercises.filter(ex => ex && ex.description !== '__section__').map((ex) => {
      const setsData = initSetsData(ex);
      const maxWeight = workoutHistory.reduce((max, w) => {
        const wExercises = Array.isArray(w.exercises) ? w.exercises : [];
        if (!wExercises) return max;
        for (const histEx of wExercises) {
          if (histEx && histEx.name === ex.name && Array.isArray(histEx.setsData)) {
            for (const s of histEx.setsData) { if (s && s.done && s.weight && s.weight > max) max = s.weight; }
          }
        }
        return max;
      }, 0);
      if (maxWeight > 0) setsData.forEach(s => { s.weight = maxWeight; });
      return { ...ex, setsData };
    });
    setExercises(exs); setSelectedGroup(index); setExpandedExercise(null); setView("detail");
  };

  useEffect(() => {
    if (selectedGroup === null || exercises.length === 0) return;
    if (view !== "detail" && view !== "execution") return;
    safeSetItem(`workout-in-progress-${selectedGroup}`, JSON.stringify({ date: getToday(), exercises }));
  }, [exercises, selectedGroup, view]);

  const startWorkout = () => {
    setView("execution"); setTimerRunning(true); setTimer(0);
    setStartedAt(new Date().toISOString()); setExpandedExercise(0);

  };

  const confirmSet = (exIdx: number, setIdx: number) => {
    const updated = [...exercises];
    const set = updated[exIdx].setsData[setIdx];
    if (set.weight === null || set.actualReps === null) { toast.error("Preencha carga e repetições"); return; }
    set.done = true;
    setExercises(updated);
    const hasMoreSets = updated[exIdx].setsData.some((s, i) => i > setIdx && !s.done) || updated.some((ex, i) => i > exIdx && ex.setsData.some(s => !s.done));
    if (hasMoreSets && view === "execution") {
      setRestTimerData({ seconds: parseRestSeconds(updated[exIdx].rest) });
    }
  };

  const completeExercise = (exIdx: number) => {
    const updated = [...exercises];
    updated[exIdx].setsData.forEach((s) => { if (!s.done) s.done = true; });
    setExercises(updated);
    if (exIdx < exercises.length - 1) setExpandedExercise(exIdx + 1);
    toast.success(`${exercises[exIdx].name} concluído!`);
  };

  const allExercisesDone = exercises.every((ex) => {
    const sData = Array.isArray(ex.setsData) ? ex.setsData : [];
    return sData.every((s) => s.done);
  });
  const hasIncomplete = exercises.some((ex) => {
     const sData = Array.isArray(ex.setsData) ? ex.setsData : [];
     return sData.some((s) => !s.done);
  });
  const completedSetsCount = exercises.reduce((acc, ex) => {
    const sData = Array.isArray(ex.setsData) ? ex.setsData : [];
    return acc + sData.filter((s) => s.done).length;
  }, 0);
  const totalSetsCount = exercises.reduce((acc, ex) => {
    const sData = Array.isArray(ex.setsData) ? ex.setsData : [];
    return acc + sData.length;
  }, 0);

  const handleFinishWorkout = () => { hasIncomplete ? setShowFinishDialog(true) : handleConclude(); };
  const finishWorkout = () => { setTimerRunning(false); setShowFinishDialog(false); handleConclude(); };

  const cancelWorkout = () => {
    setTimerRunning(false); setShowCancelDialog(false); setShowFinishDialog(false);
    if (selectedGroup !== null) safeRemoveItem(`workout-in-progress-${selectedGroup}`);
    safeRemoveItem("workout-execution-state");
    setView("list"); setSelectedGroup(null); setExercises([]); setTimer(0); setStartedAt(""); setEffortRating(null); setComment("");
    toast("Treino cancelado", { description: "Nenhum dado foi registrado." });
  };

  const handleConclude = async () => {
    if (selectedGroup === null) return;
    const groupName = workoutGroups[selectedGroup].name;
    try {
      await saveWorkout.mutateAsync({ exercises, duration: timer, effortRating: null, comment: "", groupName });
      toast.success("Treino registrado com sucesso!");

      safeRemoveItem(`workout-in-progress-${selectedGroup}`);
      safeRemoveItem("workout-execution-state");
      setView("share");
    } catch {
      toast.error("Erro ao salvar treino"); setView("list"); setSelectedGroup(null);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VIEW: HISTORY
  // ═══════════════════════════════════════════════════════════
  if (view === "history") {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-4 pt-2">
          <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={22} /></button>
          <h1 className="font-cinzel text-xl font-bold text-foreground">HISTÓRICO</h1>
        </div>
        {workoutHistory.length === 0 ? (
          <div className="text-center py-16"><History size={48} className="mx-auto text-muted-foreground/30 mb-4" /><p className="text-muted-foreground">Nenhum treino registrado ainda</p></div>
        ) : (
          <div className="space-y-3">
            {workoutHistory.map((w) => {
              const volume = calcVolumeFromJson(w.exercises);
              const dur = w.duration_seconds ?? 0;
              const date = parseSafeDate(w.started_at);
              return (
                <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-cinzel text-sm font-bold text-foreground">{w.group_name || "Treino"}</p>
                      <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} · {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {w.effort_rating && (<div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg"><Flame size={12} className="text-primary" /><span className="text-xs font-bold text-primary">{w.effort_rating}/10</span></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/50 rounded-lg p-2 text-center"><Clock size={14} className="mx-auto mb-0.5 text-muted-foreground" /><p className="text-[9px] text-muted-foreground">Duração</p><p className="text-xs font-bold text-foreground">{formatTime(dur)}</p></div>
                    <div className="bg-secondary/50 rounded-lg p-2 text-center"><Weight size={14} className="mx-auto mb-0.5 text-muted-foreground" /><p className="text-[9px] text-muted-foreground">Volume</p><p className="text-xs font-bold text-foreground">{volume > 0 ? `${(volume / 1000).toFixed(1)}t` : "—"}</p></div>
                  </div>
                  {w.comment && (<div className="mt-2 flex items-start gap-2 bg-secondary/30 rounded-lg p-2"><MessageSquare size={12} className="text-muted-foreground mt-0.5 shrink-0" /><p className="text-[11px] text-muted-foreground">{w.comment}</p></div>)}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW: LIST
  // ═══════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/aluno")} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={24} /></button>
            <div className="flex items-center gap-2"><Dumbbell size={20} className="text-accent" /><span className="font-cinzel font-bold text-foreground">SALA DE TREINOS</span></div>
          </div>
          <button onClick={() => setView("history")} className="flex items-center gap-1.5 bg-card/50 border border-border rounded-lg px-3 py-1.5 hover:border-accent/40 transition-colors">
            <History size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">Histórico</span>
          </button>
        </div>

        <div className="flex bg-secondary/50 p-1 rounded-xl mb-6">
          <button onClick={() => setActiveTab("treino")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "treino" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Treino</button>
          <button onClick={() => setActiveTab("extra")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "extra" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Corrida</button>
        </div>

        {!plan && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center border border-accent/20">
              <Dumbbell size={40} className="text-accent" />
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <p className="text-sm font-bold text-foreground leading-relaxed">
                Seu plano está sendo processado pela nossa equipe de especialistas. Em breve estará disponível.
              </p>
            </div>
          </motion.div>
        )}

        {plan && activeTab === "treino" && <div className="space-y-4 mb-4">
          {(plan.avaliacao_postural || plan.pontos_melhoria || plan.objetivo_mesociclo) && (
            <TrainingAnalysisCards avaliacaoPostural={plan.avaliacao_postural} pontosMelhoria={plan.pontos_melhoria} objetivoMesociclo={plan.objetivo_mesociclo} />
          )}

          <TrainingObjectiveCard />

          <div className="grid grid-cols-1 gap-4">
            {Array.isArray(workoutGroups) && workoutGroups.map((group, i) => {
              const today = new Date().getDay(); // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
              // Map calendar day to workout index: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
              // If Sat/Sun (6/0), default to Monday (0) or no highlight (-1).
              // For better UX during weekends, we can highlight Monday.
              const calendarDayIndex = today === 0 || today === 6 ? 0 : today - 1;
              const isNext = i === calendarDayIndex;
              const dayLabel = DAYS_OF_WEEK[i % DAYS_OF_WEEK.length];

              return (
                <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => openGroup(i)} 
                  className={`w-full flex items-stretch rounded-2xl bg-card border overflow-hidden transition-all relative shadow-md group ${isNext ? "border-primary/40 ring-1 ring-primary/10" : "border-border hover:border-primary/20"}`}
                >
                  {/* Red Sidebar - Screenshot Style */}
                  <div className="w-10 bg-primary/90 flex items-center justify-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] font-sans whitespace-nowrap -rotate-90 origin-center">
                      {dayLabel}
                    </p>
                  </div>

                  <div className="flex-1 flex items-center gap-4 p-4 pl-5 relative">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isNext ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      <Dumbbell size={20} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-foreground tracking-tight uppercase leading-tight">{group.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider opacity-60">
                        {group.exercises.length === 0 ? "⏳ Aguardando" : `${group.exercises.length} EXERCÍCIOS`}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all ${isNext ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20" : "bg-card border-border text-muted-foreground group-hover:border-primary/20"}`}>
                      <Play size={16} className="ml-0.5" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          {/* Sessions progress removed as per user request */}
        </div>}

        {plan && activeTab === "extra" && (
          <PlanilhaCorrida />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW: DETAIL (pre-execution)
  // ═══════════════════════════════════════════════════════════
  if (view === "detail" && selectedGroup !== null) {
    const group = workoutGroups[selectedGroup];
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-4 pt-2">
          <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={22} /></button>
          <h1 className="font-cinzel text-xl font-bold text-foreground">TREINOS</h1>
        </div>
        <div className="crimson-gradient rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="font-cinzel font-bold text-primary-foreground text-sm tracking-wide">{group.name}</span>
          <div className="w-7 h-7 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center shrink-0"><ChevronDown size={14} className="text-primary-foreground/60" /></div>
        </div>
        <div className="space-y-2 mb-6">
          {exercises.map((ex, i) => {
            if (ex.description === '__section__') return (<div key={i} className="pt-4 pb-1 px-1"><p className="text-xs font-black text-accent uppercase tracking-[0.2em]">{ex.name.replace(/🏋️\s?/, '')}</p><div className="h-px bg-accent/20 mt-1" /></div>);
            const isExpanded = expandedExercise === i;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-secondary/50 border border-border rounded-xl overflow-hidden">
                <button onClick={() => setExpandedExercise(isExpanded ? null : i)} className="w-full flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {(ex as any).freeText ? <FileText size={16} className="text-[hsl(var(--gold))]" /> : <span className="text-base">{getExerciseIcon(ex.name)}</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground text-left flex-1">{(ex as any).freeText ? "Instrução do Preparador" : ex.name}</p>
                  <div className={`w-7 h-7 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}><ChevronDown size={14} className="text-muted-foreground" /></div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-4 space-y-3">
                        {ex.freeText ? (
                          <div className="bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)] rounded-lg p-3 shadow-inner">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare size={12} className="text-[hsl(var(--gold))]" />
                              <span className="text-[10px] font-bold text-[hsl(var(--gold))] uppercase tracking-wider">Nota do Treinador</span>
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{ex.description || "Sem instruções específicas para este bloco."}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-card rounded-lg p-3 border border-border text-center"><RefreshCw size={18} className="mx-auto mb-1 text-muted-foreground" /><p className="text-[10px] text-muted-foreground">Repetições</p><p className="text-sm font-bold text-foreground">{ex.reps}</p></div>
                              <div className="bg-card rounded-lg p-3 border border-border text-center"><Weight size={18} className="mx-auto mb-1 text-muted-foreground" /><p className="text-[10px] text-muted-foreground">Carga</p><p className="text-sm font-bold text-foreground">{ex.setsData?.[0]?.weight ?? ex.weight ?? "—"}</p></div>
                              <div className="bg-card rounded-lg p-3 border border-border text-center"><Clock size={18} className="mx-auto mb-1 text-muted-foreground" /><p className="text-[10px] text-muted-foreground">Intervalo</p><p className="text-sm font-bold text-foreground">{ex.rest}</p></div>
                            </div>
                            {ex.description && (
                              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-left">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm">💡</span>
                                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Dica do Treinador</span>
                                </div>
                                <p className="text-xs text-foreground/80 leading-snug whitespace-pre-wrap">{ex.description.replace(/ • /g, '\n')}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startWorkout} className="w-full py-4 crimson-gradient text-primary-foreground font-cinzel font-bold text-lg rounded-xl crimson-shadow tracking-wider">Iniciar treino</motion.button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW: EXECUTION
  // ═══════════════════════════════════════════════════════════
  if (view === "execution" && selectedGroup !== null) {
    const group = workoutGroups[selectedGroup];
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <AnimatePresence>{restTimerData && (<RestTimer seconds={restTimerData.seconds} onDone={() => setRestTimerData(null)} onSkip={() => setRestTimerData(null)} />)}</AnimatePresence>
        <div className="flex items-center justify-between mb-3 pt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFinishDialog(true)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={22} /></button>
            <div><p className="font-cinzel text-sm font-bold text-foreground">EXECUÇÃO</p><p className="text-[10px] text-muted-foreground">{group.name}</p></div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5"><Timer size={14} className="text-primary" /><span className="font-cinzel text-sm font-bold text-foreground tabular-nums">{formatTime(timer)}</span></div>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-muted-foreground">{completedSetsCount}/{totalSetsCount} séries</span><span className="text-[10px] text-muted-foreground">{totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0}%</span></div>
          <Progress value={totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0} className="h-2" />
        </div>
        <div className="crimson-gradient rounded-xl p-3 mb-4 flex items-center justify-between"><span className="font-cinzel font-bold text-primary-foreground text-sm">{group.name}</span></div>
        <div className="space-y-2 mb-6">
          {exercises.map((ex, exIdx) => {
            if (ex.description === '__section__') return (<div key={exIdx} className="pt-4 pb-1 px-1"><p className="text-xs font-black text-accent uppercase tracking-[0.2em]">{ex.name.replace(/🏋️\s?/, '')}</p><div className="h-px bg-accent/20 mt-1" /></div>);
            const isExpanded = expandedExercise === exIdx;
            const isFreeText = (ex as any).freeText;
            const doneCount = ex.setsData.filter((s) => s.done).length;
            const allDone = isFreeText ? (ex as any)._freeTextDone : doneCount === ex.setsData.length;
            return (
              <motion.div key={exIdx} className={`rounded-xl border overflow-hidden transition-all ${allDone ? "bg-accent/5 border-accent/30" : "bg-secondary/50 border-border"}`}>
                <button onClick={() => setExpandedExercise(isExpanded ? null : exIdx)} className="w-full flex items-center gap-3 p-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${allDone ? "gold-gradient" : "bg-secondary"}`}>
                    {allDone ? <Check size={16} className="text-accent-foreground" /> : isFreeText ? <FileText size={16} className="text-[hsl(var(--gold))]" /> : <Dumbbell size={16} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${allDone ? "text-accent line-through" : "text-foreground"}`}>{isFreeText ? "Instrução do Preparador" : ex.name}</p>
                    {!isFreeText && <p className="text-xs text-muted-foreground">{doneCount}/{ex.setsData.length} séries</p>}
                  </div>
                  {!allDone && !isFreeText && (
                    <button onClick={(e) => { e.stopPropagation(); const libData = exerciseLibMap.get(ex.name.toLowerCase()); setSwapData({ exIdx, oldName: ex.name, pattern: libData?.muscle_group || null }); }}
                      className="w-10 h-10 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center shrink-0 hover:border-primary/50 transition-colors"><RefreshCw size={14} className="text-primary" /></button>
                  )}
                  <div className={`w-7 h-7 rounded-lg bg-secondary/80 border border-border/50 flex items-center justify-center transition-transform duration-300 shrink-0 ${isExpanded ? "rotate-180" : ""}`}><ChevronDown size={14} className="text-muted-foreground" /></div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2">
                        {isFreeText ? (
                          <>
                            <div className="bg-[hsl(var(--gold)/0.08)] border border-[hsl(var(--gold)/0.2)] rounded-lg p-3 shadow-inner">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={12} className="text-[hsl(var(--gold))]" />
                                <span className="text-[10px] font-bold text-[hsl(var(--gold))] uppercase tracking-wider">Instrução</span>
                              </div>
                              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{ex.description || "Siga as orientações acima."}</p>
                            </div>
                            {!(ex as any)._freeTextDone && (
                              <button onClick={() => { const updated = [...exercises]; updated[exIdx] = { ...updated[exIdx], _freeTextDone: true } as any; setExercises(updated); if (exIdx < exercises.length - 1) setExpandedExercise(exIdx + 1); toast.success("Nota lida!"); }}
                                className="w-full py-3 rounded-xl gold-gradient text-[hsl(var(--obsidian))] text-xs font-bold uppercase tracking-widest shadow-lg shadow-gold/20 flex items-center justify-center gap-2">
                                <Check size={14} /> Marcar como lido
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {ex.description && (
                              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-3 text-left">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm">💡</span>
                                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Dica do Treinador</span>
                                </div>
                                <p className="text-xs text-foreground/80 leading-snug whitespace-pre-wrap">{ex.description.replace(/ • /g, '\n')}</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 px-1">
                              <span><Clock size={12} className="inline mr-1" /> Intervalo: <strong className="text-foreground">{ex.rest}</strong></span>
                              <span>Meta: <strong className="text-foreground">{ex.reps} reps</strong></span>
                            </div>
                            <div className="space-y-1.5 mt-2">
                              <div className="grid grid-cols-[1fr_3fr_3fr_2fr] gap-2 text-[9px] text-muted-foreground uppercase tracking-wider px-1"><span>Série</span><span>Carga (kg)</span><span>Reps</span><span></span></div>
                              {ex.setsData.map((set, setIdx) => (
                                <div key={setIdx} className={`grid grid-cols-[1fr_3fr_3fr_2fr] gap-2 items-center p-1.5 rounded-lg ${set.done ? "bg-accent/10" : "bg-card/50"}`}>
                                  <span className="text-xs font-semibold text-muted-foreground text-center">{setIdx + 1}</span>
                                  <button type="button" onClick={() => { if (set.done) { const updated = [...exercises]; updated[exIdx].setsData[setIdx] = { ...set, done: false }; setExercises(updated); } setSetPickerData({ exIdx, setIdx }); }}
                                    className="h-8 rounded-md border border-border bg-background text-xs font-bold text-foreground text-center">{set.weight ?? "—"}</button>
                                  <button type="button" onClick={() => { if (set.done) { const updated = [...exercises]; updated[exIdx].setsData[setIdx] = { ...set, done: false }; setExercises(updated); } setSetPickerData({ exIdx, setIdx }); }}
                                    className="h-8 rounded-md border border-border bg-background text-xs font-bold text-foreground text-center">{set.actualReps ?? "—"}</button>
                                  {set.done ? (
                                    <button onClick={() => { const updated = [...exercises]; updated[exIdx].setsData[setIdx] = { ...set, done: false }; setExercises(updated); toast("Série reaberta para edição", { icon: "✏️" }); }}
                                      className="flex justify-center h-8 items-center"><Check size={14} className="text-accent" /></button>
                                  ) : (
                                    <button onClick={() => { set.weight === null || set.actualReps === null ? setSetPickerData({ exIdx, setIdx }) : confirmSet(exIdx, setIdx); }}
                                      className="h-8 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold transition-colors">OK</button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {!allDone && (<button onClick={() => completeExercise(exIdx)} className="w-full py-2.5 mt-2 crimson-gradient text-primary-foreground font-cinzel text-sm font-bold rounded-lg">Concluir exercício</button>)}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleFinishWorkout}
          className={`w-full py-4 font-cinzel font-bold text-lg rounded-xl tracking-wider ${allExercisesDone ? "crimson-gradient text-primary-foreground crimson-shadow" : "bg-card border border-border text-foreground"}`}>Finalizar treino</motion.button>

        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle size={20} className="text-destructive" /></div><AlertDialogTitle className="font-cinzel text-foreground">Encerrar treino?</AlertDialogTitle></div>
              <AlertDialogDescription className="text-muted-foreground">Você completou <span className="font-bold text-foreground">{completedSetsCount}/{totalSetsCount}</span> séries. Os exercícios não finalizados não serão contabilizados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogCancel className="bg-secondary text-foreground border-border">Continuar treinando</AlertDialogCancel>
              <AlertDialogAction onClick={finishWorkout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Encerrar e salvar treino</AlertDialogAction>
              <button onClick={() => { setShowFinishDialog(false); setShowCancelDialog(true); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors py-2">Cancelar treino (não salvar)</button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="bg-card border-border max-w-sm">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-1"><div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><X size={20} className="text-destructive" /></div><AlertDialogTitle className="font-cinzel text-foreground">Cancelar treino?</AlertDialogTitle></div>
              <AlertDialogDescription className="text-muted-foreground">Todo o progresso será descartado e <span className="font-bold text-foreground">nada será registrado</span>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-secondary text-foreground border-border">Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={cancelWorkout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, cancelar treino</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {setPickerData && (
          <SetInputPicker 
            open={!!setPickerData} 
            onClose={() => setSetPickerData(null)}
            initialReps={exercises[setPickerData.exIdx]?.setsData?.[setPickerData.setIdx]?.actualReps}
            initialWeight={exercises[setPickerData.exIdx]?.setsData?.[setPickerData.setIdx]?.weight}
            targetReps={exercises[setPickerData.exIdx]?.reps || "10"}
            onSave={(reps, weight) => { 
                const updated = [...exercises]; 
                if (updated[setPickerData.exIdx]?.setsData?.[setPickerData.setIdx]) {
                  updated[setPickerData.exIdx].setsData[setPickerData.setIdx].actualReps = reps; 
                  updated[setPickerData.exIdx].setsData[setPickerData.setIdx].weight = weight; 
                }
                setExercises(updated); 
                setSetPickerData(null); 
            }} 
          />
        )}

        <Drawer open={!!swapData} onOpenChange={(v) => !v && setSwapData(null)}>
          <DrawerContent className="bg-card border-border">
            <DrawerHeader><DrawerTitle className="font-cinzel text-center text-foreground">Trocar Exercício</DrawerTitle></DrawerHeader>
            <div className="p-4 pb-12 overflow-y-auto max-h-[60vh]">
              {!swapData?.pattern ? (
                <div className="text-center text-muted-foreground py-6 flex flex-col items-center"><AlertTriangle size={32} className="mb-2 text-muted-foreground/50" /><p className="text-sm">Nenhuma equivalência configurada.</p></div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4">Selecione uma alternativa.</p>
                  {(exerciseLibrary as any[]).filter((e: any) => e.muscle_group === swapData.pattern && e.name !== swapData.oldName).map((sub, i) => (
                    <button key={i} onClick={() => { if (swapData) { const updated = [...exercises]; const ex = updated[swapData.exIdx]; ex.name = (sub as any).name; (ex as any).gif_url = (sub as any).gif_url; (ex as any).instructions = (sub as any).instructions; setExercises(updated); toast.success(`Substituído por ${(sub as any).name}!`, { icon: "🔄" }); setSwapData(null); } }}
                      className="w-full text-left bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-3 flex items-center gap-3 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                        {(sub as any).gif_url ? <img src={(sub as any).gif_url} alt="" className="w-8 h-8 object-contain rounded-md" /> : <Dumbbell size={16} className="text-muted-foreground" />}
                      </div>
                      <div className="flex-1"><p className="text-sm font-semibold text-foreground">{(sub as any).name}</p><p className="text-xs text-muted-foreground">{(sub as any).equipment || "Padrão"}</p></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }



  // ═══════════════════════════════════════════════════════════
  // VIEW: SHARE (Victory Card)
  // ═══════════════════════════════════════════════════════════
  if (view === "share") {
    if (runningCapture) {
      return (
        <VictoryCard
          groupName="Corrida"
          duration={runningCapture.durationSecs}
          completedSets={1}
          totalSets={1}
          volume={0}
          isRunning={true}
          runDistance={runningCapture.distanceKm}
          streak={streak}
          onPublishToCommunity={(caption, imageBlob) => publishToCommunity.mutate({ caption, imageBlob })}
          onDismiss={() => { setView("list"); setRunningCapture(null); }}
        />
      );
    }
    const volume = calcVolume(exercises);
    const groupName = selectedGroup !== null ? workoutGroups[selectedGroup]?.name ?? "Treino" : "Treino";
    return (
      <VictoryCard
        groupName={groupName}
        duration={timer}
        completedSets={completedSetsCount}
        totalSets={totalSetsCount}
        volume={volume}
        streak={streak}
        onPublishToCommunity={(caption, imageBlob) => publishToCommunity.mutate({ caption, imageBlob })}
        onDismiss={() => { setView("list"); setSelectedGroup(null); }}
      />
    );
  }

return null;
};

// Wrap in ErrorBoundary for Safari crash resilience
import { ErrorBoundary } from "@/components/ErrorBoundary";

const TreinosWithBoundary = () => (
  <ErrorBoundary>
    <Treinos />
  </ErrorBoundary>
);

export default TreinosWithBoundary;
