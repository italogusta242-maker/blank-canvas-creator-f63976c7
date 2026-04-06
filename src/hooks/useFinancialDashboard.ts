import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Plan catalog (source of truth) ──
interface CatalogPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
}

export interface InferredSubscription {
  subscriptionId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  profileStatus: string;
  rawPrice: number;
  sanitizedPrice: number;
  inferredPlanName: string;
  inferredDurationMonths: number;
  mrrContribution: number;
  startedAt: string;
  expiresAt: string;
  catalogPlanId: string | null;
  activationMethod: "webhook" | "manual";
}

export interface PlanBreakdown {
  name: string;
  count: number;
  revenue: number;
  mrr: number;
  color: string;
}

const PLAN_COLORS: Record<string, string> = {
  Mensal: "hsl(var(--primary))",
  Trimestral: "hsl(142 76% 36%)",
  Semestral: "hsl(38 92% 50%)",
  Desconhecido: "hsl(var(--muted-foreground))",
};

/**
 * Sanitizes raw price: detects centavos (>= 1000) and converts to BRL.
 */
const sanitizePrice = (raw: number): number => {
  if (raw >= 1000) return raw / 100;
  return raw;
};

/**
 * Infers the real plan based on the sanitized price using proximity ranges.
 * Catalog: Mensal ~39.90, Trimestral ~109, Semestral ~197
 */
const inferPlan = (
  sanitizedPrice: number,
  catalogPlans: CatalogPlan[],
  linkedPlanId: string | null
): { name: string; durationMonths: number; catalogId: string | null } => {
  // If we have a valid linked plan, trust it
  if (linkedPlanId) {
    const linked = catalogPlans.find((p) => p.id === linkedPlanId);
    if (linked) return { name: linked.name, durationMonths: linked.duration_months, catalogId: linked.id };
  }

  // Price-range inference
  if (sanitizedPrice <= 50) return { name: "Mensal", durationMonths: 1, catalogId: catalogPlans.find((p) => p.duration_months === 1)?.id || null };
  if (sanitizedPrice <= 150) return { name: "Trimestral", durationMonths: 3, catalogId: catalogPlans.find((p) => p.duration_months === 3)?.id || null };
  if (sanitizedPrice <= 300) return { name: "Semestral", durationMonths: 6, catalogId: catalogPlans.find((p) => p.duration_months === 6)?.id || null };

  // Fallback: assume Mensal
  return { name: "Desconhecido", durationMonths: 1, catalogId: null };
};

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

export const useFinancialDashboard = () => {
  const { data: catalogPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["financial_catalog_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, price, duration_months")
        .eq("active", true);
      if (error) throw error;
      return (data || []).map((p) => ({ ...p, price: Number(p.price) })) as CatalogPlan[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawData, isLoading: loadingData, refetch } = useQuery({
    queryKey: ["financial_subscriptions_full"],
    queryFn: async () => {
      // Paginated fetch to handle >1000 subscriptions
      let allSubs: any[] = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, user_id, plan_price, status, started_at, subscription_plan_id, payment_status")
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        allSubs = allSubs.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
        page++;
      }

      const userIds = [...new Set(allSubs.map((s) => s.user_id))];
      const profiles: Record<string, { full_name: string | null; email: string | null; status: string }> = {};

      // Batch fetch profiles in chunks of 500
      for (let i = 0; i < userIds.length; i += 500) {
        const chunk = userIds.slice(i, i + 500);
        const { data: pData } = await supabase
          .from("profiles")
          .select("id, full_name, email, status")
          .in("id", chunk);
        (pData || []).forEach((p) => {
          profiles[p.id] = { full_name: p.full_name, email: p.email, status: p.status };
        });
      }

      return { subscriptions: allSubs, profiles };
    },
    staleTime: 2 * 60 * 1000,
  });

  const subscriptions = useMemo<InferredSubscription[]>(() => {
    if (!rawData || catalogPlans.length === 0) return [];

    // Deduplicate: keep only the most recent subscription per user
    const byUser = new Map<string, typeof rawData.subscriptions[0]>();
    for (const s of rawData.subscriptions) {
      const existing = byUser.get(s.user_id);
      if (!existing || new Date(s.started_at) > new Date(existing.started_at)) {
        byUser.set(s.user_id, s);
      }
    }

    return Array.from(byUser.values())
      .map((s) => {
        const profile = rawData.profiles[s.user_id];
        // STRICT FILTER: only count users with profile status 'ativo'
        if (!profile || profile.status !== "ativo") return null;

        const rawPrice = Number(s.plan_price) || 0;
        const sanitizedPrice = sanitizePrice(rawPrice);
        const inferred = inferPlan(sanitizedPrice, catalogPlans, s.subscription_plan_id);
        const mrrContribution = inferred.durationMonths > 0 ? sanitizedPrice / inferred.durationMonths : sanitizedPrice;

        return {
          subscriptionId: s.id,
          userId: s.user_id,
          userName: profile.full_name,
          userEmail: profile.email,
          profileStatus: profile.status,
          rawPrice,
          sanitizedPrice,
          inferredPlanName: inferred.name,
          inferredDurationMonths: inferred.durationMonths,
          mrrContribution,
          startedAt: s.started_at,
          expiresAt: addMonths(s.started_at, inferred.durationMonths),
          catalogPlanId: inferred.catalogId,
          activationMethod: s.payment_status === "paid" ? "webhook" : "manual",
        } satisfies InferredSubscription;
      })
      .filter(Boolean) as InferredSubscription[];
  }, [rawData, catalogPlans]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalRevenue = subscriptions.reduce((sum, s) => sum + s.sanitizedPrice, 0);
    const mrr = subscriptions.reduce((sum, s) => sum + s.mrrContribution, 0);
    const arr = mrr * 12;
    const activeCount = subscriptions.length;
    const avgTicket = activeCount > 0 ? totalRevenue / activeCount : 0;
    return { totalRevenue, mrr, arr, activeCount, avgTicket };
  }, [subscriptions]);

  // ── Plan Distribution ──
  const planDistribution = useMemo<PlanBreakdown[]>(() => {
    const map = new Map<string, { count: number; revenue: number; mrr: number }>();
    for (const s of subscriptions) {
      const key = s.inferredPlanName;
      const existing = map.get(key) || { count: 0, revenue: 0, mrr: 0 };
      existing.count++;
      existing.revenue += s.sanitizedPrice;
      existing.mrr += s.mrrContribution;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        mrr: data.mrr,
        color: PLAN_COLORS[name] || PLAN_COLORS.Desconhecido,
      }))
      .sort((a, b) => b.count - a.count);
  }, [subscriptions]);

  return {
    subscriptions,
    kpis,
    planDistribution,
    isLoading: loadingPlans || loadingData,
    refetch,
  };
};
