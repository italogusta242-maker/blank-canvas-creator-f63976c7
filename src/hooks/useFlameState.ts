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

/**
 * REGRA OFICIAL (desde 08/04): "Dias ativos" e "estado da chama" são derivados
 * EXCLUSIVAMENTE de posts únicos por dia na comunidade.
 * Treino finalizado, dieta logada, etc NÃO contam mais (decisão de produto).
 *
 * Fonte da verdade: community_posts.created_at agrupado por data local (BRT).
 * Ignora `flame_status.streak` (legado, pode estar desatualizado).
 */
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

      const { data: posts } = await supabase
        .from("community_posts")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${CHALLENGE_START_DATE}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(200);

      const activeDates = new Set<string>();
      (posts || []).forEach((p) => {
        const d = isoToLocalDate(p.created_at);
        if (d) activeDates.add(d);
      });

      // Streak = dias únicos com post desde o início do desafio
      const streak = activeDates.size;

      // Estado: ativa se postou hoje OU ontem; frozen se já postou alguma vez mas não nas últimas 24h; normal se nunca postou
      let computedState: FlameState = "normal";
      if (activeDates.has(today) || activeDates.has(yesterday)) {
        computedState = "ativa";
      } else if (streak > 0) {
        computedState = "frozen";
      }

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

/** Adesão = % de dias com post na comunidade nos últimos 7 dias */
async function calculateAdherence(userId: string): Promise<number> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const rawStart = toLocalDate(sevenDaysAgo);
  const startStr = rawStart < CHALLENGE_START_DATE ? CHALLENGE_START_DATE : rawStart;
  const endStr = toLocalDate(now);

  const { data: posts } = await supabase
    .from("community_posts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", `${startStr}T00:00:00`)
    .lte("created_at", `${endStr}T23:59:59.999`);

  const uniqueDays = new Set<string>();
  (posts || []).forEach((p: any) => {
    const d = isoToLocalDate(p.created_at);
    if (d) uniqueDays.add(d);
  });

  return Math.min(100, Math.round((uniqueDays.size / 7) * 100));
}
