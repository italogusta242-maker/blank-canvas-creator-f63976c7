import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um personal trainer e nutricionista de elite. 
Gere um plano de treino personalizado em HTML puro (sem markdown, sem blocos de código).
O HTML deve ser bonito e bem formatado para conversão em PDF:
- Use uma estrutura com <h1> para título, <h2> para seções, <h3> para subseções
- Use <table> com bordas para tabelas de exercícios (colunas: Exercício, Séries, Repetições, Descanso)
- Use cores: cabeçalhos em #1a1a2e, destaques em #e94560, fundo de tabelas alternando #f5f5f5 e #ffffff
- Fonte: font-family: 'Segoe UI', Arial, sans-serif
- Adicione padding e margin adequados
- Inclua seções: Objetivo, Aquecimento, Treino Principal (por dia da semana), Dicas de Recuperação
- Tudo em português do Brasil
Retorne APENAS o HTML, nada mais.`;

    const userPrompt = `Dados do aluno:
Nome: ${userData.name || "Aluno"}
Idade: ${userData.age || "Não informada"}
Objetivo: ${userData.goal || "Hipertrofia"}
Nível: ${userData.level || "Intermediário"}
Dias disponíveis: ${userData.days || "5 dias"}
Observações: ${userData.notes || "Nenhuma"}

Gere o plano de treino completo em HTML formatado.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Falha ao gerar plano via IA");
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    html = html.replace(/^```html?\s*/i, "").replace(/```\s*$/, "").trim();

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pdf-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
