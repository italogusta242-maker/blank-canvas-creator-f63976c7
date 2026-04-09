import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, Clock, Edit, Users, User, Search } from "lucide-react";

type RecipientMode = "all" | "individual";

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export default function AdminAvisos() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<RecipientMode>("all");
  const [selectedUser, setSelectedUser] = useState<ProfileOption | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: activeProfiles } = useQuery({
    queryKey: ["active_profiles_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("status", "ativo")
        .order("full_name");
      if (error) throw error;
      return data as ProfileOption[];
    },
  });

  const filteredProfiles = useMemo(() => {
    if (!activeProfiles || !search.trim()) return activeProfiles ?? [];
    const q = search.toLowerCase();
    return activeProfiles.filter(
      (p) =>
        (p.full_name?.toLowerCase().includes(q)) ||
        (p.email?.toLowerCase().includes(q))
    );
  }, [activeProfiles, search]);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["admin_broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!title || !body) throw new Error("Título e mensagem são obrigatórios!");

      if (mode === "all") {
        const { error } = await supabase.from("broadcast_notifications").insert({
          title,
          body,
        });
        if (error) throw new Error(error.message);
      } else {
        if (!selectedUser) throw new Error("Selecione uma aluna!");
        const { error } = await supabase.from("notifications").insert({
          user_id: selectedUser.id,
          title,
          body,
          type: "admin_broadcast",
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      const target = mode === "all" ? "todas as alunas" : selectedUser?.full_name || "aluna";
      toast.success(`Notificação enviada para ${target}! 📢`);
      setTitle("");
      setBody("");
      setSelectedUser(null);
      setSearch("");
      queryClient.invalidateQueries({ queryKey: ["admin_broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao enviar: ${err.message}`);
    },
  });

  const canSend = title && body && (mode === "all" || selectedUser);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-cinzel tracking-tight flex items-center gap-3">
          <Megaphone className="text-accent" /> Central de Notificações
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie notificações para todas as alunas ou para uma aluna específica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Edit size={18} /> Nova Notificação
          </h2>

          <div className="space-y-4">
            {/* Destinatário */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Destinatário</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode("all"); setSelectedUser(null); setSearch(""); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Users size={16} /> Todas as alunas
                </button>
                <button
                  type="button"
                  onClick={() => setMode("individual")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "individual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <User size={16} /> Aluna específica
                </button>
              </div>
            </div>

            {/* Busca de aluna */}
            {mode === "individual" && (
              <div className="relative">
                <label className="text-sm font-semibold mb-1.5 block">Selecionar Aluna</label>
                {selectedUser ? (
                  <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {selectedUser.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedUser(null); setSearch(""); }}
                      className="text-xs text-accent hover:underline font-bold shrink-0"
                    >
                      Trocar
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
                      placeholder="Buscar por nome ou email..."
                      className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    {showDropdown && filteredProfiles.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProfiles.slice(0, 20).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedUser(p);
                              setShowDropdown(false);
                              setSearch("");
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {p.full_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Título */}
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Novo Módulo Liberado! 🚀"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Mensagem</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreva a mensagem da notificação..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors min-h-[120px] resize-y"
              />
            </div>

            {/* Botão */}
            <button
              onClick={() => sendNotification.mutate()}
              disabled={sendNotification.isPending || !canSend}
              className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendNotification.isPending ? (
                "Enviando..."
              ) : mode === "all" ? (
                <><Send size={18} /> Disparar para Todas</>
              ) : (
                <><Send size={18} /> Enviar para {selectedUser?.full_name || "..."}</>
              )}
            </button>
          </div>
        </div>

        {/* Histórico */}
        <div className="bg-card p-6 rounded-xl border border-border flex flex-col h-full">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Clock size={18} /> Histórico de Disparos
          </h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando histórico...</p>
            ) : broadcasts?.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Nenhum disparo realizado ainda.</p>
            ) : (
              broadcasts?.map((b) => (
                <div key={b.id} className="p-4 rounded-lg bg-background border border-border">
                  <h3 className="font-bold text-sm text-foreground">{b.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.body}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-3 font-mono">
                    Enviado em: {new Date(b.created_at!).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
