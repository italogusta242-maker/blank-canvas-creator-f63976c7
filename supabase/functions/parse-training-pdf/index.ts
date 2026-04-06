import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode } from "https://deno.land/std@0.203.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    let fileBase64: string;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.fileBase64) throw new Error("No fileBase64 provided");
      fileBase64 = body.fileBase64;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) throw new Error("No PDF file provided");
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      // encode to base64
      let binary = "";
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      fileBase64 = btoa(binary);
    } else {
      throw new Error("Unsupported content type");
    }

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

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "application/pdf",
                data: fileBase64,
              },
            },
            {
              text: systemPrompt + "\n\nExtraia o conteúdo deste PDF seguindo o formato JSON solicitado.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json",
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Gemini returned empty response");

    let cleanJson = resultText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const planData = JSON.parse(cleanJson);

    return new Response(JSON.stringify({ plan: planData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[PARSE-TRAINING-PDF-ERROR]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
