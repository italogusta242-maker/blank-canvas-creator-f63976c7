import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, getToday, getYesterday } from "@/lib/dateUtils";

/**
 * Calcula o streak (dias ativos consecutivos) do usuário.
 * Baseado em community_posts + workouts históricos (UNION).
 */
export const useStreak = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["streak", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { streak: 0, flameState: "normal" as const };
      
      const [{ data: posts }, { data: workouts }, { data: flame }] = await Promise.all([
        supabase.from("community_posts").select("created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(100),
        supabase.from("workouts").select("started_at").eq("user_id", targetUserId).order("started_at", { ascending: false }).limit(100),
        supabase.from("flame_status").select("*").eq("user_id", targetUserId).maybeSingle()
      ]);

      const activeDates = new Set<string>();
      (posts || []).forEach(p => { if (p.created_at) activeDates.add(p.created_at.split('T')[0]); });
      (workouts || []).forEach(w => { if (w.started_at) activeDates.add(w.started_at.split('T')[0]); });

      if (activeDates.size === 0) {
        return { 
          streak: flame?.streak || 0, 
          flameState: (flame?.state as any) || "normal" 
        };
      }

      const now = new Date();
      let calculatedStreak = 0;
      let active = false;

      const today = getToday();
      const yesterday = getYesterday();
      
      if (activeDates.has(today) || activeDates.has(yesterday)) {
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
      
      return {
        streak: finalStreak,
        flameState: active ? "ativa" : "normal"
      };
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
};
