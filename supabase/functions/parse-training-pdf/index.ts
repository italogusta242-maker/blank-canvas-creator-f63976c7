import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode, encode } from "https://deno.land/std@0.203.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let fileBytes: Uint8Array;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.fileBase64) throw new Error("No fileBase64 provided");
      fileBytes = decode(body.fileBase64);
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) throw new Error("No PDF file provided");
      const ab = await file.arrayBuffer();
      fileBytes = new Uint8Array(ab);
    } else {
      throw new Error("Unsupported content type");
    }

    // Use std encoding to avoid stack overflow on large files
    const base64 = encode(fileBytes);

    const systemPrompt = `Você é um assistente especializado em extrair informações de documentos PDF (Planilhas de Treino, Cardápios, Planners).
Sua tarefa é ler o documento e extrair os blocos de conteúdo principais como uma lista de itens estruturados.

REGRAS:
1. Identifique os blocos lógicos (ex: Treino A, Treino B, Segunda-feira, Café da Manhã, Almoço, etc.).
2. Para cada bloco, extraia o título e o conteúdo detalhado (lista de exercícios, alimentos, ou metas).
3. Seja fiel aos nomes e detalhes presentes no documento.

Responda APENAS com JSON válido:
{
  "title": "Título Geral do Documento",
  "items": [
    {
      "title": "Título do Bloco (ex: Treino A)",
      "content": "Conteúdo detalhado aqui em formato de texto. Liste os exercícios/alimentos e suas especificações.",
      "subtitle": "Informação extra curta (ex: 'Perna' ou '08:00')"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Extraia o conteúdo deste PDF seguindo o formato JSON solicitado.",
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("IA returned empty response");

    const planData = JSON.parse(resultText);

    return new Response(JSON.stringify({ plan: planData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[PARSE-PDF-ERROR]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
