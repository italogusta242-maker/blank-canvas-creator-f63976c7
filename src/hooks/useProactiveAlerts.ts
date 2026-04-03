import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInCalendarDays, addMonths } from "date-fns";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "plan_expiring_soon"
  | "plan_expired"
  | "no_plan"
  | "inactive"
  | "churn_risk";

export interface ProactiveAlert {
  id: string;
  type: AlertType;
  studentId: string;
  studentName: string;
  severity: AlertSeverity;
  title: string;
  /** Positive = days overdue/ago, Negative = days remaining */
  daysRelative: number;
  /** Human-friendly label like "há 3 dias" or "em 5 dias" */
  timeLabel: string;
  navigateTo?: string;
}

function buildTimeLabel(days: number, context: "overdue" | "remaining"): string {
  if (context === "overdue") {
    if (days === 0) return "hoje";
    if (days === 1) return "há 1 dia";
    return `há ${days} dias`;
  }
  // remaining
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

function getSeverity(daysRelative: number, thresholds: { warn: number; critical: number }): AlertSeverity {
  if (daysRelative >= thresholds.critical) return "critical";
  if (daysRelative >= thresholds.warn) return "warning";
  return "info";
}

export function useProactiveAlerts(specialty: string | null, studentIds: string[], studentNames: Map<string, string>) {
  const { user } = useAuth();
  const planTable = specialty === "nutricionista" ? "diet_plans" : "training_plans";
  const enabled = !!user && studentIds.length > 0;

  return useQuery({
    queryKey: ["proactive-alerts", specialty, studentIds],
    queryFn: async () => {
      const alerts: ProactiveAlert[] = [];
      const today = new Date();

      // Parallel fetch: plans, workouts (last 14 days), profiles, subscriptions, subscription_plans
      const [plansRes, workoutsRes, profilesRes, subsRes, subPlansRes] = await Promise.all([
        supabase
          .from(planTable)
          .select("id, title, user_id, active, valid_until, updated_at")
          .in("user_id", studentIds),
        supabase
          .from("workouts")
          .select("user_id, finished_at")
          .in("user_id", studentIds)
          .gte("started_at", new Date(today.getTime() - 14 * 86400000).toISOString())
          .not("finished_at", "is", null),
        supabase
          .from("profiles")
          .select("id, status, onboarded")
          .in("id", studentIds),
        supabase
          .from("subscriptions")
          .select("user_id, started_at, plan_price, status")
          .in("user_id", studentIds)
          .eq("status", "active"),
        supabase
          .from("subscription_plans")
          .select("price, duration_months")
          .eq("active", true),
      ]);

      const plans = plansRes.data ?? [];
      const workouts = workoutsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const subscriptions = subsRes.data ?? [];
      const subPlans = subPlansRes.data ?? [];

      // Build price -> duration map
      const priceToDuration = new Map<number, number>();
      for (const sp of subPlans) {
        priceToDuration.set(Number(sp.price), sp.duration_months);
      }

      // Map subscription expiry per student
      const subscriptionExpiry = new Map<string, Date>();
      for (const sub of subscriptions) {
        const duration = priceToDuration.get(sub.plan_price) ?? 1; // default 1 month
        const expiry = addMonths(new Date(sub.started_at), duration);
        const existing = subscriptionExpiry.get(sub.user_id);
        if (!existing || expiry > existing) {
          subscriptionExpiry.set(sub.user_id, expiry);
        }
      }

      // Group active plans per student
      const activePlansByStudent = new Map<string, typeof plans[0]>();
      for (const p of plans) {
        if (p.active) {
          const existing = activePlansByStudent.get(p.user_id);
          if (!existing) activePlansByStudent.set(p.user_id, p);
        }
      }

      // Students with recent workouts
      const studentsWithWorkouts = new Set(workouts.map((w) => w.user_id));

      for (const sid of studentIds) {
        const name = studentNames.get(sid) ?? "Aluno";
        const plan = activePlansByStudent.get(sid);


        // 3. Plan expiring soon or expired
        if (plan && plan.valid_until) {
          const validDate = new Date(plan.valid_until);
          const daysUntil = differenceInCalendarDays(validDate, today);

          if (daysUntil < 0) {
            // Expired
            const daysOverdue = Math.abs(daysUntil);
            alerts.push({
              id: `plan-expired-${sid}`,
              type: "plan_expired",
              studentId: sid,
              studentName: name,
              severity: getSeverity(daysOverdue, { warn: 1, critical: 7 }),
              title: `Plano expirado`,
              daysRelative: daysOverdue,
              timeLabel: `expirou ${buildTimeLabel(daysOverdue, "overdue")}`,
              navigateTo: specialty === "nutricionista"
                ? `/especialista/dietas?aluno=${encodeURIComponent(name)}`
                : `/especialista/treinos?aluno=${encodeURIComponent(name)}`,
            });
          } else if (daysUntil <= 7) {
            // Expiring soon
            alerts.push({
              id: `plan-expiring-${sid}`,
              type: "plan_expiring_soon",
              studentId: sid,
              studentName: name,
              severity: daysUntil <= 2 ? "warning" : "info",
              title: `Plano expira ${buildTimeLabel(daysUntil, "remaining")}`,
              daysRelative: -daysUntil,
              timeLabel: buildTimeLabel(daysUntil, "remaining"),
              navigateTo: specialty === "nutricionista"
                ? `/especialista/dietas?aluno=${encodeURIComponent(name)}`
                : `/especialista/treinos?aluno=${encodeURIComponent(name)}`,
            });
          }
        }

        // 4. No active plan at all
        if (!plan) {
          alerts.push({
            id: `no-plan-${sid}`,
            type: "no_plan",
            studentId: sid,
            studentName: name,
            severity: "warning",
            title: "Sem plano ativo",
            daysRelative: 0,
            timeLabel: "criar plano",
            navigateTo: specialty === "nutricionista"
              ? `/especialista/dietas?aluno=${encodeURIComponent(name)}`
              : `/especialista/treinos?aluno=${encodeURIComponent(name)}`,
          });
        }

        // 5. Inactive - no workouts in 14 days (all specialties)
        if (plan && !studentsWithWorkouts.has(sid)) {
          alerts.push({
            id: `inactive-${sid}`,
            type: "inactive",
            studentId: sid,
            studentName: name,
            severity: "warning",
            title: "Sem treinos há +14 dias",
            daysRelative: 14,
            timeLabel: "inativo",
            navigateTo: `/especialista/alunos?aluno=${encodeURIComponent(name)}`,
          });
        }

        // 4. No active plan at all


        // 7. Churn risk - subscription nearing expiry or overdue
        const expiry = subscriptionExpiry.get(sid);
        if (expiry) {
          const daysUntilExpiry = differenceInCalendarDays(expiry, today);
          if (daysUntilExpiry < 0) {
            // Overdue - subscription expired without renewal
            const daysOverdue = Math.abs(daysUntilExpiry);
            alerts.push({
              id: `churn-overdue-${sid}`,
              type: "churn_risk",
              studentId: sid,
              studentName: name,
              severity: daysOverdue >= 7 ? "critical" : "warning",
              title: "Assinatura vencida",
              daysRelative: daysOverdue,
              timeLabel: `venceu ${buildTimeLabel(daysOverdue, "overdue")}`,
              navigateTo: `/especialista/alunos?aluno=${encodeURIComponent(name)}`,
            });
          } else if (daysUntilExpiry <= 10) {
            // Nearing expiry
            alerts.push({
              id: `churn-expiring-${sid}`,
              type: "churn_risk",
              studentId: sid,
              studentName: name,
              severity: daysUntilExpiry <= 3 ? "warning" : "info",
              title: `Assinatura vence ${buildTimeLabel(daysUntilExpiry, "remaining")}`,
              daysRelative: -daysUntilExpiry,
              timeLabel: `vence ${buildTimeLabel(daysUntilExpiry, "remaining")}`,
              navigateTo: `/especialista/alunos?aluno=${encodeURIComponent(name)}`,
            });
          }
        }
      }

      // Sort: critical first, then warning, then info
      const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return alerts;
    },
    enabled,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}
