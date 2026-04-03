import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import InsanoLogo from "@/components/InsanoLogo";

const AguardandoPagamento = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [activated, setActivated] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.status === "ativo") {
        setActivated(true);
        setTimeout(() => navigate("/cronometro", { replace: true }), 1500);
      }
    } catch (err) {
      console.error("Status check failed:", err);
    } finally {
      setChecking(false);
    }
  }, [user?.id, navigate]);

  // Polling fallback: Safari / websocket failures
  useEffect(() => {
    if (!user?.id || activated) return;

    checkStatus();

    const intervalId = window.setInterval(() => {
      checkStatus();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.id, activated, checkStatus]);

  // Realtime: listen for profile status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === "ativo") {
            setActivated(true);
            setTimeout(() => navigate("/cronometro", { replace: true }), 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate]);

  // Redirect if no user (not logged in)
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (activated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6 p-6 text-center">
        <InsanoLogo size={60} className="mx-auto" showText={false} />
        <CheckCircle2 className="w-14 h-14 text-green-500" />
        <h2 className="text-xl font-bold">Pagamento confirmado! 🎉</h2>
        <p className="text-sm text-muted-foreground">Redirecionando para a plataforma...</p>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6 p-6 text-center">
      <InsanoLogo size={60} className="mx-auto" showText={false} />

      <Loader2 className="w-12 h-12 animate-spin text-primary" />

      <h2 className="text-xl font-bold">Aguardando confirmação do pagamento...</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Assim que seu pagamento for confirmado, você será redirecionado automaticamente.
        Isso pode levar alguns instantes.
      </p>

      <button
        onClick={checkStatus}
        disabled={checking}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all disabled:opacity-50 hover:bg-primary/90"
      >
        {checking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Já paguei, verificar agora
          </>
        )}
      </button>

      <button
        onClick={signOut}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
      >
        <LogOut className="w-3 h-3" />
        Sair
      </button>
    </div>
  );
};

export default AguardandoPagamento;
