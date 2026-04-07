import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, parseSafeDate, getToday, getYesterday } from "@/lib/dateUtils";

/**
 * Calcula o streak (dias consecutivos de treino) do usuário.
 * Agora utiliza a tabela 'workouts' como base e 'flame_status' como fallback.
 */
export const useStreak = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["streak", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { streak: 0, flameState: "normal" as const };
      
      const [{ data: workouts }, { data: flame }] = await Promise.all([
        supabase.from("workouts").select("started_at").eq("user_id", targetUserId).order("started_at", { ascending: false }).limit(100),
        supabase.from("flame_status").select("*").eq("user_id", targetUserId).maybeSingle()
      ]);

      if (!workouts || workouts.length === 0) {
        return { 
          streak: flame?.streak || 0, 
          flameState: (flame?.state as any) || "normal" 
        };
      }

      const workoutDates = new Set(workouts.map(w => toLocalDate(parseSafeDate(w.started_at))));
      const now = new Date();
      let calculatedStreak = 0;
      let active = false;

      const today = getToday();
      const yesterday = getYesterday();
      
      if (workoutDates.has(today)) {
        active = true;
      } else if (workoutDates.has(yesterday)) {
        active = true;
      }

      let consecutiveMisses = 0;

      if (active) {
        for (let i = 0; i < 90; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = toLocalDate(d);
          if (dateStr > today) continue;
          
          const isSunday = d.getDay() === 0;

          if (workoutDates.has(dateStr)) {
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

      // Use calculated streak only — DB value may be stale/inflated
      const finalStreak = calculatedStreak;
      
      return {
        streak: finalStreak,
        flameState: active ? "ativa" : "normal"
      };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
};
