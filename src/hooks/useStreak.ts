import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getToday, getYesterday, isoToLocalDate } from "@/lib/dateUtils";
import { CHALLENGE_START_DATE } from "@/lib/challengeConfig";

/**
 * Calcula o streak (dias ativos) do usuário.
 * Streak = total de dias únicos com post na comunidade desde CHALLENGE_START_DATE.
 * Nunca zera — chama congela quando inativa.
 */
export const useStreak = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["streak", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { streak: 0, flameState: "normal" as const };

      const { data: posts } = await supabase
        .from("community_posts")
        .select("created_at")
        .eq("user_id", targetUserId)
        .gte("created_at", `${CHALLENGE_START_DATE}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(200);

      const activeDates = new Set<string>();
      (posts || []).forEach(p => {
        const d = isoToLocalDate(p.created_at);
        if (d) activeDates.add(d);
      });

      const streak = activeDates.size;
      const today = getToday();
      const yesterday = getYesterday();

      const isActive = activeDates.has(today) || activeDates.has(yesterday);

      return {
        streak,
        flameState: isActive ? "ativa" : (streak > 0 ? "frozen" : "normal"),
      };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
};
