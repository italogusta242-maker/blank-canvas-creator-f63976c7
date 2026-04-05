import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, getToday, getYesterday, getDailyValue, parseSafeDate } from "@/lib/dateUtils";

export type FlameState = "normal" | "ativa" | "frozen" | "tregua" | "extinta";

export interface FlameResult {
  state: FlameState;
  streak: number;
  adherence: number;
}

export function useFlameState(): FlameResult & { isLoading: boolean } {
  const { user } = useAuth();
  const isMock = localStorage.getItem("USE_MOCK") === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["flame-state", user?.id],
    queryFn: async (): Promise<FlameResult> => {
      if (isMock) return { state: "ativa", streak: 30, adherence: 100 };
      if (!user) return { state: "normal", streak: 0, adherence: 0 };

      const adherence = await calculateAdherence(user.id);
      
      const { data: flameStatus } = await supabase
        .from("flame_status")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const today = getToday();
      const yesterday = getYesterday();
      
      // Calculate streak from real workouts (last 90 days)
      const { data: workouts } = await supabase
        .from("workouts")
        .select("started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100);

      const workoutDates = new Set((workouts || []).map(w => w.started_at ? w.started_at.split('T')[0] : ''));
      
      // Streak counts if today or yesterday is active
      const isActive = workoutDates.has(today) || workoutDates.has(yesterday);
      
      let calculatedStreak = 0;
      let consecutiveMisses = 0;
      const now = new Date();

      if (isActive) {
        for (let i = 0; i < 90; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = toLocalDate(d);
          if (dateStr > today) continue; // safety check
          
          const isSunday = d.getDay() === 0;

          if (workoutDates.has(dateStr)) {
            calculatedStreak++;
            consecutiveMisses = 0; // reset misses 
          } else {
            // Count skip logic
            if (!isSunday && i > 0) { // i > 0 so missing TODAY doesn't count until day is over
              consecutiveMisses++;
            }
            // If they skipped more than 1 day in the past (excluding Sundays), it breaks
            if (consecutiveMisses > 1) {
              break;
            }
          }
        }
      }

      // Final streak is the maximum count from history OR the DB value
      const finalStreak = Math.max(calculatedStreak, flameStatus?.streak || 0);

      let computedState: FlameState = "normal";
      if (workoutDates.has(today)) {
        computedState = "ativa";
      } else if (workoutDates.has(yesterday)) {
        computedState = "ativa"; // Grace period
      } else if (finalStreak > 0) {
        computedState = "frozen";
      }

      console.log(`[Flame Debug] Calc: ${calculatedStreak}, Table: ${flameStatus?.streak}, Final: ${finalStreak}, State: ${computedState}`);

      return { state: computedState, streak: finalStreak, adherence };
    },
    enabled: !!user || isMock,
    staleTime: 5 * 60 * 1000,
  });

  return {
    state: data?.state ?? "normal",
    streak: data?.streak ?? 0,
    adherence: data?.adherence ?? 0,
    isLoading,
  };
}

async function isDayApproved(userId: string, dateStr: string): Promise<boolean> {
  const { data: workouts } = await supabase.from("workouts").select("id").eq("user_id", userId).not("finished_at", "is", null).gte("finished_at", `${dateStr}T00:00:00`).lt("finished_at", `${dateStr}T23:59:59.999`).limit(1);
  if (workouts && workouts.length > 0) return true;
  return false;
}

async function calculateAdherence(userId: string): Promise<number> {
  // Real adherence: count workout days in last 7 days / 7 * 100
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startStr = toLocalDate(sevenDaysAgo);
  const endStr = toLocalDate(now);
  
  const { data: workouts } = await supabase
    .from("workouts")
    .select("finished_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null)
    .gte("finished_at", `${startStr}T00:00:00`)
    .lte("finished_at", `${endStr}T23:59:59.999`);
  
  if (!workouts || workouts.length === 0) return 0;
  
  // Count unique days with workouts
  const uniqueDays = new Set(
    workouts.map((w: any) => w.finished_at?.split("T")[0]).filter(Boolean)
  );
  
  // Adherence = days trained / 7 * 100 (capped at 100)
  return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
}
