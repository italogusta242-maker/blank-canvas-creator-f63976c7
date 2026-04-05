import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRow {
  nome: string;
  email: string;
  telefone?: string;
  plano_id: string;
  data_compra: string; // ISO or dd/mm/yyyy
}

function parseDate(raw: string): string {
  // Accept dd/mm/yyyy or ISO
  const parts = raw.trim().split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`;
  }
  return new Date(raw).toISOString();
}

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

    // Verify admin
    const authHeader = req.headers.get("Authorization");
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

    const { rows } = await req.json() as { rows: ImportRow[] };
    if (!rows?.length) {
      return new Response(JSON.stringify({ error: "No rows provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan info
    const planIds = [...new Set(rows.map(r => r.plano_id))];
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("id, name, price")
      .in("id", planIds);

    const planMap = new Map((plans || []).map(p => [p.id, p]));

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const email = row.email?.trim().toLowerCase();
      if (!email) {
        results.errors.push(`Linha sem email: ${row.nome}`);
        continue;
      }

      const plan = planMap.get(row.plano_id);
      if (!plan) {
        results.errors.push(`${email}: plano_id inválido (${row.plano_id})`);
        continue;
      }

      let purchaseDate: string;
      try {
        purchaseDate = parseDate(row.data_compra);
      } catch {
        results.errors.push(`${email}: data_compra inválida (${row.data_compra})`);
        continue;
      }

      // Generate a temp password (first 6 chars of email + "2024")
      const tempPassword = email.split("@")[0].slice(0, 6) + "2024";

      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome: row.nome },
      });

      if (authErr) {
        const msg = authErr.message || "";
        if (msg.includes("already") || msg.includes("duplicate")) {
          // User exists, try to find their ID
          const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1, page: 1 });
          // Lookup by profile email instead
          const { data: prof } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (prof) {
            // Create subscription + payment for existing user
            await createSubscriptionAndPayment(supabase, prof.id, plan, purchaseDate);
            results.skipped++;
          } else {
            results.errors.push(`${email}: já existe no Auth mas sem perfil`);
          }
          continue;
        }
        results.errors.push(`${email}: ${msg}`);
        continue;
      }

      const userId = authData.user!.id;

      // 2. Update profile with extra data
      await supabase
        .from("profiles")
        .update({
          nome: row.nome,
          email,
          telefone: row.telefone || null,
          status: "ativo",
          onboarded: true,
        })
        .eq("id", userId);

      // 3. Create subscription + payment
      await createSubscriptionAndPayment(supabase, userId, plan, purchaseDate);

      results.created++;
    }

    console.log(`[import-legacy-users] Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[import-legacy-users] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createSubscriptionAndPayment(
  supabase: any,
  userId: string,
  plan: { id: string; price: number },
  purchaseDate: string,
) {
  // Check if subscription already exists
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!existingSub) {
    await supabase.from("subscriptions").insert({
      user_id: userId,
      subscription_plan_id: plan.id,
      plan_price: plan.price,
      status: "active",
      payment_status: "paid",
      started_at: purchaseDate,
      created_at: purchaseDate,
    });
  }

  // Check if payment already exists
  const { data: existingPay } = await supabase
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("gateway_transaction_id", `legacy_import_${userId}`)
    .maybeSingle();

  if (!existingPay) {
    await supabase.from("payments").insert({
      user_id: userId,
      subscription_plan_id: plan.id,
      amount: plan.price,
      status: "paid",
      gateway_transaction_id: `legacy_import_${userId}`,
      created_at: purchaseDate,
    });
  }
}
