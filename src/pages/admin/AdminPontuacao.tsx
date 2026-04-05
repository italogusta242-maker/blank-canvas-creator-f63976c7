import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2, Trophy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTION_LABELS: Record<string, string> = {
  workout_complete: "🏋️ Treino Concluído",
  workout_weekly_bonus: "📅 Bônus Semanal Treino",
  workout_streak: "🔥 Streak de Treino",
  diet_log: "🍽️ Registrar Refeição",
  diet_calories: "🎯 Meta de Calorias",
  diet_protein: "💪 Meta de Proteína",
  diet_all_macros: "✅ Todos os Macros",
  diet_weekly_bonus: "📅 Bônus Semanal Dieta",
  habit_water: "💧 Meta de Água",
  habit_sleep: "🌙 Meta de Sono",
  habit_combined_bonus: "⭐ Bônus Hábitos",
  lesson_complete: "📚 Aula Concluída",
  module_complete: "🏆 Módulo Concluído",
  community_post: "💬 Post na Comunidade",
  community_reaction_bonus: "❤️ Bônus de Reações",
};

export default function AdminPontuacao() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-scoring-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_rules")
        .select("*")
        .order("action");
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, points }: { id: string; points: number }) => {
      const { error } = await (supabase as any)
        .from("scoring_rules")
        .update({ points })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pontuação atualizada!");
      queryClient.invalidateQueries({ queryKey: ["admin-scoring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["scoring-rules"] });
      setEditingId(null);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="text-primary" size={24} />
        <h1 className="text-2xl font-black text-foreground">Regras de Pontuação</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Defina quantos pontos cada ação vale no sistema de Hustle Points. As alterações são aplicadas imediatamente.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_80px] gap-2 p-3 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Ação</span>
            <span className="text-center">Pontos</span>
            <span className="text-center">Editar</span>
          </div>
          {rules.map((rule: any) => (
            <div key={rule.id} className="grid grid-cols-[1fr_100px_80px] gap-2 items-center p-3 border-b border-border/50 hover:bg-secondary/30 transition-colors">
              <div>
                <p className="text-sm font-bold text-foreground">{ACTION_LABELS[rule.action] || rule.action}</p>
                {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
              </div>
              <div className="flex justify-center">
                {editingId === rule.id ? (
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    className="w-20 h-8 text-center text-sm"
                    min={0}
                    autoFocus
                  />
                ) : (
                  <span className="text-lg font-black text-primary">{rule.points}</span>
                )}
              </div>
              <div className="flex justify-center">
                {editingId === rule.id ? (
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: rule.id, points: editValue })}
                    disabled={updateMutation.isPending}
                    className="h-8 w-8 p-0"
                  >
                    {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingId(rule.id); setEditValue(rule.points); }}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
