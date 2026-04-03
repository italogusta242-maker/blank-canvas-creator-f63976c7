import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDate, parseSafeDate } from "@/lib/dateUtils";

export interface StreakDay {
  date: string;
  dayName: string; // e.g., 'SEG', 'TER'
  trained: boolean;
}

export function useStreakHistory() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["streak-history", user?.id],
    queryFn: async (): Promise<StreakDay[]> => {
      if (!user) return [];
      
      const days: StreakDay[] = [];
      const today = new Date();
      
      // Generate last 7 days (including today)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        
        const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        days.push({
          date: toLocalDate(d),
          dayName: dayNames[d.getDay()],
          trained: false, // default
        });
      }

      const earliestDate = days[0].date;
      const latestDate = days[6].date;

      // Fetch workouts in this range
      const { data: workouts } = await supabase
        .from("workouts")
        .select("finished_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .gte("finished_at", `${earliestDate}T00:00:00`)
        .lte("finished_at", `${latestDate}T23:59:59.999`);

      if (workouts) {
        workouts.forEach(w => {
          if (w.finished_at) {
             const localDate = toLocalDate(parseSafeDate(w.finished_at));
             const dayMatch = days.find(d => d.date === localDate);
             if (dayMatch) {
                dayMatch.trained = true;
             }
          }
        });
      }

      return days;
    },
    enabled: !!user,
  });
}
