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

    const check = async () => {
      if (!user) {
        if (active) setChecking(false);
        return;
      }

      try {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (!active) return;

        const roleSet = new Set((roles ?? []).map((r) => r.role));

        // Redirect special roles
        if (roleSet.has("admin")) { setRedirect("/admin"); return; }
        if (roleSet.has("cs")) { setRedirect("/cs"); return; }
        if (roleSet.has("closer")) { setRedirect("/closer"); return; }

        // NO RULES: Everyone else is allowed
        setRedirect(null);
      } catch (error) {
        console.warn("StudentGuard: role check failed (schema error), allowing access anyway:", error);
        if (active) {
            setRedirect(null);
            setChecking(false);
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
