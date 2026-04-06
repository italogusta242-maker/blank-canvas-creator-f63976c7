import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AcessoNegado from "@/pages/AcessoNegado";
import SkeletonLayout from "@/components/SkeletonLayout";

const ROLE_CHECK_TIMEOUT_MS = 4000;

type AllowedRole = "admin" | "closer" | "cs" | "personal" | "nutricionista";

interface RoleGuardProps {
  allowedRoles: AllowedRole[];
}

const rolesCache: { userId: string | null; roles: string[] } = { userId: null, roles: [] };

const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        setHasAccess(false);
        return;
      }

      if (rolesCache.userId === user.id && rolesCache.roles.length > 0) {
        const allowed = allowedRoles.some((role) => rolesCache.roles.includes(role));
        setHasAccess(allowed);
        setChecking(false);
        return;
      }

      let data;
      let error;

      try {
        const result = await Promise.race([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("ROLE_CHECK_TIMEOUT")), ROLE_CHECK_TIMEOUT_MS)
          ),
        ]);

        data = result.data;
        error = result.error;
      } catch (timeoutError) {
        console.error("RoleGuard: timeout checking roles", timeoutError);
        setHasAccess(false);
        setChecking(false);
        return;
      }

      if (error) {
        console.error("RoleGuard: error fetching roles", error);
        setHasAccess(false);
        setChecking(false);
        return;
      }

      const userRoles = (data ?? []).map((r) => r.role);
      rolesCache.userId = user.id;
      rolesCache.roles = userRoles;

      const allowed = allowedRoles.some((role) => userRoles.includes(role));
      setHasAccess(allowed);
      setChecking(false);
    };

    if (!loading) {
      checkRole();
    }
  }, [user, loading, allowedRoles]);

  if (loading || checking) {
    return <SkeletonLayout />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasAccess) {
    console.warn(`[SECURITY] Acesso negado à rota admin para user ${user.email} (${user.id}). Roles: ${rolesCache.roles.join(", ") || "nenhuma"}`);
    return <AcessoNegado />;
  }

  return <Outlet />;
};

export default RoleGuard;
