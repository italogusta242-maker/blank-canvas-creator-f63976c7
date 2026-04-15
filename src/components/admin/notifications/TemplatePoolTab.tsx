import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, FolderOpen, Zap, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = ["geral", "motivacional", "lembrete", "engajamento"];

const SCHEDULE_INFO = [
  { time: "07:00", category: "motivacional", label: "Motivacional" },
  { time: "12:00", category: "lembrete", label: "Lembrete" },
  { time: "17:30", category: "engajamento", label: "Engajamento" },
];

export default function TemplatePoolTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("geral");
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["notification_templates_all", filterCat],
    queryFn: async () => {
      let q = supabase
        .from("notification_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterCat) q = q.eq("category", filterCat);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: autoEnabled, isLoading: loadingAuto } = useQuery({
    queryKey: ["auto_notifications_enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "auto_notifications_enabled")
        .maybeSingle();
      return data?.value !== "false";
    },
  });

  const toggleAuto = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "auto_notifications_enabled", value: enabled ? "true" : "false" }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Automação ativada ✅" : "Automação desativada");
      queryClient.invalidateQueries({ queryKey: ["auto_notifications_enabled"] });
    },
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      if (!title || !body) throw new Error("Preencha título e mensagem!");
      const { error } = await supabase.from("notification_templates").insert({ title, body, category });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Template adicionado ao banco! ✅");
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["notification_templates_all"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_templates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Template removido");
      queryClient.invalidateQueries({ queryKey: ["notification_templates_all"] });
    },
  });

  const catColors: Record<string, string> = {
    geral: "bg-muted text-muted-foreground",
    motivacional: "bg-orange-500/20 text-orange-600",
    lembrete: "bg-blue-500/20 text-blue-600",
    engajamento: "bg-green-500/20 text-green-600",
  };

  return (
    <div className="space-y-6">
      {/* Automation panel */}
      <div className="bg-card p-5 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary" />
            <h3 className="font-bold text-base">Automação Diária</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{autoEnabled ? "Ativada" : "Desativada"}</span>
            <Switch
              checked={!!autoEnabled}
              disabled={loadingAuto || toggleAuto.isPending}
              onCheckedChange={(v) => toggleAuto.mutate(v)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          O sistema sorteia automaticamente uma mensagem do banco e envia push para todas as alunas ativas nos horários abaixo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCHEDULE_INFO.map((s) => (
            <div key={s.time} className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border">
              <Clock size={14} className="text-muted-foreground shrink-0" />
              <div>
                <span className="text-sm font-bold">{s.time}</span>
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${catColors[s.category]}`}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add form */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Plus size={18} /> Nova Mensagem
          </h3>

          <div>
            <label className="text-sm font-semibold mb-1 block">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: 🔥 Bora treinar!"
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Mensagem</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="O corpo da notificação..."
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary min-h-[100px] resize-y"
            />
          </div>

          <button
            onClick={() => addTemplate.mutate()}
            disabled={addTemplate.isPending || !title || !body}
            className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-bold hover:bg-accent/90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={18} /> Adicionar ao Banco
          </button>
        </div>

        {/* List */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FolderOpen size={18} /> Banco de Mensagens
            </h3>
            <span className="text-xs text-muted-foreground">{templates?.length || 0} mensagens</span>
          </div>

          {/* Filter */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setFilterCat(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !filterCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : !templates || templates.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Nenhuma mensagem cadastrada.</p>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-background border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catColors[t.category] || catColors.geral}`}>
                        {t.category}
                      </span>
                      <h4 className="font-bold text-sm mt-1">{t.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</p>
                    </div>
                    <button
                      onClick={() => deleteTemplate.mutate(t.id)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
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
    </div>
  );
}
