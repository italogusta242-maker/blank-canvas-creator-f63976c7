import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { password, user_ids } = await req.json();

    if (!password || !user_ids || !Array.isArray(user_ids)) {
      return new Response(
        JSON.stringify({ error: "Envie { password, user_ids: [...] }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const userId of user_ids) {
      try {
        // Update password directly by ID (skip listUsers)
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        );

        if (updateErr) {
          results.push({ id: userId, status: "error", error: updateErr.message });
        } else {
          results.push({ id: userId, status: "updated" });
        }
      } catch (e) {
        results.push({ id: userId, status: "error", error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
