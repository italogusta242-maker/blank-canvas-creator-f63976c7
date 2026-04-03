import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import InsanoLogo from "@/components/InsanoLogo";

const PagamentoAprovado = () => {
  const navigate = useNavigate();

  // Limpa imediatamente qualquer traço temporário caso existisse, para garantir limpeza
  useEffect(() => {
     localStorage.removeItem("pending_password");
     localStorage.removeItem("pending_email");
     localStorage.removeItem("pending_checkout_ref");
     localStorage.removeItem("post_payment_redirect");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6 p-6 text-center">
      <InsanoLogo size={60} className="mx-auto" showText={false} />

      <LogIn className="w-10 h-10 text-primary" />
      <h2 className="text-xl font-bold">Pagamento confirmado! 🎉</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Seu pré-cadastro já foi concluído! Agora, use o email e senha que você escolheu no passo anterior para acessar a plataforma oficial.
      </p>
      
      <button
        onClick={() => navigate("/", { replace: true })}
        className="mt-4 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg transition-all"
      >
        Acessar Área de Membros
      </button>
    </div>
  );
};

export default PagamentoAprovado;
