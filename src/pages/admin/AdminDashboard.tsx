import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, TrendingUp, AlertTriangle,
  Activity, Loader2
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KpiDetailModal, type KpiDetailItem } from "@/components/ui/kpi-detail-modal";
import { useNavigate } from "react-router-dom";
import { injectMockGamificationData } from "@/lib/testEnvironment";
import { useAuth } from "@/contexts/AuthContext";

// ── Helpers ──
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type ModalKey = "ativos" | "engajamento" | "alertas" | "closer" | "especialistas" | null;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [chartTimeframe, setChartTimeframe] = useState<"1D" | "7D" | "30D">("7D");

  // ── 1. All profiles ──
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, email, status, created_at");
      return data || [];
    },
  });

  // ── 2. Workouts last 30 days ──
  const { data: workouts = [] } = useQuery({
    queryKey: ["admin-workouts-30d"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from("workouts").select("id, user_id, started_at").gte("started_at", since);
      return data || [];
    },
  });

  // ── 3. Diet logs last 30 days ──
  const { data: dietLogs = [] } = useQuery({
    queryKey: ["admin-diet-logs-30d"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from("meal_logs").select("id, user_id, logged_at").gte("logged_at", since);
      return data || [];
    },
  });

  // ── 4. Check-ins last 7 days ──
  const { data: checkins = [] } = useQuery({
    queryKey: ["admin-checkins-7d"],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const { data } = await supabase.from("psych_checkins").select("id, user_id, created_at").gte("created_at", since);
      return data || [];
    },
  });

  // ── 4. Closer invites ──
  const { data: closerInvites = [] } = useQuery({
    queryKey: ["admin-closer-invites"],
    queryFn: async () => {
      const { data } = await supabase.from("invites").select("id, email, name, status, plan_value, created_at");
      return data || [];
    },
  });

  // ── 5. Specialists ──
  const { data: specialists = [] } = useQuery({
    queryKey: ["admin-specialists"],
    queryFn: async () => {
      const { data: rolesData } = await supabase.from("user_roles").select("user_id").in("role", ["nutricionista", "personal"]);
      if (!rolesData || rolesData.length === 0) return [];
      const specIds = rolesData.map(r => r.user_id);
      const [profilesRes, studentsRes] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").in("id", specIds),
        supabase.from("student_specialists").select("specialist_id").in("specialist_id", specIds),
      ]);
      const profilesData = profilesRes.data || [];
      const studentsData = studentsRes.data || [];
      return profilesData.map(p => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        studentCount: studentsData.filter(s => s.specialist_id === p.id).length
      }));
    },
  });

  // ── 6. Staff user IDs + roles (for inactivity alerts) ──
  const { data: staffRolesMap = {} as Record<string, string> } = useQuery({
    queryKey: ["admin-staff-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["nutricionista", "personal", "cs", "closer"]);
      const map: Record<string, string> = {};
      (data || []).forEach(r => {
        const label = r.role === "nutricionista" ? "Nutricionista" : r.role === "personal" ? "Personal" : r.role === "cs" ? "CS" : "Closer";
        map[r.user_id] = label;
      });
      return map;
    },
  });
  const staffUserIds = Object.keys(staffRolesMap);

  const loading = loadingProfiles;

  // ── Derived KPIs ──
  const activeProfiles = profiles.filter((p) => p.status === "ativo");
  const pendingProfiles = profiles.filter((p) => p.status === "pendente" || p.status === "pendente_onboarding");
  const totalUsers = profiles.length;

  const thirtyDaysAgo = subDays(new Date(), 30);
  const oldUsers = profiles.filter((p) => p.created_at && new Date(p.created_at) < thirtyDaysAgo);
  const retainedUsers = oldUsers.filter((p) => p.status === "ativo");
  const retention = oldUsers.length > 0 ? Math.round((retainedUsers.length / oldUsers.length) * 100) : 0;

  // Alertas: users ativos sem treino há 3+ dias (based on workouts)
  const today = startOfDay(new Date());
  const userLastWorkout = new Map<string, string>();
  for (const w of workouts) {
    const existing = userLastWorkout.get(w.user_id);
    if (!existing || w.started_at > existing) {
      userLastWorkout.set(w.user_id, w.started_at);
    }
  }
  // Alertas: alunos ativos (não-staff) sem treino há 14+ dias
  const studentProfiles = activeProfiles.filter((p) => !staffUserIds.includes(p.id));
  const alertUsers = studentProfiles.filter((p) => {
    const lastW = userLastWorkout.get(p.id);
    if (!lastW) return true; // nunca treinou
    const diff = differenceInDays(today, parseISO(lastW));
    return diff >= 14;
  });

  // ── Engagement KPI (users with BOTH workout AND diet activity in last 7 days) ──
  const userLastDiet = new Map<string, string>();
  for (const d of dietLogs) {
    const existing = userLastDiet.get(d.user_id);
    if (!existing || d.logged_at > existing) {
      userLastDiet.set(d.user_id, d.logged_at);
    }
  }

  const engagedUsers = studentProfiles.filter((p) => {
    const lastW = userLastWorkout.get(p.id);
    const lastD = userLastDiet.get(p.id);
    const hasWorkout = lastW && differenceInDays(today, parseISO(lastW)) <= 7;
    const hasDiet = lastD && differenceInDays(today, parseISO(lastD)) <= 7;
    return hasWorkout || hasDiet;
  });

  // Adherence score calculation
  const getAdherenceScore = (userId: string) => {
    const lastW = userLastWorkout.get(userId);
    const lastD = userLastDiet.get(userId);
    let score = 0;
    if (lastW && differenceInDays(today, parseISO(lastW)) <= 7) score += 50;
    if (lastD && differenceInDays(today, parseISO(lastD)) <= 7) score += 50;
    return score;
  };

  const engagementRate = studentProfiles.length > 0
    ? Math.round((engagedUsers.length / studentProfiles.length) * 100)
    : 0;

  const kpiData: { label: string; value: string; icon: typeof Users; modal: ModalKey }[] = [
    { label: "Usuários Ativos", value: String(activeProfiles.length), icon: Users, modal: "ativos" },
    { label: "Engajamento", value: `${engagementRate}%`, icon: TrendingUp, modal: "engajamento" },
    { label: "Alertas", value: String(alertUsers.length), icon: AlertTriangle, modal: "alertas" },
  ];

  // ── Engagement chart (respects chartTimeframe) ──
  const chartDays = chartTimeframe === "1D" ? 1 : chartTimeframe === "7D" ? 7 : 30;
  const engagementData = Array.from({ length: chartDays === 1 ? 24 : chartDays }, (_, i) => {
    if (chartDays === 1) {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
      const hourEnd = new Date(hour.getTime() + 3600000);
      const dayWorkouts = workouts.filter((w) => { const d = new Date(w.started_at); return d >= hour && d < hourEnd; });
      const dayDiets = dietLogs.filter((d) => { const dt = new Date(d.logged_at); return dt >= hour && dt < hourEnd; });
      return { day: `${hour.getHours()}h`, treinos: new Set(dayWorkouts.map((w) => w.user_id)).size, dieta: new Set(dayDiets.map((d) => d.user_id)).size };
    }
    const date = subDays(new Date(), chartDays - 1 - i);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayLabel = format(date, "dd/MM", { locale: ptBR });
    const dayWorkouts = workouts.filter((w) => { const d = new Date(w.started_at); return d >= dayStart && d < dayEnd; });
    const dayDiets = dietLogs.filter((d) => { const dt = new Date(d.logged_at); return dt >= dayStart && dt < dayEnd; });
    return {
      day: dayLabel,
      treinos: new Set(dayWorkouts.map((w) => w.user_id)).size,
      dieta: new Set(dayDiets.map((d) => d.user_id)).size,
    };
  });

  // ── Status distribution ──
  const statusDistribution = [
    { name: "Ativos", value: activeProfiles.length, color: "hsl(140, 60%, 40%)" },
    { name: "Pendentes", value: pendingProfiles.length, color: "hsl(40, 80%, 50%)" },
    { name: "Inativos", value: profiles.filter((p) => p.status === "inativo" || p.status === "cancelado").length, color: "hsl(0, 70%, 45%)" },
  ];

  // ── Alert details ──
  const alertDetails = alertUsers
    .map((p) => {
      const lastW = userLastWorkout.get(p.id);
      const daysSince = lastW ? differenceInDays(today, parseISO(lastW)) : 999;
      const lastAccess = lastW ? format(parseISO(lastW), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : null;
      return { id: p.id, name: p.nome || "Sem nome", email: p.email || "", days: daysSince, lastAccess, role: "Aluno" };
    })
    .sort((a, b) => b.days - a.days);

  // ── Modal items builders ──
  const getModalItems = (): KpiDetailItem[] => {
    switch (activeModal) {
      case "ativos":
        return activeProfiles.map(p => ({
          id: p.id,
          title: p.nome || "Sem nome",
          subtitle: p.email || "",
          badge: "Ativo",
          badgeVariant: "success" as const,
          actionLabel: "Ver perfil",
          onAction: () => { setActiveModal(null); navigate(`/admin/usuarios`); },
        }));
      case "engajamento":
        return engagedUsers.map(p => {
          const score = getAdherenceScore(p.id);
          const lastW = userLastWorkout.get(p.id);
          const lastD = userLastDiet.get(p.id);
          const hasWorkout = lastW && differenceInDays(today, parseISO(lastW)) <= 7;
          const hasDiet = lastD && differenceInDays(today, parseISO(lastD)) <= 7;
          return {
            id: p.id,
            title: p.nome || "Sem nome",
            subtitle: `Treino: ${hasWorkout ? "✅" : "❌"} · Dieta: ${hasDiet ? "✅" : "❌"} · Nota: ${score}/100`,
            badge: score >= 100 ? "Excelente" : score >= 50 ? "Parcial" : "Baixo",
            badgeVariant: score >= 100 ? "success" as const : score >= 50 ? "warning" as const : "danger" as const,
          };
        });
      case "alertas":
        return alertDetails.map(a => ({
          id: a.id,
          title: a.name,
          subtitle: a.lastAccess ? `Último acesso: ${a.lastAccess}` : "Sem registro de acesso",
          badge: a.days >= 7 ? "Crítico" : "Atenção",
          badgeVariant: a.days >= 7 ? "danger" as const : "warning" as const,
          actionLabel: "Contatar",
          onAction: () => { setActiveModal(null); navigate(`/admin/usuarios`); },
        }));
      case "closer":
        return closerInvites.map(i => ({
          id: i.id,
          title: i.name || i.email,
          subtitle: `${i.email} · R$ ${(i.plan_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          badge: i.status === "used" ? "Convertido" : i.status === "pending" ? "Pendente" : "Expirado",
          badgeVariant: i.status === "used" ? "success" as const : i.status === "pending" ? "warning" as const : "danger" as const,
        }));
      default:
        return [];
    }
  };

  const getModalTitle = (): string => {
    switch (activeModal) {
      case "ativos": return "Usuários Ativos";
      case "engajamento": return "Engajamento 7 Dias";
      case "alertas": return "Alertas de Inatividade";
      case "closer": return "Performance do Closer";
      default: return "";
    }
  };

  const getModalDescription = (): string => {
    switch (activeModal) {
      case "ativos": return `${activeProfiles.length} usuários com status ativo na plataforma`;
      case "engajamento": return `${engagedUsers.length} de ${studentProfiles.length} alunos com atividade de Treino e/ou Dieta nos últimos 7 dias`;
      case "alertas": return `${alertUsers.length} usuários ativos sem treinar há 14+ dias`;
      case "closer": return `${closerInvites.length} convites · ${closerInvites.filter(i => i.status === 'used').length} convertidos`;
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada da plataforma INFOSAAS ANNAC</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-primary" />
        </div>
      </div>



      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {kpiData.map((kpi) => (
          <Card
            key={kpi.label}
            className="bg-card border-border cursor-pointer hover:border-primary/30 hover:bg-secondary/20 transition-all duration-200 active:scale-[0.98]"
            onClick={() => setActiveModal(kpi.modal)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon size={18} className="text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row — engagement line chart with 1D/7D/30D filter, pink color */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Engajamento</CardTitle>
              <div className="flex gap-1">
                {(["1D", "7D", "30D"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartTimeframe(t)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      chartTimeframe === t
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 15%)" />
                <XAxis dataKey="day" stroke="hsl(222 20% 55%)" fontSize={12} />
                <YAxis stroke="hsl(222 20% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 47% 16%)", borderRadius: 8, color: "hsl(0 0% 90%)" }}
                  labelStyle={{ color: "hsl(342 100% 67%)" }}
                  itemStyle={{ color: "hsl(0 0% 90%)" }}
                />
                <Line type="monotone" dataKey="treinos" stroke="hsl(342 100% 57%)" strokeWidth={2.5} dot={{ fill: "hsl(342 100% 57%)", r: 3 }} activeDot={{ r: 5 }} name="Treinos" />
                <Line type="monotone" dataKey="dieta" stroke="hsl(140 60% 50%)" strokeWidth={2} dot={{ fill: "hsl(140 60% 50%)", r: 2.5 }} name="Dieta" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(342 100% 57%)" }} /> Treinos</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(140 60% 50%)" }} /> Dieta</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4">
        <Card
          className="bg-card border-border cursor-pointer hover:border-primary/30 transition-all duration-200"
          onClick={() => setActiveModal("alertas")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" />
              Alertas de Inatividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertDetails.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta no momento 🎉</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {alertDetails.slice(0, 9).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.name} <span className="text-xs text-muted-foreground font-normal">• {alert.role}</span></p>
                        <p className="text-xs text-muted-foreground">
                          {alert.days >= 999
                            ? "Sem registro de acesso"
                            : `Último acesso há ${alert.days} ${alert.days === 1 ? "dia" : "dias"}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alert.days >= 7 ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-400"}`}>
                      {alert.days >= 999 ? "N/A" : `${alert.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Detail Modal */}
      <KpiDetailModal
        open={activeModal !== null}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title={getModalTitle()}
        description={getModalDescription()}
        items={getModalItems()}
        emptyMessage="Nenhum dado encontrado."
      />
    </div>
  );
};

export default AdminDashboard;
