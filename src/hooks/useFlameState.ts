import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, getToday, getYesterday } from "@/lib/dateUtils";

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
      
      // Get active dates from community_posts + historic workouts (UNION)
      const [{ data: posts }, { data: workouts }] = await Promise.all([
        supabase
          .from("community_posts")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("workouts")
          .select("started_at")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(100),
      ]);

      const activeDates = new Set<string>();
      (posts || []).forEach(p => {
        if (p.created_at) activeDates.add(p.created_at.split('T')[0]);
      });
      (workouts || []).forEach(w => {
        if (w.started_at) activeDates.add(w.started_at.split('T')[0]);
      });
      
      // Streak counts if today or yesterday is active
      const isActive = activeDates.has(today) || activeDates.has(yesterday);
      
      let calculatedStreak = 0;
      let consecutiveMisses = 0;
      const now = new Date();

      if (isActive) {
        for (let i = 0; i < 90; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = toLocalDate(d);
          if (dateStr > today) continue;
          
          const isSunday = d.getDay() === 0;

          if (activeDates.has(dateStr)) {
            calculatedStreak++;
            consecutiveMisses = 0;
          } else {
            if (!isSunday && i > 0) {
              consecutiveMisses++;
            }
            if (consecutiveMisses > 1) {
              break;
            }
          }
        }
      }

      const finalStreak = calculatedStreak;

      let computedState: FlameState = "normal";
      if (activeDates.has(today)) {
        computedState = "ativa";
      } else if (activeDates.has(yesterday)) {
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

async function calculateAdherence(userId: string): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startStr = toLocalDate(sevenDaysAgo);
  const endStr = toLocalDate(now);
  
  // Count days with posts OR workouts in last 7 days
  const [{ data: posts }, { data: workouts }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", `${startStr}T00:00:00`)
      .lte("created_at", `${endStr}T23:59:59.999`),
    supabase
      .from("workouts")
      .select("finished_at")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .gte("finished_at", `${startStr}T00:00:00`)
      .lte("finished_at", `${endStr}T23:59:59.999`),
  ]);
  
  const uniqueDays = new Set<string>();
  (posts || []).forEach((p: any) => {
    const d = p.created_at?.split("T")[0];
    if (d) uniqueDays.add(d);
  });
  (workouts || []).forEach((w: any) => {
    const d = w.finished_at?.split("T")[0];
    if (d) uniqueDays.add(d);
  });
  
  return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
}
