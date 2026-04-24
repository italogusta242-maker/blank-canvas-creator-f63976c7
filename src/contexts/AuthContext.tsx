import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { logAuthFailure } from "@/lib/authFailureLog";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
const SIGN_IN_TIMEOUT_MS = 20000;

/** Race a promise against a timeout. If timeout wins, reject with a clear message. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: tempo limite excedido (${ms / 1000}s). Verifique sua conexão.`)), ms)
    ),
  ]);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roleSet = new Set((roles || []).map((r) => r.role));
      didRedirectRef.current = true;

      // Special roles go to their respective dashboards
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

      // NO RULES: Everyone else goes to the student dashboard
      navigate("/aluno", { replace: true });
    } catch (err) {
      console.error("AuthContext: role check exception", err);
      navigate("/aluno", { replace: true });
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

    const ensureProfileExists = async (userId: string, email: string | undefined, meta: Record<string, any> | undefined) => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.warn("AuthContext: profile check failed", error.message);
        }

        if (!profile) {
          console.warn("AuthContext: profile missing, auto-creating for", userId);
          const fullName = meta?.full_name || meta?.nome || email?.split("@")[0] || "Usuário";
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: fullName,
            email: email || "",
            status: "ativo",
            onboarded: true,
          });
          // Role is created by the database trigger — never from frontend
        }
      } catch (e) {
        console.error("AuthContext: ensureProfileExists error", e);
      }
    };

    const syncSessionState = async (
      newSession: Session | null,
      shouldRedirect: boolean,
      isInitialSession: boolean = false,
    ) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Auto-recover missing profile
      await ensureProfileExists(
        newSession.user.id,
        newSession.user.email,
        newSession.user.user_metadata
      );

      if (!cancelled) setLoading(false);

      if (shouldRedirect) {
        // Boot hardening: if Android WebView (or any platform) restored the
        // session on a deep student subroute (e.g. /aluno/treinos), force
        // the user back to the Home (/aluno). Real fresh logins still go
        // through normal role-based redirect.
        if (isInitialSession && !didRedirectRef.current) {
          const path = window.location.pathname;
          const isDeepStudentRoute =
            path.startsWith("/aluno/") && path !== "/aluno";
          if (isDeepStudentRoute) {
            didRedirectRef.current = true;
            navigate("/aluno", { replace: true });
            return;
          }
        }
        void checkRoleAndRedirect(newSession.user.id);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        const shouldRedirect =
          event === "SIGNED_IN" || event === "INITIAL_SESSION";
        void syncSessionState(
          newSession,
          shouldRedirect,
          event === "INITIAL_SESSION",
        );
      }
    );

    void withTimeout(supabase.auth.getSession(), LOADING_TIMEOUT_MS, "getSession")
      .then(({ data: { session: currentSession } }) => {
        if (cancelled) return;
        if (currentSession) {
          void syncSessionState(currentSession, true, true);
        } else {
          // Safari ITP may clear localStorage before the SDK hydrates.
          // Retry once after a short delay to let Supabase recover tokens.
          setTimeout(() => {
            if (cancelled) return;
            void withTimeout(supabase.auth.getSession(), LOADING_TIMEOUT_MS, "getSession-retry")
              .then(({ data: { session: retry } }) => {
                if (cancelled) return;
                void syncSessionState(retry, true, true);
              })
              .catch((err) => {
                console.error("AuthContext: retry getSession failed", err);
                if (!cancelled) setLoading(false);
              });
          }, 1500);
        }
      })
      .catch((err) => {
        console.error("AuthContext: getSession failed", err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const isLoading = loading;

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: name ? { full_name: name } : {},
            emailRedirectTo: window.location.origin,
          },
        }),
        SIGN_IN_TIMEOUT_MS,
        "Cadastro"
      );
      return { error: error?.message ?? null };
    } catch (err: any) {
      console.error("AuthContext: signUp exception", err);
      return { error: err?.message ?? "Erro ao criar conta." };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SIGN_IN_TIMEOUT_MS,
        "Login"
      );
      if (error?.message) {
        logAuthFailure(email, error.message);
      }
      return { error: error?.message ?? null };
    } catch (err: any) {
      console.error("AuthContext: signIn exception", err);
      logAuthFailure(email, err?.message ?? "Erro ao fazer login.");
      return { error: err?.message ?? "Erro ao fazer login." };
    }
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
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
