import { lazy, Suspense, Component, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SkeletonLayout from "./components/SkeletonLayout";
import OfflineBanner from "./components/OfflineBanner";
import { recoverAppToLogin } from "@/lib/recoverApp";
import { idbPersister, shouldDehydrateQuery } from "@/lib/queryPersister";

// ── App error boundary ────────────────────────────────────
class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; isChunkError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      isChunkError:
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Loading chunk") ||
        error?.message?.includes("Importing a module script failed"),
    };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ChunkErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    void recoverAppToLogin();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground p-6 text-center">
          <p className="text-lg font-semibold">
            {this.state.isChunkError ? "Uma nova versão está disponível" : "O app encontrou um erro ao carregar"}
          </p>
          <p className="text-sm text-muted-foreground">
            {this.state.isChunkError
              ? "Vamos limpar a sessão atual e voltar ao login."
              : "Se algo travou, vamos voltar para o login com segurança."}
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Ir para login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthenticatedApp = lazy(() => import("./app/AuthenticatedApp"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 300_000,   // 5 min — evita re-fetch ao trocar de aba
      gcTime: 24 * 60 * 60 * 1000, // 24h — mantém cache em memória/disco para uso offline
      retry: 2,
      networkMode: "offlineFirst", // mostra cache primeiro mesmo sem rede
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <ChunkErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: idbPersister,
            maxAge: 24 * 60 * 60 * 1000, // 24h
            dehydrateOptions: { shouldDehydrateQuery },
          }}
        >
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineBanner />
              <Suspense fallback={<SkeletonLayout />}>
                <AuthenticatedApp />
              </Suspense>
            </TooltipProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
