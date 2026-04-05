import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, TrendingUp, Users, RefreshCw, PieChart as PieChartIcon,
  CalendarIcon, BarChart3, Search, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { useFinancialDashboard, type InferredSubscription } from "@/hooks/useFinancialDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FinancialDrilldownModal from "@/components/admin/FinancialDrilldownModal";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
};

// ── KPI Card ──
const KpiCard = ({ title, value, subtitle, icon: Icon, loading, onClick }: {
  title: string; value: string; subtitle?: string; icon: any; loading: boolean; onClick?: () => void;
}) => (
  <Card className={onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""} onClick={onClick}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          {loading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ── Main ──
const AdminFaturamentoInner = () => {
  const { subscriptions, kpis, planDistribution, isLoading, refetch } = useFinancialDashboard();
  const [search, setSearch] = useState("");
  const [drilldown, setDrilldown] = useState<{ title: string; subs: InferredSubscription[]; totals?: { revenue: number; mrr: number } } | null>(null);

  const openPlanDrilldown = (planName: string) => {
    const subs = subscriptions.filter((s) => s.inferredPlanName === planName);
    const dist = planDistribution.find((d) => d.name === planName);
    setDrilldown({
      title: `Composição do Cálculo: Plano ${planName}`,
      subs,
      totals: dist ? { revenue: dist.revenue, mrr: dist.mrr } : undefined,
    });
  };

  const openAllDrilldown = (kpiName: string) => {
    setDrilldown({
      title: `Composição do Cálculo: ${kpiName}`,
      subs: subscriptions,
      totals: { revenue: kpis.totalRevenue, mrr: kpis.mrr },
    });
  };

  const filtered = useMemo(() => {
    if (!search || search.length < 2) return subscriptions;
    const q = search.toLowerCase();
    return subscriptions.filter(
      (s) => s.userName?.toLowerCase().includes(q) || s.userEmail?.toLowerCase().includes(q)
    );
  }, [subscriptions, search]);

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
          <p className="text-sm text-muted-foreground">
            Visão financeira — dados sanitizados em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Receita Total Estimada" value={fmt(kpis.totalRevenue)} icon={DollarSign} loading={isLoading} onClick={() => openAllDrilldown("Receita Total")} />
        <KpiCard
          title="MRR"
          value={fmt(kpis.mrr)}
          subtitle="Receita Mensal Recorrente"
          icon={TrendingUp}
          loading={isLoading}
          onClick={() => openAllDrilldown("MRR")}
        />
        <KpiCard
          title="ARR"
          value={fmt(kpis.arr)}
          subtitle="Receita Anual Estimada"
          icon={BarChart3}
          loading={isLoading}
        />
        <KpiCard title="Assinantes Ativos" value={String(kpis.activeCount)} icon={Users} loading={isLoading} />
      </div>

      {/* Distribution + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            ) : planDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma assinatura ativa</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie
                      data={planDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {planDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [`${value} alunos`, name]}
                    />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {planDistribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-foreground">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">{d.count}</Badge>
                        <span className="text-xs text-muted-foreground">MRR {fmt(d.mrr)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue breakdown summary */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Resumo de Receita por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {planDistribution.map((d) => (
                  <div key={d.name} className="p-4 rounded-lg bg-muted/30 border border-border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openPlanDrilldown(d.name)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-semibold text-foreground">{d.name}</span>
                      </div>
                      <Badge variant="outline">{d.count} alunos</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Receita Total</p>
                        <p className="font-mono font-medium text-foreground">{fmt(d.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">MRR</p>
                        <p className="font-mono font-medium text-foreground">{fmt(d.mrr)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Ticket Médio</p>
                        <p className="font-mono font-medium text-foreground">{d.count > 0 ? fmt(d.revenue / d.count) : "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              Ciclo de Vida das Assinaturas
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura encontrada</p>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Plano Inferido</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Ativação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.subscriptionId}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground truncate max-w-[180px]">{s.userName || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{s.userEmail || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{s.inferredPlanName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {fmt(s.sanitizedPrice)}
                        {s.rawPrice !== s.sanitizedPrice && (
                          <span className="block text-[10px] text-muted-foreground">raw: {s.rawPrice}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary">{fmt(s.mrrContribution)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(s.startedAt)}</TableCell>
                      <TableCell>
                        <span className={`text-xs ${isExpired(s.expiresAt) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {fmtDate(s.expiresAt)}
                        </span>
                        {isExpired(s.expiresAt) && <Badge variant="destructive" className="ml-2 text-[10px]">Vencido</Badge>}
                      </TableCell>
                      <TableCell>
                        {s.activationMethod === "webhook" ? (
                          <Badge variant="default" className="gap-1 text-[10px]">
                            <ShieldCheck size={10} /> Webhook
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <ShieldAlert size={10} /> Manual
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-right mt-2">
            {filtered.length} assinatura{filtered.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Drilldown Modal */}
      <FinancialDrilldownModal
        open={!!drilldown}
        onOpenChange={(open) => !open && setDrilldown(null)}
        title={drilldown?.title || ""}
        subscriptions={drilldown?.subs || []}
        totals={drilldown?.totals}
      />
    </div>
  );
};

const AdminFaturamento = () => (
  <ErrorBoundary>
    <AdminFaturamentoInner />
  </ErrorBoundary>
);

export default AdminFaturamento;
