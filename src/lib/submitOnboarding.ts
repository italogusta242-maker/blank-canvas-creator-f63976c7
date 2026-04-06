import type { UserData } from "@/pages/onboarding/constants";
import { supabase } from "@/integrations/supabase/client";

export async function submitOnboarding(
  userData: UserData,
  resultClass: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Usuário não autenticado" };

    // 1. Update profile with onboarding data
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
        nascimento: userData.nascimento,
        cpf: userData.cpf,
        cidade_estado: userData.cidade_estado,
        sexo: userData.sexo,
        altura: (Number(userData.altura) || null) as number | null,
        peso: (Number(userData.peso) || null) as number | null,
        tempo_acompanha: userData.tempo_acompanha,
        fatores_escolha: userData.fatores_escolha,
        indicacao: userData.indicacao,
        indicacao_nome: userData.indicacao_nome,
        indicacao_telefone: userData.indicacao_telefone,
        cep: userData.cep || null,
        logradouro: userData.logradouro || null,
        bairro: userData.bairro || null,
        meta_peso: (Number(userData.meta_peso) || null) as any,
        como_chegou: userData.como_chegou || null,
        onboarded: true,
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // 2. Automatic plan assignment
    try {
      const obj = userData.objetivo || "tonificar";
      let planTitle = "Plano Miris - Tonificação";
      if (obj === "emagrecer") planTitle = "Plano Miris - Emagrecimento";
      else if (obj === "manter_foco") planTitle = "Plano Miris - Manutenção";

      // Create Training Plan
      await supabase.from("training_plans").insert({
        user_id: user.id,
        title: planTitle,
        active: true,
        total_sessions: 30,
        groups: null,
      });

      // Create Diet Plan
      await supabase.from("diet_plans").insert({
        user_id: user.id,
        name: `Cardápio - ${planTitle}`,
        title: `Cardápio - ${planTitle}`,
        active: true,
        calories: obj === "emagrecer" ? 1600 : 2000,
        meals: null,
      } as any);

      // Set status to ATIVO direttamente
      await supabase.from("profiles").update({ status: "ativo" }).eq("id", user.id);
    } catch (autoErr) {
      console.error("Erro na atribuicao automatica:", autoErr);
    }

    // 3. Send data to Google Sheets (Marketing/Leads)
    try {
      const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxy2VcEx_Yntb9y7kQKR_CYuLpDLOuDPqsGZEbdK7mnGPsjdTv3NgFY7chAq2G7rs7ifw/exec";
      const sheetData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(userData)) {
        if (value instanceof File) continue;
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          sheetData[key] = value.join(", ");
        } else {
          sheetData[key] = value;
        }
      }
      sheetData["data_envio"] = new Date().toISOString();
      sheetData["classificacao"] = resultClass;

      fetch(WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify(sheetData),
      }).catch((err) => console.error("Erro ao enviar para planilha:", err));
    } catch (sheetError) {
      console.error("Erro ao preparar dados para planilha:", sheetError);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Erro ao salvar onboarding:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
