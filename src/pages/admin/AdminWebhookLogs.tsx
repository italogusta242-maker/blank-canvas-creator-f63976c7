import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Eye, Loader2, Wifi } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const statusConfig: Record<string, { label: string; className: string }> = {
  sucesso: { label: "Sucesso", className: "bg-emerald-500/20 text-emerald-400" },
  erro: { label: "Erro", className: "bg-destructive/20 text-destructive" },
  usuario_nao_encontrado: { label: "Não encontrado", className: "bg-amber-500/20 text-amber-400" },
  ignorado: { label: "Ignorado", className: "bg-muted text-muted-foreground" },
};

interface WebhookLog {
  id: string;
  created_at: string;
  email: string | null;
  event_type: string | null;
  status_log: string;
  raw_payload: any;
}

const AdminWebhookLogs = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs((data as WebhookLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const stats = {
    total: logs.length,
    sucesso: logs.filter(l => l.status_log === "sucesso").length,
    erro: logs.filter(l => l.status_log === "erro").length,
    naoEncontrado: logs.filter(l => l.status_log === "usuario_nao_encontrado").length,
  };

  // Build daily success rate chart data
  const chartData = useMemo(() => {
    const dayMap: Record<string, { sucesso: number; erro: number; nao_encontrado: number }> = {};
    logs.forEach((l) => {
      const day = new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!dayMap[day]) dayMap[day] = { sucesso: 0, erro: 0, nao_encontrado: 0 };
      if (l.status_log === "sucesso") dayMap[day].sucesso++;
      else if (l.status_log === "erro") dayMap[day].erro++;
      else dayMap[day].nao_encontrado++;
    });
    return Object.entries(dayMap)
      .map(([day, counts]) => ({ day, ...counts }))
      .reverse()
      .slice(-14);
  }, [logs]);

  const successRate = stats.total > 0 ? Math.round((stats.sucesso / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-cinzel font-bold text-foreground flex items-center gap-3">
            <Wifi size={24} className="text-primary" /> Monitor de Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Todas as requisições recebidas da InfinitePay</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Recebidos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.sucesso}</p>
            <p className="text-xs text-muted-foreground">Sucesso</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.naoEncontrado}</p>
            <p className="text-xs text-muted-foreground">Não Encontrado</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.erro}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-destructive"}`}>
              {successRate}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-4">Taxa de Sucesso por Dia (últimos 14 dias)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="sucesso" name="Sucesso" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="erro" name="Erro" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nao_encontrado" name="Não encontrado" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground">Nenhum log registrado ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cfg = statusConfig[log.status_log] || statusConfig.erro;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.email || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.event_type || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cfg.className}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Webhook</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium">{selectedLog.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Evento</p>
                  <p className="font-medium font-mono">{selectedLog.event_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedLog.status_log]?.className}>
                    {statusConfig[selectedLog.status_log]?.label || selectedLog.status_log}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Payload Bruto (JSON)</p>
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs overflow-x-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.raw_payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWebhookLogs;
