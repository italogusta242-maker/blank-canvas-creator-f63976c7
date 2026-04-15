import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, Users, User, Search, Trash2, X } from "lucide-react";

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

const CATEGORIES = ["geral", "motivacional", "lembrete", "engajamento"];

export default function ScheduleTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState<"all" | "individual">("all");
  const [selectedUser, setSelectedUser] = useState<ProfileOption | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [usePool, setUsePool] = useState(false);
  const [poolCategory, setPoolCategory] = useState("geral");

  const { data: activeProfiles } = useQuery({
    queryKey: ["active_profiles_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("status", "ativo")
        .order("full_name");
      if (error) throw error;
      return data as ProfileOption[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["notification_templates", poolCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("category", poolCategory)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: usePool,
  });

  const filteredProfiles = useMemo(() => {
    if (!activeProfiles || !search.trim()) return activeProfiles ?? [];
    const q = search.toLowerCase();
    return activeProfiles.filter(
      (p) => p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  }, [activeProfiles, search]);

  // Pick random template from pool
  const pickFromPool = () => {
    if (!templates || templates.length === 0) {
      toast.error("Nenhum template nessa categoria!");
      return;
    }
    const random = templates[Math.floor(Math.random() * templates.length)];
    setTitle(random.title);
    setBody(random.body);
    toast.success("Template selecionado aleatoriamente! 🎲");
  };

  const { data: scheduled, isLoading } = useQuery({
    queryKey: ["scheduled_notifications_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .in("status", ["pending"])
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!title || !body || !scheduledAt) throw new Error("Preencha título, mensagem e horário!");
      if (mode === "individual" && !selectedUser) throw new Error("Selecione uma aluna!");

      const { error } = await supabase.from("scheduled_notifications").insert({
        title,
        body,
        scheduled_at: new Date(scheduledAt).toISOString(),
        recipient_mode: mode === "all" ? "all" : selectedUser!.id,
        target_user_id: mode === "individual" ? selectedUser!.id : null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Notificação agendada! ⏰");
      setTitle("");
      setBody("");
      setScheduledAt("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["scheduled_notifications_list"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      queryClient.invalidateQueries({ queryKey: ["scheduled_notifications_list"] });
    },
  });

  const canSchedule = title && body && scheduledAt && (mode === "all" || selectedUser);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-card p-6 rounded-xl border border-border space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <CalendarClock size={18} /> Novo Agendamento
        </h3>

        {/* Pool toggle */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Usar Pool de Mensagens?</label>
          <button
            onClick={() => setUsePool(!usePool)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              usePool ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {usePool ? "Sim" : "Não"}
          </button>
        </div>

        {usePool && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm font-semibold mb-1 block">Categoria</label>
              <select
                value={poolCategory}
                onChange={(e) => setPoolCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={pickFromPool}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
            >
              🎲 Sortear
            </button>
          </div>
        )}

        {/* Destinatário */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Destinatário</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode("all"); setSelectedUser(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Users size={16} /> Todas
            </button>
            <button
              type="button"
              onClick={() => setMode("individual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "individual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <User size={16} /> Individual
            </button>
          </div>
        </div>

        {mode === "individual" && (
          <div className="relative">
            {selectedUser ? (
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                <span className="text-sm font-medium truncate flex-1">{selectedUser.full_name}</span>
                <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar aluna..."
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                />
                {showDropdown && filteredProfiles.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredProfiles.slice(0, 15).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedUser(p); setShowDropdown(false); setSearch(""); }}
                        className="w-full px-4 py-2 hover:bg-muted/50 text-left text-sm"
                      >
                        {p.full_name || p.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da notificação"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Corpo da mensagem..."
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-y"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-1.5 block">Data e Hora (horário de Brasília)</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => createSchedule.mutate()}
          disabled={createSchedule.isPending || !canSchedule}
          className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold hover:bg-accent/90 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {createSchedule.isPending ? "Agendando..." : <><CalendarClock size={18} /> Agendar Notificação</>}
        </button>
      </div>

      {/* Pending list */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="font-bold text-base mb-4">📋 Agendamentos Pendentes</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : !scheduled || scheduled.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">Nenhum agendamento pendente.</p>
          ) : (
            scheduled.map((s) => (
              <div key={s.id} className="p-3 rounded-lg bg-background border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                      {s.recipient_mode === "all" ? "Todas" : "Individual"}
                    </span>
                    <h4 className="font-bold text-sm mt-1">{s.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                      ⏰ {new Date(s.scheduled_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelSchedule.mutate(s.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                    title="Cancelar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
