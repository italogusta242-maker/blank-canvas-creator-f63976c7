import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Users, User, Search } from "lucide-react";

type RecipientMode = "all" | "individual";

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function SendNowTab() {
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
        .select("id, full_name, email")
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
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }, [activeProfiles, search]);

  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!title || !body) throw new Error("Título e mensagem são obrigatórios!");

      if (mode === "all") {
        // Get all active users and insert a notification for each
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("status", "ativo");

        if (!profiles || profiles.length === 0) throw new Error("Nenhuma aluna ativa encontrada.");

        const rows = profiles.map((p) => ({
          user_id: p.id,
          title,
          body,
          type: "admin_broadcast",
        }));

        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50);
          const { error } = await supabase.from("notifications").insert(batch);
          if (error) throw new Error(error.message);
        }

        // Save to broadcast history
        await supabase.from("broadcast_notifications").insert({ title, body });
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
      queryClient.invalidateQueries({ queryKey: ["admin_notification_history"] });
    },
    onError: (err: any) => toast.error(`Falha ao enviar: ${err.message}`),
  });

  const canSend = title && body && (mode === "all" || selectedUser);

  return (
    <div className="bg-card p-6 rounded-xl border border-border space-y-6 max-w-2xl">
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

        {/* Busca */}
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
                        onClick={() => { setSelectedUser(p); setShowDropdown(false); setSearch(""); }}
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
  );
}
