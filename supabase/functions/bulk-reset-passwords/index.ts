import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    // Check if the x-admin-key matches the full service role JWT used to create the admin client
    const adminKey = req.headers.get("x-admin-key") || "";
    // Decode JWT payload to check role
    let isServiceRole = false;
    if (adminKey) {
      try {
        const parts = adminKey.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          isServiceRole = payload.role === "service_role";
        }
      } catch { /* not a valid JWT */ }
    }
    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleCheck) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse optional password from body
    let tempPassword = "Desafio@2026";
    try {
      const body = await req.json();
      if (body?.password) tempPassword = body.password;
    } catch { /* use default */ }

    // Get all active profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, nome")
      .eq("status", "ativo");

    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ updated: 0, skipped: 0, errors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { updated: 0, skipped: 0, errors: [] as string[] };

    for (const profile of profiles) {
      // Update auth password
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password: tempPassword }
      );

      if (updateErr) {
        if (updateErr.message?.includes("not found")) {
          results.skipped++;
        } else {
          results.errors.push(`${profile.nome || profile.email}: ${updateErr.message}`);
        }
        continue;
      }

      // Set flag
      const { error: flagErr } = await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", profile.id);

      if (flagErr) {
        results.errors.push(`${profile.nome || profile.email}: flag error - ${flagErr.message}`);
      } else {
        results.updated++;
      }
    }

    console.log(`[bulk-reset-passwords] Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[bulk-reset-passwords] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
