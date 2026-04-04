import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const LOADING_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const didRedirectRef = useRef(false);
  const isSigningOutRef = useRef(false);

  const safeSignOut = async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro no logout seguro:", e);
    } finally {
      setUser(null);
      setSession(null);
      setOnboarded(false);
      isSigningOutRef.current = false;
      navigate("/", { replace: true });
    }
  };

  const checkRoleAndRedirect = async (userId: string) => {
    if (didRedirectRef.current) return;
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/closer") || path.startsWith("/cs") || path.startsWith("/convite") || path.startsWith("/aluno") || path.startsWith("/funil") || path.startsWith("/pagamento") || path.startsWith("/aguardando-pagamento")) return;

    // Check if user just came from payment flow
    const postPayment = localStorage.getItem("post_payment_redirect");
    if (postPayment === "true") {
      localStorage.removeItem("post_payment_redirect");
      localStorage.removeItem("pending_email");
      localStorage.removeItem("pending_password");
      localStorage.removeItem("pending_checkout_ref");
      didRedirectRef.current = true;
      navigate("/cronometro", { replace: true });
      return;
    }

    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.warn("AuthContext: role check failed (transient?), not signing out", rolesError);
        return; // Don't sign out on transient errors - let the user stay
      }

      const roleSet = new Set((roles || []).map((r) => r.role));
      didRedirectRef.current = true;

      if (roleSet.has("admin")) {
        navigate("/admin", { replace: true });
        return;
      }
      if (roleSet.has("cs")) {
        navigate("/cs", { replace: true });
        return;
      }
      if (roleSet.has("closer")) {
        navigate("/closer", { replace: true });
        return;
      }

      // Regular users → check profile status for payment gating
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("AuthContext: profile check failed (transient?), not signing out", profileError);
        didRedirectRef.current = false; // Allow retry
        return;
      }

      const profileStatus = profile?.status || "pendente_onboarding";

      // EMERGÊNCIA: Todos os usuários logados têm acesso liberado ao aplicativo
      navigate("/aluno", { replace: true });
    } catch (err) {
      console.error("AuthContext: role check exception, keeping session", err);
      // Don't sign out on exceptions - could be network issues
      didRedirectRef.current = false;
    }
  };

  useEffect(() => {
    didRedirectRef.current = false;
    let cancelled = false;

    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn("AuthContext: loading timeout, forcing ready state");
        setLoading(false);
      }
    }, LOADING_TIMEOUT_MS);

    const syncSessionState = async (newSession: Session | null, shouldRedirect: boolean) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setOnboarded(false);
        if (!cancelled) setLoading(false);
        return;
      }

      setOnboarded(true);

      if (!cancelled) setLoading(false);

      if (shouldRedirect) {
        void checkRoleAndRedirect(newSession.user.id);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        void syncSessionState(newSession, event === "SIGNED_IN" || event === "INITIAL_SESSION");
      }
    );

    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (cancelled) return;
      if (currentSession) {
        void syncSessionState(currentSession, true);
      } else {
        // Safari ITP may clear localStorage before the SDK hydrates.
        // Retry once after a short delay to let Supabase recover tokens.
        setTimeout(() => {
          if (cancelled) return;
          void supabase.auth.getSession().then(({ data: { session: retry } }) => {
            if (cancelled) return;
            void syncSessionState(retry, true);
          });
        }, 1500);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isLoading = loading;

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    didRedirectRef.current = false;
    await safeSignOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading: isLoading,
      onboarded,
      setOnboarded,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
