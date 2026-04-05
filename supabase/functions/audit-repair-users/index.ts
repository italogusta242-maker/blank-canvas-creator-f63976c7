import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const serviceBypass = req.headers.get("x-service-key");

    // Allow service_role key via custom header (for automated calls)
    const isServiceRole = serviceBypass === serviceRoleKey;
    console.log("DEBUG: isServiceRole=", isServiceRole, "hasServiceBypass=", !!serviceBypass, "hasServiceKey=", !!serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Apenas administradores" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse body for mode
    let mode = "audit"; // "audit" or "repair"
    try {
      const body = await req.json();
      if (body?.mode === "repair") mode = "repair";
    } catch { /* default audit */ }

    // Get all migrated leads
    const { data: migratedLeads } = await adminClient
      .from("funnel_leads")
      .select("id, email, nome, telefone")
      .eq("status", "migrated");

    const issues = {
      no_auth: [] as string[],
      no_profile: [] as string[],
      no_subscription: [] as string[],
      profile_not_active: [] as string[],
      no_role: [] as string[],
    };

    let repaired = 0;

    // Get default plan for repairs
    const { data: defaultPlan } = await adminClient
      .from("subscription_plans")
      .select("id, price")
      .eq("active", true)
      .order("price", { ascending: true })
      .limit(1)
      .maybeSingle();

    for (const lead of (migratedLeads || [])) {
      const email = lead.email?.toLowerCase().trim();
      if (!email) continue;

      // Check Auth
      let authUser: any = null;
      try {
        const { data: { users } } = await adminClient.auth.admin.listUsers({
          page: 1, perPage: 1, filter: email,
        } as any);
        authUser = users?.find((u: any) => u.email?.toLowerCase() === email);
      } catch { /* skip */ }

      if (!authUser) {
        issues.no_auth.push(email);

        if (mode === "repair") {
          // Create auth user
          const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password: "anaac123",
            email_confirm: true,
            user_metadata: { nome: lead.nome },
          });
          if (!createErr && newUser?.user) {
            authUser = newUser.user;
            await new Promise(r => setTimeout(r, 300));
            repaired++;
          } else {
            continue;
          }
        } else {
          continue;
        }
      }

      const userId = authUser.id;

      // Check profile
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id, status")
        .eq("id", userId)
        .maybeSingle();

      if (!profile) {
        issues.no_profile.push(email);
        if (mode === "repair") {
          await adminClient.from("profiles").insert({
            id: userId, nome: lead.nome, email, telefone: lead.telefone, status: "ativo",
          });
          repaired++;
        }
      } else if (profile.status !== "ativo") {
        issues.profile_not_active.push(email);
        if (mode === "repair") {
          await adminClient.from("profiles").update({ status: "ativo" }).eq("id", userId);
          repaired++;
        }
      }

      // Check role
      const { data: role } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "user")
        .maybeSingle();

      if (!role) {
        issues.no_role.push(email);
        if (mode === "repair") {
          await adminClient.from("user_roles").insert({ user_id: userId, role: "user" });
          repaired++;
        }
      }

      // Check subscription
      const { data: sub } = await adminClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!sub) {
        issues.no_subscription.push(email);
        if (mode === "repair" && defaultPlan) {
          await adminClient.from("subscriptions").insert({
            user_id: userId,
            subscription_plan_id: defaultPlan.id,
            plan_price: defaultPlan.price,
            status: "active",
            payment_status: "pending_audit",
            started_at: new Date().toISOString(),
          });
          repaired++;
        }
      }
    }

    const summary = {
      total_migrated_leads: migratedLeads?.length || 0,
      issues: {
        no_auth: issues.no_auth.length,
        no_profile: issues.no_profile.length,
        no_subscription: issues.no_subscription.length,
        profile_not_active: issues.profile_not_active.length,
        no_role: issues.no_role.length,
      },
      details: issues,
      mode,
      repaired: mode === "repair" ? repaired : undefined,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("audit-repair error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
