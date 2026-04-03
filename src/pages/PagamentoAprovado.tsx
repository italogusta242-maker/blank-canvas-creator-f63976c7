import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import InsanoLogo from "@/components/InsanoLogo";

const PagamentoAprovado = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"logging_in" | "success" | "manual">("logging_in");

  useEffect(() => {
    const autoLogin = async () => {
      const email = localStorage.getItem("pending_email");
      const password = localStorage.getItem("pending_password");

      // Always clean credentials after reading
      localStorage.removeItem("pending_password");
      localStorage.removeItem("pending_email");
      localStorage.removeItem("pending_checkout_ref");
      localStorage.removeItem("post_payment_redirect");

      if (!email || !password) {
        setStatus("manual");
        return;
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          console.error("Auto-login failed:", error.message);
          setStatus("manual");
          setTimeout(() => navigate("/auth", { replace: true }), 3000);
          return;
        }

        // Login successful — AuthContext will handle redirect:
        // if profile.status === 'ativo' → /cronometro
        // if profile.status === 'pendente' → /aguardando-pagamento
        setStatus("success");
      } catch (err) {
        console.error("Auto-login error:", err);
        setStatus("manual");
        setTimeout(() => navigate("/auth", { replace: true }), 3000);
      }
    };

    autoLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6 p-6 text-center">
      <InsanoLogo size={60} className="mx-auto" showText={false} />

      {status === "logging_in" && (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Pagamento confirmado! 🎉</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Estamos preparando seu acesso...
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <h2 className="text-xl font-bold">Tudo pronto! 🚀</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Redirecionando...
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </>
      )}

      {status === "manual" && (
        <>
          <LogIn className="w-10 h-10 text-primary" />
          <h2 className="text-xl font-bold">Pagamento confirmado! 🎉</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Faça login com o email e senha que você cadastrou no pré-cadastro para acessar a plataforma.
          </p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="mt-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
          >
            Ir para o Login
          </button>
        </>
      )}
    </div>
  );
};

export default PagamentoAprovado;
