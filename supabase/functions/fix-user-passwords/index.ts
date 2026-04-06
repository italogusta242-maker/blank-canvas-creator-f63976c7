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

    const { password, emails } = await req.json();

    if (!password || !emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: "Envie { password, emails: [...] }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const email of emails) {
      try {
        // Find user by email
        const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listErr) {
          results.push({ email, status: "error", error: listErr.message });
          continue;
        }

        const user = users?.find((u) => u.email === email);
        if (!user) {
          results.push({ email, status: "not_found" });
          continue;
        }

        // Update password via Admin API (this sets the hash correctly)
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password }
        );

        if (updateErr) {
          results.push({ email, status: "error", error: updateErr.message });
        } else {
          results.push({ email, status: "updated" });
        }
      } catch (e) {
        results.push({ email, status: "error", error: String(e) });
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
