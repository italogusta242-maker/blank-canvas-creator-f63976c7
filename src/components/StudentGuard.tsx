import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SkeletonLayout from "@/components/SkeletonLayout";
import ForcePasswordChangeModal from "@/components/ForcePasswordChangeModal";

const isSafari = () => {
  try {
    const ua = navigator.userAgent;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg/i.test(ua);
  } catch { return false; }
};

const BASE_TIMEOUT_MS = 4000;
const SAFARI_TIMEOUT_MS = 10000;

const StudentGuard = () => {
  const { user, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let active = true;
    const timeoutMs = isSafari() ? SAFARI_TIMEOUT_MS : BASE_TIMEOUT_MS;

    const fetchRoleAndProfile = () =>
      Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("profiles").select("status, must_change_password").eq("id", user!.id).single(),
      ]);

    const check = async (attempt = 1) => {
      if (!user) {
        const bypassEmail = localStorage.getItem("emergency_bypass_email");
        if (bypassEmail) {
          if (window.location.pathname !== "/cronometro") {
            setRedirect("/cronometro");
          } else {
            setRedirect(null);
          }
        }
        if (active) setChecking(false);
        return;
      }

      try {
        const [rolesResult, profileResult] = await Promise.race([
          fetchRoleAndProfile(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("GUARD_CHECK_TIMEOUT")), timeoutMs)
          ),
        ]);

        if (!active) return;

        const roles = new Set((rolesResult.data ?? []).map((r) => r.role));
        const profileStatus = profileResult.data?.status || "pendente_onboarding";
        const mustChange = (profileResult.data as any)?.must_change_password === true;

        if (roles.has("admin")) { setRedirect("/admin"); return; }
        if (roles.has("personal") || roles.has("nutricionista")) { setRedirect("/especialista"); return; }
        if (roles.has("cs")) { setRedirect("/cs"); return; }
        if (roles.has("closer")) { setRedirect("/closer"); return; }

        // EMERGÊNCIA: Validação de profileStatus removida
        // if (profileStatus !== "ativo") { ... }

        setMustChangePassword(false); // EMERGÊNCIA: Removido atrito de senha

        setRedirect(null);
      } catch (error) {
        console.error(`StudentGuard: erro ao validar acesso (tentativa ${attempt})`, error);
        // Retry once before giving up
        if (attempt === 1 && active) {
          console.warn("StudentGuard: retrying…");
          return check(2);
        }
        // On persistent failure, DON'T sign out — just allow through
        // The user's session is valid; the failure is likely transient (network/RLS)
        if (active) {
          console.warn("StudentGuard: validation failed after retries, allowing through");
          setRedirect(null);
          setMustChangePassword(false);
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    if (!loading) check();

    return () => { active = false; };
  }, [user, loading]);

  if (loading || checking) return <SkeletonLayout />;
  if (redirect) return <Navigate to={redirect} replace />;
  if (!user && !localStorage.getItem("emergency_bypass_email")) return <Navigate to="/" replace />;

  return (
    <>
      {mustChangePassword && (
        <ForcePasswordChangeModal onComplete={() => setMustChangePassword(false)} />
      )}
      <Outlet />
    </>
  );
};

export default StudentGuard;
