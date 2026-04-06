import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SkeletonLayout from "@/components/SkeletonLayout";
import { DashboardSkeleton, TreinosSkeleton, DietaSkeleton, ComunidadeSkeleton, DesafioSkeleton, PerfilSkeleton } from "@/components/skeletons/AppSkeletons";
import RoleGuard from "@/components/RoleGuard";
import StudentGuard from "@/components/StudentGuard";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const EsqueciMinhaSenha = lazy(() => import("@/pages/EsqueciMinhaSenha"));
const RedefinirSenha = lazy(() => import("@/pages/RedefinirSenha"));
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDesafios from "@/pages/admin/AdminDesafios";
const AdminCupons = lazy(() => import("@/pages/admin/AdminCupons"));
const AdminFunil = lazy(() => import("@/pages/admin/AdminFunil"));
const AdminTesteWebhook = lazy(() => import("@/pages/admin/AdminTesteWebhook"));
const AdminFaturamento = lazy(() => import("@/pages/admin/AdminFaturamento"));
const AdminImportarAlunos = lazy(() => import("@/pages/admin/AdminImportarAlunos"));
const AdminPremiacoes = lazy(() => import("@/pages/admin/AdminPremiacoes"));
const AdminWebhookLogs = lazy(() => import("@/pages/admin/AdminWebhookLogs"));
const AdminAvisos = lazy(() => import("@/pages/admin/AdminAvisos"));
const AdminPontuacao = lazy(() => import("@/pages/admin/AdminPontuacao"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const ConviteAcesso = lazy(() => import("@/pages/ConviteAcesso"));
const BattleMode = lazy(() => import("@/pages/BattleMode"));
const Treinos = lazy(() => import("@/pages/Treinos"));
const Dieta = lazy(() => import("@/pages/Dieta"));
const DietPlan = lazy(() => import("@/components/diet/DietPlan"));
const Desafio = lazy(() => import("@/pages/Desafio"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsuarios = lazy(() => import("@/pages/admin/AdminUsuarios"));
const AdminRelatorios = lazy(() => import("@/pages/admin/AdminRelatorios"));
const FunnelWrapper = lazy(() => import("@/components/funnel/FunnelWrapper"));
const FunnelModernWrapper = lazy(() => import("@/components/funnel/FunnelModernWrapper"));
const Comunidade = lazy(() => import("@/pages/Comunidade"));
const Cronometro = lazy(() => import("@/pages/Cronometro"));
const PagamentoAprovado = lazy(() => import("@/pages/PagamentoAprovado"));
const AguardandoPagamento = lazy(() => import("@/pages/AguardandoPagamento"));
const AcessoNegado = lazy(() => import("@/pages/AcessoNegado"));

const PageLoader = () => <SkeletonLayout />;

const AppRoutes = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  

  const isInviteRoute = location.pathname.startsWith("/convite");

  if (loading) return <SkeletonLayout />;

  if (isInviteRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/convite/:token" element={<ConviteAcesso />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/instalar") {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === "/") {
    if (user) return <Navigate to="/aluno" replace />;
    return <AuthPage />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Funnel routes kept for external traffic but removed from nav */}
        <Route path="/funil" element={<FunnelWrapper />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/esqueci-minha-senha" element={<EsqueciMinhaSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/pagamento-sucesso" element={<PagamentoAprovado />} />
        <Route path="/aguardando-pagamento" element={<AguardandoPagamento />} />
        <Route path="/acesso-negado" element={<AcessoNegado />} />
        {/* /dashboard redirects to /aluno for student users */}
        <Route path="/dashboard" element={<Navigate to="/aluno" replace />} />

        <Route element={<StudentGuard />}>
          <Route path="/cronometro" element={<Cronometro />} />
          <Route path="/aluno" element={<AppLayout dishonorMode={false} setDishonorMode={() => {}} />}>
            <Route index element={<Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense>} />
            <Route path="desafio" element={<Suspense fallback={<DesafioSkeleton />}><Desafio /></Suspense>} />
            <Route path="treinos" element={<Suspense fallback={<TreinosSkeleton />}><Treinos /></Suspense>} />
            <Route path="dieta" element={<Suspense fallback={<DietaSkeleton />}><DietPlan /></Suspense>} />
            <Route path="comunidade" element={<Suspense fallback={<ComunidadeSkeleton />}><Comunidade /></Suspense>} />
            <Route path="perfil/:userId?" element={<Suspense fallback={<PerfilSkeleton />}><Perfil /></Suspense>} />
            <Route path="batalha" element={<Suspense fallback={<DashboardSkeleton />}><BattleMode /></Suspense>} />
          </Route>
        </Route>

        <Route element={<RoleGuard allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/desafios" element={<AdminDesafios />} />
            <Route path="/admin/cupons" element={<AdminCupons />} />
            <Route path="/admin/relatorios" element={<AdminRelatorios />} />
            {/* Admin Funil route removed */}
            <Route path="/admin/faturamento" element={<AdminFaturamento />} />
            <Route path="/admin/teste-webhook" element={<AdminTesteWebhook />} />
            <Route path="/admin/importar-alunos" element={<AdminImportarAlunos />} />
            <Route path="/admin/premiacoes" element={<AdminPremiacoes />} />
            <Route path="/admin/webhook-logs" element={<AdminWebhookLogs />} />
            <Route path="/admin/avisos" element={<AdminAvisos />} />
            <Route path="/admin/pontuacao" element={<AdminPontuacao />} />
          </Route>
        </Route>

        <Route path="*" element={<DefaultRedirect loggedIn={!!user} />} />
      </Routes>
    </Suspense>
  );
};

const DefaultRedirect = ({ loggedIn }: { loggedIn: boolean }) => {
  if (loggedIn) return <Navigate to="/aluno" replace />;
  return <Navigate to="/" replace />;
};

const AuthenticatedApp = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AuthenticatedApp;