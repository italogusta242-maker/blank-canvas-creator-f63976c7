/**
 * @purpose Anti-duplication check for the daily flame.
 * Ensures that even if the user completes both a workout AND a run on the same day,
 * the flame/streak only increments once.
 * 
 * Uses flame_status.last_approved_date (local timezone, not UTC).
 */
import { supabase } from "@/integrations/supabase/client";
import { toLocalDate, getDailyValue, setDailyValue } from "@/lib/dateUtils";

/**
 * Returns true if the user's flame has already been activated today.
 * Uses local date to avoid UTC timezone bugs on late-night workouts.
 */
export async function checkDailyFlame(userId: string): Promise<boolean> {
  // 1. Check local session lock (super fast, prevents double click/sequential taps)
  if (getDailyValue("flame_activated", false)) return true;

  const today = toLocalDate(new Date());

  const { data } = await supabase
    .from("flame_status")
    .select("last_approved_date")
    .eq("user_id", userId)
    .maybeSingle();

  const isToday = data?.last_approved_date === today;
  
  // 2. Sync local lock if DB already has it
  if (isToday) setDailyValue("flame_activated", true);
  
  return isToday;
}

/**
 * Hook-friendly wrapper that can be used in components.
 * Call before optimisticFlameUpdate to decide whether to increment streak.
 */
export async function shouldIncrementFlame(userId: string): Promise<boolean> {
  const alreadyActive = await checkDailyFlame(userId);
  if (alreadyActive) return false;
  
  // If we reach here, we are going to increment, so we set the local lock immediately
  setDailyValue("flame_activated", true);
  return true;
}
