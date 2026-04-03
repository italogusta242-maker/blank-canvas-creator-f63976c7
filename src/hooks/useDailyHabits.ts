import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getToday } from "@/lib/dateUtils";
import { optimisticFlameUpdate } from "@/lib/flameOptimistic";
import { checkAndUpdateFlame, triggerMilestonePost } from "@/lib/flameMotor";
import { onMealToggle } from "@/lib/coachNotifications";
import { MOCK_HABITS } from "@/lib/mockData";
import { useHustlePoints } from "./useHustlePoints";

export interface DailyHabit {
  id: string;
  user_id: string;
  date: string;
  water_liters: number;
  completed_meals: string[];
  completed_goals: string[];
}

export function useDailyHabits(date?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { awardPoints } = useHustlePoints();
  const targetDate = date || getToday();
  const isMock = localStorage.getItem("USE_MOCK") === "true";

  const { data: habits, isLoading } = useQuery({
    queryKey: ["daily-habits", user?.id, targetDate],
    queryFn: async () => {
      if (isMock) {
        return {
          id: "mock-habit",
          user_id: user?.id || "mock-user",
          date: targetDate,
          water_liters: 2.5,
          completed_meals: MOCK_HABITS.filter(h => h.completado).map(h => h.id)
        } as DailyHabit;
      }
      if (!user) return null;
        const { data, error } = await supabase
          .from("daily_habits")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", targetDate)
          .maybeSingle();
        if (error) throw error;
        
        // Ensure completed_goals is always an array
        if (data) {
          data.completed_goals = Array.isArray(data.completed_goals) ? data.completed_goals : [];
        }
        
        return data as DailyHabit | null;
      },
    enabled: !!user || isMock,
  });

  const upsertHabits = useMutation({
    mutationFn: async (updates: { water_liters?: number; completed_meals?: string[]; completed_goals?: string[] }) => {
      if (isMock) return;
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        date: targetDate,
        ...updates,
      };

      const { error } = await supabase
        .from("daily_habits")
        .upsert(payload, { onConflict: "user_id,date" });

      if (error) throw error;
      await checkAndUpdateFlame(user.id);
    },
    onMutate: async () => {
      if (isMock) return;
      await queryClient.cancelQueries({ queryKey: ["flame-state", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["daily-habits", user?.id, targetDate] });
      const previousHabits = queryClient.getQueryData(["daily-habits", user?.id, targetDate]);
      return { previousHabits };
    },
    onError: (_err, _vars, context) => {
      if (isMock) return;
      if (context?.previousHabits) {
        queryClient.setQueryData(["daily-habits", user?.id, targetDate], context.previousHabits);
      }
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["real-performance", user.id] });
      }
    },
  });


  const setWater = (liters: number) => {
    const clamped = Math.max(0, Math.min(10, liters));
    const oldWater = habits?.water_liters ?? 0;
    const newHabit = {
      ...(habits || { id: "", user_id: user?.id || "", date: targetDate, completed_meals: [] as string[] }),
      water_liters: clamped,
    };

    queryClient.setQueryData(["daily-habits", user?.id, targetDate], () => newHabit);

    queryClient.setQueryData(
      ["daily-habits-range", user?.id, 30],
      (old: DailyHabit[] | undefined) => {
        if (!old) return old;
        const exists = old.some(h => h.date === targetDate);
        if (exists) {
          return old.map(h => h.date === targetDate ? newHabit : h);
        }
        return [...old, newHabit];
      }
    );

    if (user && !isMock) {
      const oldScore = Math.round(Math.min(oldWater / 2.5, 1) * 10);
      const newScore = Math.round(Math.min(clamped / 2.5, 1) * 10);
      optimisticFlameUpdate(queryClient, user.id, { adherenceDelta: newScore - oldScore });
      upsertHabits.mutate({ water_liters: clamped, completed_meals: habits?.completed_meals || [] });

      // Award Hustle Points for hitting water goal
      if (clamped >= 2.5 && oldWater < 2.5) {
        awardPoints({ action: "habit_water" });
      }
    }
  };

  const toggleMeal = (mealId: string, totalMeals?: number) => {
    const current = habits?.completed_meals || [];
    const isRemoving = current.includes(mealId);
    const next = isRemoving
      ? current.filter((id) => id !== mealId)
      : [...current, mealId];

    queryClient.setQueryData(
      ["daily-habits", user?.id, targetDate],
      (old: DailyHabit | null) => ({
        ...(old || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0 }),
        completed_meals: next,
      })
    );
    
    queryClient.setQueryData(
      ["daily-habits-range", user?.id, 30],
      (old: DailyHabit[] | undefined) => {
        if (!old) return old;
        const newHabit = {
          ...(old.find(h => h.date === targetDate) || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0 }),
          completed_meals: next,
        };
        const exists = old.some(h => h.date === targetDate);
        if (exists) {
          return old.map(h => h.date === targetDate ? newHabit : h);
        }
        return [...old, newHabit];
      }
    );

    if (user && !isMock) {
      const mealCount = totalMeals && totalMeals > 0 ? totalMeals : 6;
      const perMealDelta = Math.round(40 / mealCount);
      const delta = isRemoving ? -perMealDelta : perMealDelta;
      optimisticFlameUpdate(queryClient, user.id, {
        adherenceDelta: delta,
        forceActive: !isRemoving && next.length >= 1,
      });
      upsertHabits.mutate({ water_liters: habits?.water_liters || 0, completed_meals: next });

      // Award Hustle Points for completing all meals (Layer 1: Registration)
      if (!isRemoving && next.length === mealCount) {
        awardPoints({ action: "diet_log" });
        triggerMilestonePost(user.id, "diet");
      }
    }
  };

  const toggleAllMeals = (done: boolean, totalMeals: number) => {
    const mealCount = totalMeals && totalMeals > 0 ? totalMeals : 6;
    const next = done ? Array.from({ length: mealCount }, (_, i) => `meal_${i}`) : [];

    queryClient.setQueryData(
      ["daily-habits", user?.id, targetDate],
      (old: DailyHabit | null) => ({
        ...(old || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0 }),
        completed_meals: next,
      })
    );

    queryClient.setQueryData(
      ["daily-habits-range", user?.id, 30],
      (old: DailyHabit[] | undefined) => {
        if (!old) return old;
        const newHabit = {
          ...(old.find(h => h.date === targetDate) || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0 }),
          completed_meals: next,
        };
        const exists = old.some(h => h.date === targetDate);
        if (exists) {
          return old.map(h => h.date === targetDate ? newHabit : h);
        }
        return [...old, newHabit];
      }
    );

    if (user && !isMock) {
      const perMealDelta = Math.round(40 / mealCount);
      const oldLen = habits?.completed_meals?.length || 0;
      const deltaLen = next.length - oldLen;
      const delta = deltaLen * perMealDelta;
      
      optimisticFlameUpdate(queryClient, user.id, {
        adherenceDelta: delta,
        forceActive: next.length > 0,
      });
      upsertHabits.mutate({ water_liters: habits?.water_liters || 0, completed_meals: next });

      if (done) {
        awardPoints({ action: "diet_log" });
        triggerMilestonePost(user.id, "diet");
      }
    }
  };
  
  const toggleGoal = (goalKey: string) => {
    const current = habits?.completed_goals || [];
    const isRemoving = current.includes(goalKey);
    const next = isRemoving
      ? current.filter((key) => key !== goalKey)
      : [...current, goalKey];

    // Update today's habits cache
    queryClient.setQueryData(
      ["daily-habits", user?.id, targetDate],
      (old: DailyHabit | null) => ({
        ...(old || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0, completed_meals: [] }),
        completed_goals: next,
      })
    );

    // Also update the range cache so useRealPerformance picks up the change for charts
    queryClient.setQueryData(
      ["daily-habits-range", user?.id, 30],
      (old: DailyHabit[] | undefined) => {
        if (!old) return old;
        const newHabit = {
          ...(old.find(h => h.date === targetDate) || habits || { id: "", user_id: user?.id || "", date: targetDate, water_liters: 0, completed_meals: [] }),
          completed_goals: next,
        };
        const exists = old.some(h => h.date === targetDate);
        if (exists) {
          return old.map(h => h.date === targetDate ? { ...h, completed_goals: next } : h);
        }
        return [...old, newHabit as DailyHabit];
      }
    );

    if (user && !isMock) {
      // Update flame/adherence optimistically (each goal ~2.5pts of 100)
      const delta = isRemoving ? -3 : 3;
      optimisticFlameUpdate(queryClient, user.id, { 
        adherenceDelta: delta,
        forceActive: !isRemoving && next.length >= 1,
      });
      
      upsertHabits.mutate({ 
        water_liters: habits?.water_liters || 0, 
        completed_meals: habits?.completed_meals || [],
        completed_goals: next 
      });
    }
  };

  return {
    waterIntake: habits?.water_liters ?? 0,
    completedMeals: new Set(habits?.completed_meals ?? []),
    completedGoals: new Set(habits?.completed_goals ?? []),
    mealsCompletedCount: habits?.completed_meals?.length ?? 0,
    isLoading,
    setWater,
    toggleMeal,
    toggleAllMeals,
    toggleGoal,
  };
}

export function useDailyHabitsRange(days: number) {
  const { user } = useAuth();
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split("T")[0];
  const isMock = localStorage.getItem("USE_MOCK") === "true";

  return useQuery({
    queryKey: ["daily-habits-range", user?.id, days],
    queryFn: async () => {
      if (isMock) return [];
      if (!user) return [];
      const { data, error } = await supabase
        .from("daily_habits")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startStr)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyHabit[];
    },
    enabled: !!user || isMock,
  });
}
