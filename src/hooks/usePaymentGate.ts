/**
 * usePaymentGate
 * 
 * Determines if the current user has an active paid access.
 * Reads from `user_product_access` table. If the user has no active record,
 * the hook returns `blocked = true` and a reason.
 * 
 * Usage:
 *   const { blocked, reason, isLoading } = usePaymentGate();
 *   if (blocked) return <Navigate to="/acesso-negado" />;
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BlockReason = "no_access" | "expired" | "loading" | "free";

export interface PaymentGate {
  isLoading: boolean;
  blocked: boolean;
  reason: BlockReason | null;
  accessData: {
    plan_id?: string;
    expires_at?: string | null;
    group_id?: string | null;
  } | null;
}

export function usePaymentGate(): PaymentGate {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-gate", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check for active product access
      const { data: access, error } = await (supabase as any)
        .from("user_product_access")
        .select("plan_id, expires_at, group_id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.warn("usePaymentGate: query failed, allowing access", error);
        return { allowed: true, reason: null, accessData: null };
      }

      if (!access) {
        return { allowed: false, reason: "no_access" as BlockReason, accessData: null };
      }

      // Check expiry if set
      if (access.expires_at) {
        const expiresAt = new Date(access.expires_at);
        if (expiresAt < new Date()) {
          return {
            allowed: false,
            reason: "expired" as BlockReason,
            accessData: { plan_id: access.plan_id, expires_at: access.expires_at, group_id: access.group_id },
          };
        }
      }

      return {
        allowed: true,
        reason: null,
        accessData: { plan_id: access.plan_id, expires_at: access.expires_at, group_id: access.group_id },
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 min cache — access rarely changes mid-session
    gcTime: 1000 * 60 * 30,
  });

  if (isLoading || !user) {
    return { isLoading: true, blocked: false, reason: "loading", accessData: null };
  }

  if (!data || !data.allowed) {
    return {
      isLoading: false,
      blocked: true,
      reason: (data?.reason as BlockReason) ?? "no_access",
      accessData: data?.accessData ?? null,
    };
  }

  return {
    isLoading: false,
    blocked: false,
    reason: null,
    accessData: data.accessData,
  };
}
