import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format, differenceInYears, parseISO } from "date-fns";
import { MOCK_ADMIN_KPI, MOCK_REVENUE_HISTORY } from "@/lib/mockData";

// ─── Shared: fetch all plans for duration lookup ────────────
async function fetchPlanMap(): Promise<Record<number, number>> {
  const { data } = await supabase.from("subscription_plans").select("price, duration_months");
  const map: Record<number, number> = {};
  for (const p of data ?? []) {
    map[Number(p.price)] = p.duration_months;
  }
  return map;
}

function getDuration(price: number, planMap: Record<number, number>): number {
  return planMap[price] ?? 1; // default to monthly
}

// ─── KPIs ───────────────────────────────────────────────────

export function useMRR() {
  return useQuery({
    queryKey: ["admin-mrr"],
    queryFn: async () => {
      const isMock = localStorage.getItem("USE_MOCK") === "true";
      if (isMock) return { mrr: MOCK_ADMIN_KPI.mrr, arpu: MOCK_ADMIN_KPI.arpu, activeCount: MOCK_ADMIN_KPI.activeCount };

      const [{ data, error }, planMap] = await Promise.all([
        supabase.from("subscriptions").select("plan_price").eq("status", "active"),
        fetchPlanMap(),
      ]);
      if (error) throw error;
      // MRR = sum of (plan_price / duration_months) for each active subscription
      let mrr = 0;
      for (const r of data ?? []) {
        const price = Number(r.plan_price);
        const dur = getDuration(price, planMap);
        mrr += price / dur;
      }
      const count = data?.length ?? 0;
      return { mrr: Math.round(mrr * 100) / 100, arpu: count > 0 ? Math.round((mrr / count) * 100) / 100 : 0, activeCount: count };
    },
  });
}

export function useChurnRate() {
  return useQuery({
    queryKey: ["admin-churn"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));

      // Active at start of month = active now + canceled this month
      const { count: canceledThisMonth } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "canceled")
        .gte("canceled_at", monthStart.toISOString());

      const { count: activeNow } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      const canceled = canceledThisMonth ?? 0;
      const active = activeNow ?? 0;
      const startActive = active + canceled;
      const rate = startActive > 0 ? (canceled / startActive) * 100 : 0;

      return { churnRate: Math.round(rate * 10) / 10, canceledThisMonth: canceled };
    },
  });
}

export function useChurnReasons() {
  return useQuery({
    queryKey: ["admin-churn-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("cancel_reason")
        .not("canceled_at", "is", null);
      if (error) throw error;

      const counts: Record<string, number> = {};
      let total = 0;
      for (const r of data ?? []) {
        const reason = r.cancel_reason || "Outros";
        counts[reason] = (counts[reason] || 0) + 1;
        total++;
      }
      return Object.entries(counts)
        .map(([reason, count]) => ({ reason, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.pct - a.pct);
    },
  });
}

// ─── Revenue History (6 months) ─────────────────────────────

export function useRevenueHistory() {
  return useQuery({
    queryKey: ["admin-revenue-history"],
    queryFn: async () => {
      const isMock = localStorage.getItem("USE_MOCK") === "true";
      if (isMock) return MOCK_REVENUE_HISTORY;

      const months: { month: string; start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          month: format(d, "MMM"),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_price, started_at, canceled_at, status");
      if (error) throw error;

      return months.map(({ month, start, end }) => {
        let receita = 0;
        for (const sub of data ?? []) {
          const startedAt = new Date(sub.started_at);
          const canceledAt = sub.canceled_at ? new Date(sub.canceled_at) : null;
          // Was active during this month?
          if (startedAt <= end && (!canceledAt || canceledAt >= start)) {
            receita += Number(sub.plan_price);
          }
        }
        return { month, receita, meta: 0 };
      });
    },
  });
}

// ─── Retention ──────────────────────────────────────────────

export function useRetentionHistory() {
  return useQuery({
    queryKey: ["admin-retention"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("started_at, canceled_at, status");
      if (error) throw error;

      const months: { month: string; start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({ month: format(d, "MMM"), start: startOfMonth(d), end: endOfMonth(d) });
      }

      return months.map(({ month, start, end }) => {
        let activeStart = 0;
        let activeEnd = 0;
        for (const sub of data ?? []) {
          const s = new Date(sub.started_at);
          const c = sub.canceled_at ? new Date(sub.canceled_at) : null;
          if (s <= start && (!c || c >= start)) activeStart++;
          if (s <= end && (!c || c >= end)) activeEnd++;
        }
        const retention = activeStart > 0 ? Math.round((activeEnd / activeStart) * 100) : 100;
        return { month, retention };
      });
    },
  });
}

// ─── CAC ────────────────────────────────────────────────────

export function useCAC() {
  return useQuery({
    queryKey: ["admin-cac"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);

      const { data: spend } = await supabase
        .from("marketing_spend")
        .select("amount")
        .gte("month", format(monthStart, "yyyy-MM-dd"))
        .lte("month", format(now, "yyyy-MM-dd"));

      const totalSpend = (spend ?? []).reduce((s, r) => s + Number(r.amount), 0);

      const { count: newUsers } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .gte("started_at", monthStart.toISOString());

      const users = newUsers ?? 0;
      const cac = users > 0 ? totalSpend / users : 0;

      return { cac: Math.round(cac * 100) / 100, totalSpend, newUsers: users };
    },
  });
}

// ─── TCV (Total Contract Value) ─────────────────────────────

export function useTCV() {
  return useQuery({
    queryKey: ["admin-tcv"],
    queryFn: async () => {
      // Use invites as source of truth for sales (closers create invites, not subscriptions)
      const [{ data: invites, error: invErr }, { data: plans }] = await Promise.all([
        supabase.from("invites").select("plan_value, payment_status, status, subscription_plan_id, created_at"),
        supabase.from("subscription_plans").select("id, name, price, duration_months").eq("active", true),
      ]);
      if (invErr) throw invErr;

      const planById: Record<string, { name: string; duration_months: number; price: number }> = {};
      for (const p of plans ?? []) {
        planById[p.id] = { name: p.name, duration_months: p.duration_months, price: Number(p.price) };
      }

      // Consider used invites (activated accounts) as valid contracts
      const validInvites = (invites ?? []).filter(
        (i) => i.status === "used" || i.payment_status === "paid" || i.payment_status === "confirmed"
      );

      let tcv = 0;
      const planBreakdown: Record<string, { count: number; totalValue: number; duration: number }> = {};

      for (const inv of validInvites) {
        const value = Number(inv.plan_value) || 0;
        if (value <= 0) continue;

        const plan = inv.subscription_plan_id ? planById[inv.subscription_plan_id] : null;
        const planName = plan?.name ?? `Plano R$ ${value}`;
        const duration = plan?.duration_months ?? 1;

        tcv += value;

        if (!planBreakdown[planName]) {
          planBreakdown[planName] = { count: 0, totalValue: 0, duration };
        }
        planBreakdown[planName].count++;
        planBreakdown[planName].totalValue += value;
      }

      const breakdown = Object.entries(planBreakdown)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.totalValue - a.totalValue);

      return { tcv, breakdown, totalContracts: validInvites.filter(i => (Number(i.plan_value) || 0) > 0).length };
    },
  });
}

export type PeriodFilter = "1m" | "3m" | "6m" | "12m" | "all";

function getMonthsForPeriod(period: PeriodFilter): number {
  switch (period) {
    case "1m": return 1;
    case "3m": return 3;
    case "6m": return 6;
    case "12m": return 12;
    case "all": return 60; // 5 years max
  }
}

export function useKpiHistory(period: PeriodFilter = "6m") {
  const numMonths = getMonthsForPeriod(period);
  return useQuery({
    queryKey: ["admin-kpi-history", period],
    queryFn: async () => {
      const [{ data, error }, planMap, { data: invites }] = await Promise.all([
        supabase.from("subscriptions").select("plan_price, started_at, canceled_at, status"),
        fetchPlanMap(),
        supabase.from("invites").select("plan_value, payment_status, status, created_at")
          .or("status.eq.used,payment_status.eq.paid,payment_status.eq.confirmed"),
      ]);
      if (error) throw error;

      const subs = data ?? [];
      const validInvites = (invites ?? []).filter(i => (Number(i.plan_value) || 0) > 0);

      // For "1m" period, generate weekly data points
      if (period === "1m") {
        return generateWeeklyData(subs, planMap, validInvites);
      }

      // For "all", find earliest subscription
      let effectiveMonths = numMonths;
      if (period === "all" && subs.length > 0) {
        const earliest = subs.reduce((min, s) => {
          const d = new Date(s.started_at);
          return d < min ? d : min;
        }, new Date());
        const diffMs = new Date().getTime() - earliest.getTime();
        effectiveMonths = Math.max(1, Math.ceil(diffMs / (30 * 24 * 60 * 60 * 1000)));
      }

      const months: { label: string; monthKey: string; start: Date; end: Date }[] = [];
      for (let i = effectiveMonths - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(d, "MMM/yy"),
          monthKey: format(d, "yyyy-MM"),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      return months.map(({ label, monthKey, start, end }) => {
        let mrr = 0;
        let activeStart = 0;
        let canceledInMonth = 0;

        for (const sub of subs) {
          const s = new Date(sub.started_at);
          const c = sub.canceled_at ? new Date(sub.canceled_at) : null;

          if (s <= end && (!c || c >= start)) {
            const price = Number(sub.plan_price);
            const dur = getDuration(price, planMap);
            mrr += price / dur;
          }
          if (s <= start && (!c || c >= start)) {
            activeStart++;
          }
          if (c && c >= start && c <= end) {
            canceledInMonth++;
          }
        }

        const churn = activeStart > 0 ? Math.round((canceledInMonth / activeStart) * 100 * 10) / 10 : 0;
        const arpu = activeStart > 0 ? mrr / activeStart : 0;
        const ltv = churn > 0 ? Math.round(arpu / (churn / 100)) : 0;

        // TCV from invites (cumulative up to this month)
        let tcv = 0;
        for (const inv of validInvites) {
          const invDate = new Date(inv.created_at);
          if (invDate <= end) {
            tcv += Number(inv.plan_value);
          }
        }

        return { month: label, monthKey, mrr: Math.round(mrr), churn, ltv, tcv };
      });
    },
  });
}
function generateWeeklyData(subs: any[], planMap: Record<number, number>, validInvites: any[]) {
  const now = new Date();
  const weeks: { label: string; monthKey: string; start: Date; end: Date }[] = [];
  
  for (let i = 4; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    
    const weekLabel = `Sem ${5 - i}`;
    weeks.push({
      label: weekLabel,
      monthKey: format(weekEnd, "yyyy-MM"),
      start: weekStart,
      end: weekEnd,
    });
  }

  return weeks.map(({ label, monthKey, start, end }) => {
    let mrr = 0;
    let activeStart = 0;
    let canceledInWeek = 0;

    for (const sub of subs) {
      const s = new Date(sub.started_at);
      const c = sub.canceled_at ? new Date(sub.canceled_at) : null;

      if (s <= end && (!c || c >= start)) {
        const price = Number(sub.plan_price);
        const dur = getDuration(price, planMap);
        mrr += price / dur;
      }
      if (s <= start && (!c || c >= start)) {
        activeStart++;
      }
      if (c && c >= start && c <= end) {
        canceledInWeek++;
      }
    }

    const churn = activeStart > 0 ? Math.round((canceledInWeek / activeStart) * 100 * 10) / 10 : 0;
    const arpu = activeStart > 0 ? mrr / activeStart : 0;
    const ltv = churn > 0 ? Math.round(arpu / (churn / 100)) : 0;

    let tcv = 0;
    for (const inv of validInvites) {
      const invDate = new Date(inv.created_at);
      if (invDate <= end) {
        tcv += Number(inv.plan_value);
      }
    }

    return { month: label, monthKey, mrr: Math.round(mrr), churn, ltv, tcv };
  });
}

// ─── Acquisition channels ───────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  "Indicação": "hsl(0,100%,27%)",
  "Instagram": "hsl(280,60%,50%)",
  "YouTube": "hsl(0,80%,50%)",
  "Google": "hsl(210,70%,50%)",
  "Outros": "hsl(43,76%,53%)",
};

export function useAcquisitionChannels() {
  return useQuery({
    queryKey: ["admin-acquisition"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("como_chegou")
        .not("como_chegou", "is", null);
      if (error) throw error;

      const counts: Record<string, number> = {};
      let total = 0;
      for (const r of data ?? []) {
        const ch = r.como_chegou || "Outros";
        counts[ch] = (counts[ch] || 0) + 1;
        total++;
      }

      const colorKeys = Object.keys(CHANNEL_COLORS);
      let colorIdx = 0;

      return Object.entries(counts)
        .map(([source, count]) => ({
          source,
          value: total > 0 ? Math.round((count / total) * 100) : 0,
          color: CHANNEL_COLORS[source] || `hsl(${(colorIdx++ * 60) % 360},50%,50%)`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  });
}


