import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      // sendBeacon sends as text/plain or Blob — try both
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : null;
    const error_message = typeof body.error_message === "string" ? body.error_message.slice(0, 500) : null;
    const error_type = typeof body.error_type === "string" ? body.error_type.slice(0, 50) : null;
    const user_agent = typeof body.user_agent === "string" ? body.user_agent.slice(0, 500) : null;
    const platform = typeof body.platform === "string" ? body.platform.slice(0, 50) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("auth_failure_logs").insert({
      email,
      error_message,
      error_type,
      user_agent,
      platform,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("log-auth-failure error:", e?.message);
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // always 200 for fire-and-forget
    });
  }
});
