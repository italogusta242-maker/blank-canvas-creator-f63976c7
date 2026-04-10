import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, parseSafeDate } from "@/lib/dateUtils";
import { useDailyHabitsRange } from "@/hooks/useDailyHabits";
import { getGoalsForUser, getPhase } from "@/lib/progressiveGoals";

// ── Muscle group mapping by keyword ──
const muscleGroupKeywords: Record<string, string[]> = {
  Peito: ["supino", "crucifixo", "crossover", "peck", "fly"],
  Costas: ["puxada", "remada", "pulldown", "serrote", "pull up", "barra fixa", "graviton"],
  Ombro: ["desenvolvimento", "elevação lateral", "face pull", "arnold", "militar", "ombro"],
  Bíceps: ["rosca", "bíceps", "biceps", "scott"],
  Tríceps: ["tríceps", "triceps", "testa", "francês", "polia"],
  Trapézio: ["trapézio", "encolhimento"],
  Antebraço: ["antebraço", "wrist"],
  Quadríceps: ["agachamento", "leg press", "leg 45", "extensora", "hack", "búlgaro", "passada", "afundo"],
  Posterior: ["mesa flexora", "cadeira flexora", "stiff", "romeno", "posterior"],
  Glúteos: ["abdutora", "glúteo", "hip thrust", "elevação pélvica"],
  Panturrilha: ["panturrilha", "gêmeos"],
  Abdômen: ["abdominal", "crunch", "prancha"],
  Core: ["core", "lombar"],
};

export function mapExerciseToGroup(name: string): string {
  const lower = name.toLowerCase();
  for (const [group, keywords] of Object.entries(muscleGroupKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) return group;
  }
  return "Outro";
}

// ── Types ──
export interface VolumeEntry {
  grupo: string;
  series: number;
  regiao: "superior" | "inferior";
}

export interface DayPerformance {
  day: string;
  date: string;
  score: number;
  training: number;
  diet: number;
  water?: number;
  sleep?: number;
  dailyGoals: number;
  groupName?: string;
  setsCompleted?: number;
  totalSets?: number;
  mealsCompleted?: number;
  totalMeals?: number;
  waterLiters?: number;
  sleepHours?: number;
}

const regionMap: Record<string, "superior" | "inferior"> = {
  Peito: "superior", Costas: "superior", Ombro: "superior",
  Bíceps: "superior", Tríceps: "superior", Trapézio: "superior", Antebraço: "superior",
  Quadríceps: "inferior", Posterior: "inferior", Glúteos: "inferior",
  Panturrilha: "inferior", Abdômen: "inferior", Core: "inferior",
};

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Helper: compute training score for a set of workouts
function calcTrainingForDay(workouts: any[], workoutMaxPoints: number = 40): { score: number; setsCompleted: number; totalSets: number; groupName: string } {
  let totalSets = 0;
  let doneSets = 0;
  let groupName = "";
  for (const w of workouts) {
    if (w.group_name) groupName = w.group_name;
    const exercises = w.exercises as any[];
    if (!exercises) continue;
    for (const ex of exercises) {
      const sets = ex.setsData || [];
      totalSets += sets.length;
      doneSets += sets.filter((s: any) => s.done).length;
    }
  }
  let score = 0;
  if (workouts.length > 0 && totalSets > 0) {
    score = Math.round((doneSets / totalSets) * workoutMaxPoints);
    if (score < 10 && workouts.length > 0) score = 10;
  }
  return { score, setsCompleted: doneSets, totalSets, groupName };
}

// ── Auto-detected goal keys that should not be double-counted from completed_goals ──
const AUTO_GOAL_KEYS = new Set(["agua", "treino", "sono"]);

/**
 * Calculate daily goals score with deduplication and proportional math.
 * 
 * Auto-detected goals (água, treino, sono) are counted from thresholds.
 * Manual goals from completed_goals are counted ONLY if they are NOT auto-detected keys,
 * OR if the auto threshold was NOT met (allowing manual override).
 */
function calcDailyGoalsScore(
  waterLiters: number,
  waterGoal: number,
  trainingScore: number,
  sleepHours: number,
  sleepGoal: number,
  completedGoals: string[],
  totalExpectedGoals: number,
): number {
  const uniqueCompleted = new Set<string>();

  // Auto-detected goals
  if (waterLiters >= waterGoal) uniqueCompleted.add("agua");
  if (trainingScore > 0) uniqueCompleted.add("treino");
  if (sleepHours >= sleepGoal) uniqueCompleted.add("sono");

  // Manual goals from DB — skip if already auto-detected
  for (const key of completedGoals) {
    if (AUTO_GOAL_KEYS.has(key) && uniqueCompleted.has(key)) continue;
    uniqueCompleted.add(key);
  }

  const safeTotal = Math.max(1, totalExpectedGoals);
  return Math.round(Math.min(20, (uniqueCompleted.size / safeTotal) * 20));
}

export const useRealPerformance = () => {
  const { user } = useAuth();
  const today = toLocalDate(new Date());
  const { data: habitsRange = [] } = useDailyHabitsRange(30);

  // Fetch active challenge scoring rules
  const { data: activeChallenge } = useQuery({
    queryKey: ["active-challenge-scoring"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("scoring_rules")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const scoringRules = useMemo(() => {
    return { workout: 40, diet: 40, dailyGoals: 20 };
  }, []);

  // Fetch workouts from this week (for volume)
  const { data: weekWorkouts } = useQuery({
    queryKey: ["week-workouts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("workouts")
        .select("started_at, exercises, group_name")
        .eq("user_id", user.id)
        .gte("started_at", getWeekStart())
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-performance", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('id, full_name, status, planner_type').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // ── NEW: Fetch active diet plan to get real meal count ──
  const { data: activeDietPlan } = useQuery({
    queryKey: ["active-diet-plan-meals", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("diet_plans")
        .select("meals")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour — diet plan changes rarely
  });

  // Dynamic total meals from the student's real diet plan
  const expectedTotalMeals = useMemo(() => {
    if (!activeDietPlan?.meals) return 0; // no plan → will use fallback logic
    try {
      const meals = activeDietPlan.meals as any[];
      return Array.isArray(meals) ? meals.length : 0;
    } catch {
      return 0;
    }
  }, [activeDietPlan]);

  // Fetch workouts from last 30 days (for chart)
  const { data: last30Workouts } = useQuery({
    queryKey: ["last30-workouts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("workouts")
        .select("started_at, exercises, group_name")
        .eq("user_id", user.id)
        .gte("started_at", getNDaysAgo(30))
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });

  // Fetch checkins from last 30 days
  const { data: last30Checkins } = useQuery({
    queryKey: ["last30-checkins", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("psych_checkins")
        .select("created_at, sleep_hours, sleep_quality, mood, stress")
        .eq("user_id", user.id)
        .gte("created_at", getNDaysAgo(30))
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch today's training plan
  const { data: activePlan } = useQuery({
    queryKey: ["active-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("training_plans")
        .select("groups")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });

  // Today's checkin
  const todayCheckin = (last30Checkins ?? []).find(
    (c) => toLocalDate(parseSafeDate(c.created_at)) === today
  );

  // ── Helper ──
  const workoutLocalDate = (w: { started_at: string | null }) => {
    if (!w.started_at) return "";
    return toLocalDate(parseSafeDate(w.started_at));
  };

  // Get planner config for daily goals total
  const plannerType = profile?.planner_type ?? undefined;
  // We don't have planDaysElapsed here — use a safe default (phase 1 = 8 goals)
  // This is fine because all phases have 8 goals in the matrix
  const plannerConfig = useMemo(() => getGoalsForUser(plannerType, 1), [plannerType]);
  const totalExpectedGoals = plannerConfig.goals.length; // typically 8
  const waterGoalFromPlanner = plannerConfig.waterGoal;
  const sleepGoalFromPlanner = plannerConfig.sleepGoal;

  // ── Calculate today's scores ──
  const todayWorkouts = (weekWorkouts ?? []).filter(
    (w) => workoutLocalDate(w) === today
  );

  const todayTraining = calcTrainingForDay(todayWorkouts, 40);
  const trainingScore = todayTraining.score;

  const todayHabits = habitsRange.find((h) => h.date === today);

  // ── FIXED: Dynamic diet score using real meal count ──
  const dietScore = (() => {
    const mealsCompleted = todayHabits?.completed_meals?.length ?? 0;
    // Use real plan count; fallback to completed count (so 4/4 = 100%) or 1 to avoid /0
    const divisor = expectedTotalMeals > 0
      ? expectedTotalMeals
      : Math.max(mealsCompleted, 1);
    return Math.min(40, Math.round((mealsCompleted / divisor) * 40));
  })();

  // ── FIXED: Daily Goals with deduplication and proportional math ──
  const { waterScore, sleepScore, dailyGoalsScore } = (() => {
    const wScore = Math.round(Math.min((todayHabits?.water_liters ?? 0) / waterGoalFromPlanner, 1) * 10);
    const sScore = Math.round(Math.min((todayCheckin?.sleep_hours ?? 0) / sleepGoalFromPlanner, 1) * 10);

    const completedGoals = Array.isArray(todayHabits?.completed_goals) ? todayHabits!.completed_goals as string[] : [];

    const dgs = calcDailyGoalsScore(
      todayHabits?.water_liters ?? 0,
      waterGoalFromPlanner,
      trainingScore,
      todayCheckin?.sleep_hours ? Number(todayCheckin.sleep_hours) : 0,
      sleepGoalFromPlanner,
      completedGoals,
      totalExpectedGoals,
    );

    return { waterScore: wScore, sleepScore: sScore, dailyGoalsScore: dgs };
  })();

  const performanceScore = Math.min(100, trainingScore + dietScore + dailyGoalsScore);

  // ── Volume Semanal ──
  const volumeDetalhado: VolumeEntry[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of weekWorkouts ?? []) {
      const exercises = w.exercises as any[];
      if (!exercises) continue;
      for (const ex of exercises) {
        const group = mapExerciseToGroup(ex.name || "");
        if (group === "Outro") continue;
        const sets = ex.setsData || [];
        const doneSets = sets.filter((s: any) => s.done).length;
        counts[group] = (counts[group] || 0) + doneSets;
      }
    }
    return Object.keys(regionMap).map((grupo) => ({
      grupo,
      series: counts[grupo] || 0,
      regiao: regionMap[grupo],
    }));
  }, [weekWorkouts]);

  const volumeResumido = useMemo(() => [
    {
      grupo: "Superior",
      series: volumeDetalhado.filter((v) => v.regiao === "superior").reduce((s, v) => s + v.series, 0),
      total: volumeDetalhado.filter((v) => v.regiao === "superior").length,
    },
    {
      grupo: "Inferior",
      series: volumeDetalhado.filter((v) => v.regiao === "inferior").reduce((s, v) => s + v.series, 0),
      total: volumeDetalhado.filter((v) => v.regiao === "inferior").length,
    },
  ], [volumeDetalhado]);

  // ── Build performance data for N days ──
  const buildPerformanceData = useCallback((numDays: number): DayPerformance[] => {
    const now = new Date();
    const days: DayPerformance[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDate(d);
      const dayLabel = dayLabels[d.getDay()];

      const dayWorkouts = (last30Workouts ?? []).filter((w) => workoutLocalDate(w) === dateStr);
      const dayCheckin = (last30Checkins ?? []).find(
        (c) => toLocalDate(parseSafeDate(c.created_at)) === dateStr
      );

      const training = calcTrainingForDay(dayWorkouts, 40);

      // Diet & Water from database
      const dayHabits = habitsRange.find((h) => h.date === dateStr);
      let mealsCompleted = 0;
      if (dayHabits?.completed_meals) {
        mealsCompleted = dayHabits.completed_meals.length;
      }
      // FIXED: use dynamic meal count
      const mealDivisor = expectedTotalMeals > 0
        ? expectedTotalMeals
        : Math.max(mealsCompleted, 1);
      const dietPts = Math.min(40, Math.round((mealsCompleted / mealDivisor) * 40));

      let waterLiters = 0;
      let waterPts = 0;
      if (dayHabits?.water_liters) {
        waterLiters = Number(dayHabits.water_liters);
        waterPts = Math.round(Math.min(waterLiters / 3, 1) * 10);
      }

      const sleepHours = dayCheckin?.sleep_hours ? Number(dayCheckin.sleep_hours) : 0;
      const sleepPts = Math.round(Math.min(sleepHours / 8, 1) * 10);

      // FIXED: Daily Goals with deduplication & proportional math
      const completedGoals = Array.isArray(dayHabits?.completed_goals) ? dayHabits!.completed_goals as string[] : [];
      const dailyGoalsPts = calcDailyGoalsScore(
        waterLiters,
        waterGoalFromPlanner,
        training.score,
        sleepHours,
        sleepGoalFromPlanner,
        completedGoals,
        totalExpectedGoals,
      );

      const score = Math.min(100, training.score + dietPts + dailyGoalsPts);

      days.push({
        day: numDays <= 7 ? dayLabel : `${d.getDate()}/${d.getMonth() + 1}`,
        date: dateStr,
        score,
        training: training.score,
        diet: dietPts,
        dailyGoals: dailyGoalsPts,
        water: waterPts,
        sleep: sleepPts,
        groupName: training.groupName || undefined,
        setsCompleted: training.setsCompleted,
        totalSets: training.totalSets,
        mealsCompleted,
        totalMeals: mealDivisor,
        waterLiters,
        sleepHours,
      });
    }

    return days;
  }, [last30Workouts, last30Checkins, habitsRange, expectedTotalMeals, totalExpectedGoals, waterGoalFromPlanner, sleepGoalFromPlanner]);

  const performanceData = useMemo(() => buildPerformanceData(7), [buildPerformanceData]);
  const performanceData30 = useMemo(() => buildPerformanceData(30), [buildPerformanceData]);

  // ── Today's schedule from real plan ──
  const todaySchedule = (() => {
    if (!activePlan) return { name: "Sem plano", duration: null };
    const groups = activePlan.groups as any[];
    if (!groups || groups.length === 0) return { name: "Sem plano", duration: null };

    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0) return { name: "Descanso", duration: null };

    const groupIndex = (dayOfWeek - 1) % groups.length;
    if (dayOfWeek - 1 >= groups.length) return { name: "Descanso", duration: null };

    const group = groups[groupIndex];
    return { name: group?.name || "Treino", duration: null };
  })();

  const hasTrainingPlan = !!activePlan;

  return {
    trainingScore,
    dietScore,
    waterScore,
    sleepScore,
    performanceScore,
    volumeDetalhado,
    volumeResumido,
    performanceData,
    performanceData30,
    todaySchedule,
    hasTrainingPlan,
    todayWorkouts,
    todayCheckin,
    expectedTotalMeals: expectedTotalMeals > 0 ? expectedTotalMeals : undefined,
  };
};
