import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 20;

/** Reliably find an Auth user by email using the filter param */
async function findAuthUserByEmail(adminClient: any, email: string) {
  const { data: { users }, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    filter: email,
  } as any);
  if (error) throw error;
  const match = users?.find((u: any) => u.email?.toLowerCase() === email);
  return match || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
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
      return new Response(JSON.stringify({ error: "Apenas administradores podem migrar leads" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check request body for repair mode
    let repairMode = false;
    try {
      const body = await req.json();
      repairMode = body?.repair === true;
    } catch {
      // no body = normal mode
    }

    // Count total pending leads
    const pendingFilter = repairMode ? "migrated" : undefined;
    let leadsQuery = adminClient.from("funnel_leads").select("*").order("created_at", { ascending: true }).limit(BATCH_SIZE);

    if (repairMode) {
      // Re-process previously migrated leads to fix orphans
      leadsQuery = leadsQuery.eq("status", "migrated");
    } else {
      leadsQuery = leadsQuery.neq("status", "migrated");
    }

    const { count: totalPending } = await adminClient
      .from("funnel_leads")
      .select("id", { count: "exact", head: true })
      .neq("status", repairMode ? "__none__" : "migrated");

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({
        created: 0, skipped: 0, repaired: 0, errors: [], remaining: 0,
        message: repairMode ? "Nenhum lead migrado para reparar." : "Nenhum lead pendente para migrar.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch default plan
    const { data: defaultPlan } = await adminClient
      .from("subscription_plans")
      .select("id, price")
      .eq("active", true)
      .order("price", { ascending: true })
      .limit(1)
      .maybeSingle();

    const results = { created: 0, skipped: 0, repaired: 0, errors: [] as string[], remaining: 0 };

    for (const lead of leads) {
      try {
        const email = lead.email?.toLowerCase().trim();
        if (!email) {
          results.errors.push(`Lead ${lead.id}: email vazio`);
          await adminClient.from("funnel_leads").update({ status: "migrated" }).eq("id", lead.id);
          continue;
        }

        let userId: string | null = null;
        let wasCreated = false;

        // Step 1: Try to create Auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: "anaac123",
          email_confirm: true,
          user_metadata: { nome: lead.nome },
        });

        if (createError) {
          if (createError.message?.includes("already been registered")) {
            // Step 2: Find existing user reliably using filter (not paginated list)
            const existingUser = await findAuthUserByEmail(adminClient, email);
            if (existingUser) {
              userId = existingUser.id;
            } else {
              results.errors.push(`${email}: existe no Auth mas não encontrado via filter`);
              continue; // DON'T mark as migrated — retry later
            }
          } else {
            results.errors.push(`${email}: ${createError.message}`);
            continue; // DON'T mark as migrated
          }
        } else {
          userId = newUser.user.id;
          wasCreated = true;
          // Wait for handle_new_user trigger
          await new Promise(r => setTimeout(r, 300));
        }

        // Step 3: Ensure profile exists and is active
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id, status")
          .eq("id", userId)
          .maybeSingle();

        if (existingProfile) {
          // Update profile to ativo
          await adminClient.from("profiles").update({
            nome: lead.nome || existingProfile.status,
            telefone: lead.telefone || null,
            email: email,
            status: "ativo",
          }).eq("id", userId);
        } else {
          // Profile doesn't exist (trigger may have failed) — create manually
          await adminClient.from("profiles").insert({
            id: userId,
            nome: lead.nome,
            telefone: lead.telefone || null,
            email: email,
            status: "ativo",
          });
        }

        // Step 4: Ensure user_roles entry exists
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "user")
          .maybeSingle();

        if (!existingRole) {
          await adminClient.from("user_roles").insert({
            user_id: userId,
            role: "user",
          });
        }

        // Step 5: Ensure subscription exists
        if (defaultPlan) {
          const { data: existingSub } = await adminClient
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingSub) {
            await adminClient.from("subscriptions").insert({
              user_id: userId,
              subscription_plan_id: defaultPlan.id,
              plan_price: defaultPlan.price,
              status: "active",
              payment_status: "pending_audit",
              started_at: new Date().toISOString(),
            });
          }
        }

        // Step 6: ONLY mark as migrated after ALL validations pass
        await adminClient.from("funnel_leads").update({ status: "migrated" }).eq("id", lead.id);

        if (wasCreated) {
          results.created++;
        } else if (repairMode) {
          results.repaired++;
        } else {
          results.skipped++;
        }

      } catch (err: any) {
        results.errors.push(`${lead.email}: ${err.message}`);
        // In normal mode, don't mark as migrated on error
        // In repair mode, also don't re-mark
      }
    }

    results.remaining = Math.max(0, (totalPending || 0) - leads.length);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("migrate-leads error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
