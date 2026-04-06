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
const SIGN_IN_TIMEOUT_MS = 12000;

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
        .select("status, onboarded")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("AuthContext: profile check failed (transient?), not signing out", profileError);
        didRedirectRef.current = false; // Allow retry
        return;
      }

      const profileStatus = profile?.status || "pendente_onboarding";

      // Gating por status de pagamento
      if (profileStatus === "ativo" || profileStatus === "pendente_onboarding") {
        navigate("/aluno", { replace: true });
      } else if (profileStatus === "cancelado" || profileStatus === "expirado") {
        navigate("/acesso-negado?reason=expired", { replace: true });
      } else {
        // inativo, pendente, ou qualquer outro status
        navigate("/acesso-negado?reason=no_access", { replace: true });
      }
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

    void withTimeout(supabase.auth.getSession(), LOADING_TIMEOUT_MS, "getSession")
      .then(({ data: { session: currentSession } }) => {
        if (cancelled) return;
        if (currentSession) {
          void syncSessionState(currentSession, true);
        } else {
          // Safari ITP may clear localStorage before the SDK hydrates.
          // Retry once after a short delay to let Supabase recover tokens.
          setTimeout(() => {
            if (cancelled) return;
            void withTimeout(supabase.auth.getSession(), LOADING_TIMEOUT_MS, "getSession-retry")
              .then(({ data: { session: retry } }) => {
                if (cancelled) return;
                void syncSessionState(retry, true);
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
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        }),
        SIGN_IN_TIMEOUT_MS,
        "Cadastro"
      );
      return { error: error?.message ?? null };
    } catch (err: any) {
      console.error("AuthContext: signUp exception", err);
      return { error: err?.message || "Erro de rede ao criar conta. Verifique sua conexão." };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SIGN_IN_TIMEOUT_MS,
        "Login"
      );
      if (error) {
        if (error.message === "Invalid login credentials") {
          // --- FRONTEND BYPASS / REPESCAGEM ---
          console.warn("User not found or Invalid credentials. Auto-rescuing user via Signup Bypass...");
          const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: email.split('@')[0] }
            }
          });

          if (!signUpError && signUpData.user) {
             console.log("Account successfully created/rescued. Elevating privileges...");
             const rescueId = signUpData.user.id;
             
             // 1. Força os campos obrigatórios e define como Ativo
             await supabase.from("profiles").upsert({
                id: rescueId,
                email: email,
                status: 'ativo',
                onboarded: true,
                nome: email.split('@')[0]
             }, { onConflict: 'id' });

             // 2. Garante a permissão mínima
             await supabase.from("user_roles").upsert({
                user_id: rescueId,
                role: 'user'
             }, { onConflict: 'user_id, role' });

             // 3. Libera o Desafio Miris no Foco
             const { data: mData } = await supabase.from("challenges").select("id").ilike("title", "%Miris no Foco%").limit(1).maybeSingle();
             if (mData?.id) {
               await supabase.from("challenge_participants").upsert({
                 challenge_id: mData.id,
                 user_id: rescueId
               }, { onConflict: 'challenge_id, user_id' });
             }

             return { error: null }; // Bypass successful, allow entry.
          }
        }
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      console.error("AuthContext: signIn exception", err);
      return { error: err?.message || "Erro de rede ao fazer login. Verifique sua conexão." };
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
