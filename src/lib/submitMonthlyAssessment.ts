import { supabase } from "@/integrations/supabase/client";
import type { MonthlyFormData } from "@/pages/monthly-assessment/constants";

export async function submitMonthlyAssessment(
  formData: MonthlyFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Usuário não autenticado" };

    // 1. Insert assessment
    const { data: assessment, error: insertError } = await supabase
      .from("monthly_assessments" as any)
      .insert({
        user_id: user.id,
        altura: formData.altura || null,
        peso: formData.peso || null,
        modalidade: formData.modalidade || null,
        nivel_fadiga: formData.nivel_fadiga ? parseInt(formData.nivel_fadiga) : null,
        progresso_peitoral: formData.progresso_peitoral === "sim" ? true : formData.progresso_peitoral === "nao" ? false : null,
        progresso_costas: formData.progresso_costas === "sim" ? true : formData.progresso_costas === "nao" ? false : null,
        progresso_deltoide: formData.progresso_deltoide === "sim" ? true : formData.progresso_deltoide === "nao" ? false : null,
        progresso_triceps: formData.progresso_triceps === "sim" ? true : formData.progresso_triceps === "nao" ? false : null,
        progresso_biceps: formData.progresso_biceps === "sim" ? true : formData.progresso_biceps === "nao" ? false : null,
        progresso_quadriceps: formData.progresso_quadriceps === "sim" ? true : formData.progresso_quadriceps === "nao" ? false : null,
        progresso_posteriores: formData.progresso_posteriores === "sim" ? true : formData.progresso_posteriores === "nao" ? false : null,
        progresso_gluteos: formData.progresso_gluteos === "sim" ? true : formData.progresso_gluteos === "nao" ? false : null,
        progresso_panturrilha: formData.progresso_panturrilha === "sim" ? true : formData.progresso_panturrilha === "nao" ? false : null,
        progresso_abdomen: formData.progresso_abdomen || null,
        progresso_antebraco: formData.progresso_antebraco || null,
        notas_progressao: formData.notas_progressao || null,
        prioridades_fisicas: formData.prioridades_fisicas || null,
        dias_disponiveis: formData.dias_disponiveis.length > 0 ? formData.dias_disponiveis : null,
        frequencia_compromisso: formData.frequencia_compromisso || null,
        tempo_disponivel: formData.tempo_disponivel || null,
        maquinas_indisponiveis: formData.maquinas_indisponiveis.length > 0 ? formData.maquinas_indisponiveis : null,
        adesao_treinos: formData.adesao_treinos ? parseInt(formData.adesao_treinos) : null,
        motivo_adesao_treinos: formData.motivo_adesao_treinos || null,
        adesao_cardios: formData.adesao_cardios ? parseInt(formData.adesao_cardios) : null,
        motivo_adesao_cardios: formData.motivo_adesao_cardios || null,
        alongamentos_corretos: formData.alongamentos_corretos === "sim" ? true : formData.alongamentos_corretos === "nao" ? false : null,
        refeicoes_horarios: formData.refeicoes_horarios === "outro" ? formData.refeicoes_horarios_outro : formData.refeicoes_horarios || null,
        horario_treino: formData.horario_treino === "outro" ? formData.horario_treino_outro : formData.horario_treino || null,
        horario_treino_outro: formData.horario_treino === "outro" ? formData.horario_treino_outro : null,
        objetivo_atual: formData.objetivo_atual || null,
        competicao_fisiculturismo: formData.competicao_fisiculturismo || null,
        restricao_alimentar: formData.restricao_alimentar || null,
        alimentos_proibidos: formData.alimentos_proibidos || null,
        adesao_dieta: formData.adesao_dieta || null,
        motivo_nao_dieta: formData.motivo_nao_dieta || null,
        sugestao_dieta: formData.sugestao_dieta || null,
        autoriza_publicacao: formData.autoriza_publicacao === "sim",
        sugestao_melhoria: formData.sugestao_melhoria || null,
      } as any)
      .select("id")
      .single();

    if (insertError) throw insertError;

    // 2. Update profile weight/height
    await supabase
      .from("profiles")
      .update({
        peso: (Number(formData.peso) || null) as number | null,
        altura: (Number(formData.altura) || null) as number | null,
      })
      .eq("id", user.id);

    // 3. Send data to Google Sheets
    try {
      const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzFzk3QLHv8oxt-1xLKxILb0pmirT24Y4OxhLw3uKm1o-GR5q38sLxZVbco9raf_vmx/exec";
      const sheetData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File) continue;
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          sheetData[key] = value.join(", ");
        } else {
          sheetData[key] = value;
        }
      }
      sheetData["data_envio"] = new Date().toISOString();

      fetch(WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify(sheetData),
      }).catch((err) => console.error("Erro ao enviar reavaliação para planilha:", err));
    } catch (sheetError) {
      console.error("Erro ao preparar dados para planilha:", sheetError);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Erro ao salvar reavaliação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return { success: false, error: errorMessage };
  }
}
