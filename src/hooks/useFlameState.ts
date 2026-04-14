import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, getToday, getYesterday } from "@/lib/dateUtils";
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

      // Get active dates from community_posts ONLY
      const { data: posts } = await supabase
        .from("community_posts")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${CHALLENGE_START_DATE}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(200);

      const activeDates = new Set<string>();
      (posts || []).forEach(p => {
        if (p.created_at) activeDates.add(p.created_at.split('T')[0]);
      });

      // Streak = total unique days with posts since challenge start
      const streak = activeDates.size;

      // State: ativa if posted today/yesterday, frozen if has days but inactive, normal if zero
      let computedState: FlameState = "normal";
      if (activeDates.has(today) || activeDates.has(yesterday)) {
        computedState = "ativa";
      } else if (streak > 0) {
        computedState = "frozen";
      }

      console.log(`[Flame Debug] Unique days: ${streak}, State: ${computedState}`);

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

  // Count days with posts ONLY in last 7 days
  const { data: posts } = await supabase
    .from("community_posts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", `${startStr}T00:00:00`)
    .lte("created_at", `${endStr}T23:59:59.999`);

  const uniqueDays = new Set<string>();
  (posts || []).forEach((p: any) => {
    const d = p.created_at?.split("T")[0];
    if (d) uniqueDays.add(d);
  });

  return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
}
