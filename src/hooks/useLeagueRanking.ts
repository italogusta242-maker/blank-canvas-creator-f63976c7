import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CHALLENGE_START_DATE } from "@/lib/challengeConfig";
import { isoToLocalDate } from "@/lib/dateUtils";
import type { PodiumEntry } from "@/components/community/PodiumCard";

export type LeagueCategory = "essencial" | "constancia" | "elite";
export type LeaguePeriod = "week" | "month" | "all";

export const LEAGUE_LABELS: Record<LeagueCategory, { label: string; color: string; ring: string }> = {
  essencial:  { label: "Essencial",  color: "text-emerald-400", ring: "ring-emerald-400/30" },
  constancia: { label: "Constância", color: "text-blue-400",    ring: "ring-blue-400/30" },
  elite:      { label: "Elite",      color: "text-rose-400",    ring: "ring-rose-400/30" },
};

function periodStartISO(period: LeaguePeriod): string {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  return new Date(CHALLENGE_START_DATE).toISOString();
}

export function useLeagueRanking(category: LeagueCategory, period: LeaguePeriod = "month") {
  return useQuery<PodiumEntry[]>({
    queryKey: ["league-ranking", category, period],
    queryFn: async () => {
      const challengeStartISO = new Date(CHALLENGE_START_DATE).toISOString();
      const periodStart = periodStartISO(period);
      const effectiveStart = periodStart > challengeStartISO ? periodStart : challengeStartISO;

      const { data: profiledUsers, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("planner_type", category);
      if (error) throw error;

      const userIds = [...new Set((profiledUsers || []).map((p: any) => p.id))] as string[];
      if (userIds.length === 0) return [];

      const { data: posts } = await supabase
        .from("community_posts")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", effectiveStart);

      const activeDaysMap: Record<string, Set<string>> = {};
      for (const p of posts || []) {
        const d = isoToLocalDate(p.created_at);
        if (d) {
          if (!activeDaysMap[p.user_id]) activeDaysMap[p.user_id] = new Set();
          activeDaysMap[p.user_id].add(d);
        }
      }

      const combined: PodiumEntry[] = (profiledUsers || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name || "Miri",
        avatar_url: p.avatar_url,
        score: activeDaysMap[p.id]?.size ?? 0,
        streak: activeDaysMap[p.id]?.size ?? 0,
        rank: 0,
      }));

      combined.sort((a, b) => b.score - a.score);
      combined.forEach((e, i) => (e.rank = i + 1));
      return combined;
    },
    staleTime: 1000 * 60 * 3,
  });
}
