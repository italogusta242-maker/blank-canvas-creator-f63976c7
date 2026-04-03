import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import InsanoLogo from "@/components/InsanoLogo";
import { Link } from "react-router-dom";

const InstalarApp = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-12 bg-background">
      <InsanoLogo size={80} />

      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-cinzel text-foreground">Acesso estável no navegador</h1>
          <p className="text-muted-foreground">
            A instalação offline foi removida para evitar tela branca e cache quebrado. Use a versão web normalmente.
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link to="/">Voltar para entrar</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Se quiser, depois eu posso deixar o app apenas adicionável à tela inicial, sem service worker.
        </p>
      </div>
    </div>
  );
};

export default InstalarApp;
