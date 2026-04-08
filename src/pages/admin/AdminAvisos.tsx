import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, Clock, Edit, Bell, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AdminAvisos() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const { data: pushCount } = useQuery({
    queryKey: ["push_subscribers_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("push_subscriptions" as any)
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: totalUsers } = useQuery({
    queryKey: ["total_active_users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");
      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["admin_broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      if (!title || !body) throw new Error("Título e corpo curto são obrigatórios!");
      const { error } = await supabase.from("broadcast_notifications").insert({
        title,
        body,
        markdown_content: markdown || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast enviado com sucesso para todas as alunas! 📢");
      setTitle("");
      setBody("");
      setMarkdown("");
      setIsPreview(false);
      queryClient.invalidateQueries({ queryKey: ["admin_broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cinzel tracking-tight flex items-center gap-3">
            <Megaphone className="text-accent" /> Central de Broadcast
          </h1>
          <p className="text-muted-foreground mt-1">
            Envie avisos, atualizações e motivações para o sininho de todas as alunas simultaneamente.
          </p>
        </div>
      </div>

      {/* Push stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3">
          <Bell size={20} className="text-accent" />
          <div>
            <p className="text-2xl font-bold">{pushCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Sininho ativado</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3">
          <Users size={20} className="text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{totalUsers ?? 0}</p>
            <p className="text-xs text-muted-foreground">Alunas ativas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Edit size={18} /> Novo Aviso
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Título da Notificação</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Novo Módulo Liberado! 🚀"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block">Resumo Curto (Preview)</label>
              <input 
                type="text" 
                value={body} 
                onChange={e => setBody(e.target.value)}
                placeholder="Ex: Corra para ver o novo treino de Glúteos..."
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold block">Conteúdo Rico (Markdown) - Opcional</label>
                <button 
                  onClick={() => setIsPreview(!isPreview)}
                  className="text-xs text-accent hover:underline font-bold"
                >
                  {isPreview ? "Voltar à Edição" : "Ver Preview do Markdown"}
                </button>
              </div>

              {isPreview ? (
                <div className="w-full bg-background/50 border border-border rounded-lg px-4 py-3 min-h-[150px] markdown-content text-sm overflow-hidden">
                  {markdown ? <ReactMarkdown>{markdown}</ReactMarkdown> : <span className="text-muted-foreground italic">Nenhum conteúdo rico fornecido.</span>}
                </div>
              ) : (
                <textarea 
                  value={markdown} 
                  onChange={e => setMarkdown(e.target.value)}
                  placeholder="Use **negrito**, listas e [links](https://...) aqui..."
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors min-h-[150px] resize-y"
                />
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">
                O Markdown só será exibido quando a aluna abrir o detalhe da notificação ou se o Sininho for expandido.
              </p>
            </div>

            <button 
              onClick={() => sendBroadcast.mutate()}
              disabled={sendBroadcast.isPending || !title || !body}
              className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendBroadcast.isPending ? "Disparando..." : <><Send size={18} /> Disparar para Todos</>}
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
                    Enviado em: {new Date(b.created_at).toLocaleString('pt-BR')}
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
