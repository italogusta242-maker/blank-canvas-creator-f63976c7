import { lazy, Suspense, Component, type ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import SkeletonLayout from "./components/SkeletonLayout";
import { recoverAppToLogin } from "@/lib/recoverApp";

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
      refetchOnWindowFocus: false, // Minimiza chamadas massivas, mas sem quebrar caches de outras páginas
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <ChunkErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<SkeletonLayout />}>
                <AuthenticatedApp />
              </Suspense>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
