import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, getToday, getYesterday, isoToLocalDate } from "@/lib/dateUtils";
import { CHALLENGE_START_DATE } from "@/lib/challengeConfig";

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

      const today = getToday();
      const yesterday = getYesterday();

      // Active days come from BOTH community_posts AND finished workouts
      // (so a user who trains but doesn't post still keeps the flame active).
      const [{ data: posts }, { data: workouts }] = await Promise.all([
        supabase
          .from("community_posts")
          .select("created_at")
          .eq("user_id", user.id)
          .gte("created_at", `${CHALLENGE_START_DATE}T00:00:00`)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("workouts")
          .select("finished_at")
          .eq("user_id", user.id)
          .not("finished_at", "is", null)
          .gte("finished_at", `${CHALLENGE_START_DATE}T00:00:00`)
          .order("finished_at", { ascending: false })
          .limit(200),
      ]);

      const activeDates = new Set<string>();
      (posts || []).forEach((p) => {
        const d = isoToLocalDate(p.created_at);
        if (d) activeDates.add(d);
      });
      (workouts || []).forEach((w: any) => {
        const d = isoToLocalDate(w.finished_at);
        if (d) activeDates.add(d);
      });

      // Streak = total unique days with post OR workout since challenge start
      const streak = activeDates.size;

      // State: ativa if active today/yesterday, frozen if has days but inactive, normal if zero
      let computedState: FlameState = "normal";
      if (activeDates.has(today) || activeDates.has(yesterday)) {
        computedState = "ativa";
      } else if (streak > 0) {
        computedState = "frozen";
      }

      console.log(`[Flame Debug] Unique days (posts+workouts): ${streak}, State: ${computedState}`);

      return { state: computedState, streak, adherence };
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
  const rawStart = toLocalDate(sevenDaysAgo);
  const startStr = rawStart < CHALLENGE_START_DATE ? CHALLENGE_START_DATE : rawStart;
  const endStr = toLocalDate(now);

  // Count days with posts OR workouts in the last 7 days
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
    const d = isoToLocalDate(p.created_at);
    if (d) uniqueDays.add(d);
  });
  (workouts || []).forEach((w: any) => {
    const d = isoToLocalDate(w.finished_at);
    if (d) uniqueDays.add(d);
  });

  return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
}
