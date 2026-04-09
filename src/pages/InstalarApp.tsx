import { useState, useEffect } from "react";
import { Smartphone, Share, MoreVertical, ExternalLink, CheckCircle, Globe, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import InsanoLogo from "@/components/InsanoLogo";
import { Link } from "react-router-dom";
import { detectPlatform, type Platform } from "@/lib/detectPlatform";

const Step = ({ num, children }: { num: number; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
      {num}
    </div>
    <p className="text-sm text-muted-foreground pt-0.5">{children}</p>
  </div>
);

const IOSSafariGuide = () => (
  <div className="space-y-4">
    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
      <Share className="w-7 h-7 text-primary" />
    </div>
    <h1 className="text-xl font-bold font-cinzel text-foreground">Como instalar no iPhone</h1>
    <div className="space-y-3 text-left">
      <Step num={1}>
        Toque no botão <span className="font-semibold text-foreground">Compartilhar</span> (ícone ↑) na barra inferior do Safari.
      </Step>
      <Step num={2}>
        Role para baixo e toque em <span className="font-semibold text-foreground">"Adicionar à Tela de Início"</span>.
      </Step>
      <Step num={3}>
        Toque em <span className="font-semibold text-foreground">"Adicionar"</span> no canto superior direito.
      </Step>
    </div>
    <p className="text-xs text-muted-foreground">
      Pronto! O ícone do ANAAC Club aparecerá na sua tela inicial.
    </p>
  </div>
);

const AndroidChromeGuide = () => (
  <div className="space-y-4">
    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
      <MoreVertical className="w-7 h-7 text-primary" />
    </div>
    <h1 className="text-xl font-bold font-cinzel text-foreground">Como instalar no Android</h1>
    <div className="space-y-3 text-left">
      <Step num={1}>
        Toque nos <span className="font-semibold text-foreground">3 pontinhos</span> (⋮) no canto superior direito do Chrome.
      </Step>
      <Step num={2}>
        Toque em <span className="font-semibold text-foreground">"Instalar aplicativo"</span> ou "Adicionar à tela inicial".
      </Step>
      <Step num={3}>
        Confirme tocando em <span className="font-semibold text-foreground">"Instalar"</span>.
      </Step>
    </div>
  </div>
);

const WebviewGuide = ({ platform }: { platform: Platform }) => {
  const isIOS = platform === "ios-webview";
  return (
    <div className="space-y-4">
      <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
        <ExternalLink className="w-7 h-7 text-destructive" />
      </div>
      <h1 className="text-xl font-bold font-cinzel text-foreground">Abra no navegador</h1>
      <p className="text-sm text-muted-foreground">
        Você está acessando por dentro de outro app (Instagram, WhatsApp, etc). 
        Para instalar, abra no navegador do seu celular:
      </p>
      <div className="space-y-3 text-left">
        {isIOS ? (
          <>
            <Step num={1}>
              Toque no <span className="font-semibold text-foreground">ícone do Safari</span> (🧭) ou nos 3 pontinhos.
            </Step>
            <Step num={2}>
              Escolha <span className="font-semibold text-foreground">"Abrir no navegador"</span> ou "Abrir no Safari".
            </Step>
          </>
        ) : (
          <>
            <Step num={1}>
              Toque nos <span className="font-semibold text-foreground">3 pontinhos</span> (⋮) no topo da tela.
            </Step>
            <Step num={2}>
              Escolha <span className="font-semibold text-foreground">"Abrir no Chrome"</span>.
            </Step>
          </>
        )}
        <Step num={isIOS ? 3 : 3}>
          Depois, siga as instruções de instalação na página.
        </Step>
      </div>
    </div>
  );
};

const StandaloneGuide = () => (
  <div className="space-y-4">
    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
      <CheckCircle className="w-7 h-7 text-green-500" />
    </div>
    <h1 className="text-xl font-bold font-cinzel text-foreground">App já instalado!</h1>
    <p className="text-sm text-muted-foreground">
      Você já está usando o ANAAC Club como aplicativo. Aproveite! 💪
    </p>
  </div>
);

const DesktopGuide = () => (
  <div className="space-y-4">
    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
      <Globe className="w-7 h-7 text-primary" />
    </div>
    <h1 className="text-xl font-bold font-cinzel text-foreground">Instalar no computador</h1>
    <div className="space-y-3 text-left">
      <Step num={1}>
        No Chrome, clique no <span className="font-semibold text-foreground">ícone de instalar</span> (⊕) na barra de endereço.
      </Step>
      <Step num={2}>
        Clique em <span className="font-semibold text-foreground">"Instalar"</span>.
      </Step>
    </div>
    <p className="text-xs text-muted-foreground">
      Para a melhor experiência, recomendamos acessar pelo celular.
    </p>
  </div>
);

const InstalarApp = () => {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const guideMap: Record<Platform, React.ReactNode> = {
    "ios-safari": <IOSSafariGuide />,
    "ios-webview": <WebviewGuide platform="ios-webview" />,
    "android-chrome": <AndroidChromeGuide />,
    "android-webview": <WebviewGuide platform="android-webview" />,
    standalone: <StandaloneGuide />,
    desktop: <DesktopGuide />,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-12 bg-background">
      <InsanoLogo size={80} />

      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        {guideMap[platform]}

        <Button asChild size="lg" className="w-full mt-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default InstalarApp;
