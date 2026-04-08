import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type HustleAction = 
  | "workout_complete" 
  | "diet_log" 
  | "running_complete"
  | "daily_goal_check";

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
  diet_log: 5,
  running_complete: 10,
  daily_goal_check: 3,
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
