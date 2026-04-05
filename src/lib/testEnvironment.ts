import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/dateUtils";
import { toast } from "sonner";

export async function injectMockGamificationData(userId: string) {
  try {
    toast.loading("Injetando dados de teste...");

    // 1. Criar Desafio Mock
    const desafioMock = {
      id: "mock-desafio-teste",
      title: "Desafio Teste Annac",
      description: "Desafio gerado automaticamente para testes de usabilidade",
      is_active: true,
      created_at: new Date().toISOString(),
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      scoring_rules: {
        workout: 50,
        diet: 50,
        running: 50
      }
    };
    
    // Define outros desafios inativos para testar a chama apenas com este
    await supabase.from("challenges").update({ is_active: false }).neq("id", "mock-desafio-teste");
    await supabase.from("challenges").upsert([desafioMock]);

    // 2. Plano de dieta
    const mockMeals = [
      { id: "meal_0", name: "Café da Manhã" },
      { id: "meal_1", name: "Lanche" },
      { id: "meal_2", name: "Almoço" },
      { id: "meal_3", name: "Jantar" }
    ];
    
    await supabase.from("diet_plans").update({ active: false }).eq("user_id", userId);
    await supabase.from("diet_plans").insert({
      user_id: userId,
      active: true,
      meals: mockMeals
    });

    // 3. Plano de treino (7 dias)
    const mockPlan = {
      groups: [
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] },
        { name: "Treino Teste", exercises: [] }
      ]
    };

    await supabase.from("training_plans").update({ active: false }).eq("user_id", userId);
    await supabase.from("training_plans").insert({
      user_id: userId,
      active: true,
      groups: mockPlan.groups
    });

    // 4. Daily Habits para hoje já preenchidos
    await supabase.from("daily_habits").upsert({
      user_id: userId,
      date: getToday(),
      completed_meals: mockMeals.map(m => m.id),
      water_liters: 2.5
    }, { onConflict: "user_id,date" });

    // 5. Workout de hoje
    await supabase.from("workouts").insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      finished_at: new Date(Date.now() + 1000).toISOString(),
      group_name: "Treino Teste",
      exercises: [
        {
          name: "Agachamento Teste",
          setsData: [{ done: true, reps: 10, weight: 10 }]
        }
      ]
    });

    toast.dismiss();
    toast.success("Dados preenchidos! Atualize o app e vá ao Dashboard conferir a Chama.");
  } catch(error: any) {
    console.error(error);
    toast.dismiss();
    toast.error("Erro: " + error.message);
  }
}
