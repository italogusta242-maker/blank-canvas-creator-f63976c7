import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const emailLower = email.toLowerCase().trim();

    // 1. Check profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (profile) {
      return new Response(JSON.stringify({ allowed: true, found_in: "profiles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check funnel_leads
    const { data: lead } = await supabaseAdmin
      .from("funnel_leads")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (lead) {
      return new Response(JSON.stringify({ allowed: true, found_in: "funnel_leads" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check pending_checkouts (common for pre-registration in this flow)
    const { data: pending } = await supabaseAdmin
      .from("pending_checkouts")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (pending) {
      return new Response(JSON.stringify({ allowed: true, found_in: "pending_checkouts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Not found anywhere
    return new Response(
      JSON.stringify({
        allowed: false,
        error: "E-mail não encontrado em nossa base de dados. Verifique a ortografia ou use o e-mail exato da compra.",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("verify-bypass-email error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao verificar e-mail" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
