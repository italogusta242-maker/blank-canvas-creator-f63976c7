import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

export default function HistoryTab() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["admin_notification_history"],
    queryFn: async () => {
      const [broadcastRes, individualRes, scheduledRes] = await Promise.all([
        supabase
          .from("broadcast_notifications")
          .select("id, title, body, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("notifications")
          .select("id, title, body, created_at, user_id, type")
          .eq("type", "admin_broadcast")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("scheduled_notifications")
          .select("id, title, body, scheduled_at, status, sent_at, recipient_mode")
          .in("status", ["sent", "cancelled"])
          .order("scheduled_at", { ascending: false })
          .limit(30),
      ]);

      const broadcasts = (broadcastRes.data || []).map((b) => ({
        ...b,
        kind: "broadcast" as const,
        sortDate: b.created_at!,
      }));

      const individuals = (individualRes.data || []).map((n) => ({
        ...n,
        kind: "individual" as const,
        sortDate: n.created_at!,
      }));

      const scheduled = (scheduledRes.data || []).map((s) => ({
        ...s,
        kind: "scheduled" as const,
        sortDate: s.sent_at || s.scheduled_at,
      }));

      const merged = [...broadcasts, ...individuals, ...scheduled];
      merged.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
      return merged.slice(0, 50);
    },
  });

  // Resolve user names for individual items
  const individualIds = useMemo(() => {
    if (!history) return [];
    return history.filter((h) => h.kind === "individual").map((h) => (h as any).user_id).filter(Boolean);
  }, [history]);

  const { data: userNames } = useQuery({
    queryKey: ["user_names_history", individualIds],
    queryFn: async () => {
      if (individualIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", individualIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.id] = p.full_name || "Sem nome"; });
      return map;
    },
    enabled: individualIds.length > 0,
  });

  const getBadge = (item: any) => {
    if (item.kind === "broadcast") return { label: "Broadcast", cls: "bg-primary/20 text-primary" };
    if (item.kind === "individual") return { label: `Individual — ${userNames?.[(item as any).user_id] || "..."}`, cls: "bg-accent/20 text-accent" };
    if (item.kind === "scheduled") {
      const st = item.status === "sent" ? "Agendado ✅" : "Cancelado ❌";
      return { label: st, cls: item.status === "sent" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600" };
    }
    return { label: "?", cls: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border max-w-3xl">
      <h3 className="font-bold text-base flex items-center gap-2 mb-6">
        <Clock size={18} /> Histórico Completo
      </h3>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : !history || history.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">Nenhum envio realizado ainda.</p>
        ) : (
          history.map((item) => {
            const badge = getBadge(item);
            return (
              <div key={`${item.kind}-${item.id}`} className="p-4 rounded-lg bg-background border border-border">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                <h4 className="font-bold text-sm mt-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-3 font-mono">
                  {new Date(item.sortDate).toLocaleString("pt-BR")}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
