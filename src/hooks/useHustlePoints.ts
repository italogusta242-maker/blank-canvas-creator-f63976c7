import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type HustleAction = 
  | "workout_complete" 
  | "workout_weekly_bonus" 
  | "workout_streak"
  | "diet_log" 
  | "diet_calories" 
  | "diet_protein" 
  | "diet_all_macros" 
  | "diet_weekly_bonus"
  | "habit_water" 
  | "habit_sleep" 
  | "habit_combined_bonus"
  | "lesson_complete" 
  | "module_complete"
  | "community_post" 
  | "community_reaction_bonus";

// Fetch scoring rules from DB (cached)
function useScoringRules() {
  return useQuery({
    queryKey: ["scoring-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_rules")
        .select("action, points");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data || [])) {
        map[row.action] = row.points;
      }
      return map;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
  });
}

// Fallback defaults if DB is empty
const FALLBACK_POINTS: Record<HustleAction, number> = {
  workout_complete: 10,
  workout_weekly_bonus: 20,
  workout_streak: 3,
  diet_log: 5,
  diet_calories: 5,
  diet_protein: 3,
  diet_all_macros: 5,
  diet_weekly_bonus: 15,
  habit_water: 5,
  habit_sleep: 5,
  habit_combined_bonus: 3,
  lesson_complete: 8,
  module_complete: 15,
  community_post: 2,
  community_reaction_bonus: 3,
};

export function useHustlePoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMock = localStorage.getItem("USE_MOCK") === "true";
  
  const { data: scoringRules = {} } = useScoringRules();

  const getPoints = (action: HustleAction): number => {
    return scoringRules[action] ?? FALLBACK_POINTS[action] ?? 0;
  };

  const { data: totalPoints = 0 } = useQuery({
    queryKey: ["hustle-points-total", user?.id],
    queryFn: async () => {
      if (isMock) return 1250;
      if (!user) return 0;
      
      const { data: newPoints } = await supabase
        .from("hustle_points")
        .select("points")
        .eq("user_id", user.id);
      
      const total = (newPoints || []).reduce((acc: number, curr: any) => acc + (curr.points || 0), 0);
      return total;
    },
    enabled: !!user || isMock,
  });

  const awardPointsMutation = useMutation({
    mutationFn: async ({ action, groupId, metadata = {} }: { action: HustleAction; groupId?: string; metadata?: any }) => {
      if (isMock) return getPoints(action);
      if (!user) return;

      const points = getPoints(action);
      const date = new Date().toISOString().split('T')[0];
      
      const stackable = ["lesson_complete", "community_post"];
      
      if (!stackable.includes(action)) {
        const { data: existing } = await supabase
          .from("hustle_points")
          .select("id")
          .eq("user_id", user.id)
          .eq("reason", action)
          .gte("created_at", `${date}T00:00:00`)
          .maybeSingle();

        if (existing) {
          console.log(`Action ${action} already awarded today.`);
          return;
        }
      }

      const { error: pointsError } = await supabase
        .from("hustle_points")
        .insert({
          user_id: user.id,
          reason: action,
          points,
        } as any);

      if (pointsError) throw pointsError;
      return points;
    },
    onSuccess: (points, variables) => {
      if (points) {
        toast(`+${points} Hustle Points! 🔥`, {
          description: `Ação: ${variables.action.replace(/_/g, ' ')}`,
        });
        queryClient.invalidateQueries({ queryKey: ["hustle-points-total", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      }
    },
  });

  return {
    totalPoints,
    awardPoints: awardPointsMutation.mutate,
    awardPointsAsync: awardPointsMutation.mutateAsync,
    isAwarding: awardPointsMutation.isPending,
    scoringRules,
    getPoints,
  };
}
