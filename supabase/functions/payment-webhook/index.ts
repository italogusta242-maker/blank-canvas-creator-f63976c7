import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extracts customer email from various InfinitePay payload formats.
 * Logs every attempt for debugging.
 */
function extractEmail(payload: any): string | null {
  const candidates = [
    payload.customer?.email,
    payload.payer?.email,
    payload.email,
    payload.metadata?.email,
    payload.metadata?.customer_email,
    payload.data?.customer?.email,
    payload.data?.metadata?.email,
    payload.data?.metadata?.customer_email,
    payload.data?.email,
  ];

  for (const c of candidates) {
    if (c && typeof c === "string" && c.includes("@")) {
      return c.toLowerCase().trim();
    }
  }
  return null;
}

/**
 * Extracts CPF from various InfinitePay payload formats.
 */
function extractCpf(payload: any): string | null {
  const candidates = [
    payload.customer?.cpf,
    payload.customer?.document,
    payload.payer?.cpf,
    payload.payer?.document,
    payload.metadata?.cpf,
    payload.data?.customer?.cpf,
    payload.data?.customer?.document,
  ];

  for (const c of candidates) {
    if (c && typeof c === "string" && c.length >= 11) {
      return c.replace(/\D/g, "");
    }
  }
  return null;
}

/**
 * Checks if the payload represents a confirmed/approved payment.
 */
function isPaymentApproved(payload: any): boolean {
  const event = payload.event || payload.type || payload.status;
  const dataStatus = payload.data?.status;

  const approvedEvents = [
    "payment.confirmed",
    "payment.approved",
    "PAYMENT_RECEIVED",
    "approved",
    "paid",
    "confirmed",
  ];

  const approvedStatuses = ["paid", "approved", "confirmed"];

  return (
    approvedEvents.includes(event) ||
    approvedStatuses.includes(payload.status) ||
    approvedStatuses.includes(dataStatus)
  );
}

/**
 * Extracts transaction ID from various payload formats.
 */
function extractTransactionId(payload: any): string | null {
  return (
    payload.id ||
    payload.transaction_id ||
    payload.data?.id ||
    payload.data?.transaction_id ||
    payload.metadata?.transaction_id ||
    null
  );
}

/**
 * Extracts payment amount from various payload formats.
 */
function extractAmount(payload: any): number {
  const raw =
    payload.amount ||
    payload.data?.amount ||
    payload.metadata?.amount ||
    payload.total ||
    payload.data?.total ||
    0;
  return Number(raw) || 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── 1. Parse and log entire payload ──
    const rawBody = await req.text();
    console.log("═══════════════════════════════════════════");
    console.log("🔔 PAYMENT WEBHOOK RECEIVED at", new Date().toISOString());
    console.log("📦 RAW PAYLOAD:", rawBody);
    console.log("═══════════════════════════════════════════");

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("❌ FAILED TO PARSE JSON PAYLOAD");
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Check if payment is approved ──
    const approved = isPaymentApproved(payload);
    console.log("💳 Payment approved?", approved);
    console.log("   event:", payload.event || payload.type);
    console.log("   status:", payload.status);
    console.log("   data.status:", payload.data?.status);

    if (!approved) {
      console.log("⏭️ Not a confirmed payment, ignoring.");
      // Log ignored events too
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceRoleKey) {
          const tempAdmin = createClient(supabaseUrl, serviceRoleKey);
          await tempAdmin.from("webhook_logs").insert({
            email: extractEmail(payload),
            event_type: payload.event || payload.type || payload.status || "unknown",
            status_log: "ignorado",
            raw_payload: payload,
          });
        }
      } catch (_) {}
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not_approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Extract identifiers ──
    const email = extractEmail(payload);
    const cpf = extractCpf(payload);
    const gatewayTxId = extractTransactionId(payload);
    const amount = extractAmount(payload);

    console.log("📧 Extracted email:", email);
    console.log("📋 Extracted CPF:", cpf);
    console.log("🆔 Transaction ID:", gatewayTxId);
    console.log("💰 Amount:", amount);

    if (!email && !cpf) {
      console.error("❌ NO EMAIL AND NO CPF FOUND IN PAYLOAD");
      console.error("   Full payload keys:", Object.keys(payload));
      if (payload.customer) console.error("   customer keys:", Object.keys(payload.customer));
      if (payload.data) console.error("   data keys:", Object.keys(payload.data));
      if (payload.metadata) console.error("   metadata keys:", Object.keys(payload.metadata));

      // Log the failure
      try {
        const logUrl = Deno.env.get("SUPABASE_URL");
        const logKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (logUrl && logKey) {
          const logClient = createClient(logUrl, logKey);
          await logClient.from("webhook_logs").insert({
            email: null,
            event_type: payload.event || payload.type || "unknown",
            status_log: "erro",
            raw_payload: payload,
          });
        }
      } catch (_) {}
      return new Response(
        JSON.stringify({ error: "No email or CPF found in payload", payload_keys: Object.keys(payload) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Initialize Supabase admin client ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ MISSING ENV VARS: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── 5. Find user profile ──
    let profileId: string | null = null;
    let profileStatus: string | null = null;

    // Strategy A: Search by email
    if (email) {
      console.log("🔍 Searching profile by email:", email);
      const { data: profileByEmail, error: emailErr } = await supabaseAdmin
        .from("profiles")
        .select("id, status, email, nome")
        .eq("email", email)
        .maybeSingle();

      if (emailErr) {
        console.error("❌ Error searching profile by email:", emailErr.message);
      } else if (profileByEmail) {
        profileId = profileByEmail.id;
        profileStatus = profileByEmail.status;
        console.log("✅ Found profile by email:", profileId, "status:", profileStatus, "nome:", profileByEmail.nome);
      } else {
        console.log("⚠️ No profile found with email:", email);
      }
    }

    // Strategy B: Search by CPF (fallback)
    if (!profileId && cpf) {
      console.log("🔍 Searching profile by CPF:", cpf);
      const { data: profileByCpf, error: cpfErr } = await supabaseAdmin
        .from("profiles")
        .select("id, status, email, nome")
        .eq("cpf", cpf)
        .maybeSingle();

      if (cpfErr) {
        console.error("❌ Error searching profile by CPF:", cpfErr.message);
      } else if (profileByCpf) {
        profileId = profileByCpf.id;
        profileStatus = profileByCpf.status;
        console.log("✅ Found profile by CPF:", profileId, "status:", profileStatus);
      } else {
        console.log("⚠️ No profile found with CPF:", cpf);
      }
    }

    // Strategy C: Search in Auth users (fallback)
    if (!profileId && email) {
      console.log("🔍 Searching Auth users by email:", email);
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
      const foundUser = userList?.users?.find(
        (u: any) => u.email?.toLowerCase() === email
      );
      if (foundUser) {
        profileId = foundUser.id;
        console.log("✅ Found Auth user:", profileId);
        
        // Check if profile exists for this auth user
        const { data: authProfile } = await supabaseAdmin
          .from("profiles")
          .select("id, status")
          .eq("id", foundUser.id)
          .maybeSingle();
        
        profileStatus = authProfile?.status || null;
        console.log("   Profile status:", profileStatus);
      } else {
        console.log("⚠️ No Auth user found with email:", email);
      }
    }

    // ── 6. Resolve plan from funnel_leads ──
    let subscriptionPlanId: string | null = null;
    let planPrice: number = amount;

    if (email) {
      const { data: lead } = await supabaseAdmin
        .from("funnel_leads")
        .select("selected_plan_id, selected_plan_price")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead?.selected_plan_id) {
        subscriptionPlanId = lead.selected_plan_id;
        if (lead.selected_plan_price) planPrice = lead.selected_plan_price;
        console.log("📋 Plan from lead:", subscriptionPlanId, "price:", planPrice);
      }
    }

    // Fallback: plan from payload metadata
    if (!subscriptionPlanId) {
      const metaPlanId = payload.metadata?.plan_id || payload.plan_id;
      if (metaPlanId) {
        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("id, price")
          .eq("id", metaPlanId)
          .maybeSingle();
        if (plan) {
          subscriptionPlanId = plan.id;
          if (!planPrice) planPrice = Number(plan.price) || 0;
        }
      }
    }

    // ── 7. If no profile found, try to create from leads ──
    if (!profileId) {
      console.log("⚠️ NO PROFILE FOUND. Attempting fallback creation...");

      // Try pending_checkouts
      if (email) {
        const { data: pending } = await supabaseAdmin
          .from("pending_checkouts")
          .select("*")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pending) {
          console.log("📦 Found pending_checkout for:", email);
          const { data: newUser, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: pending.email,
              password: pending.password,
              email_confirm: true,
              user_metadata: { nome: pending.nome },
            });

          if (createError) {
            console.error("❌ Failed to create user from pending:", createError.message);
          } else {
            profileId = newUser.user.id;
            await new Promise(r => setTimeout(r, 800));
            console.log("✅ Created user from pending_checkout:", profileId);

            await supabaseAdmin
              .from("profiles")
              .update({ status: "ativo", telefone: pending.telefone })
              .eq("id", profileId);

            await supabaseAdmin.from("pending_checkouts").delete().eq("id", pending.id);
            profileStatus = "ativo";
          }
        }
      }

      // Try funnel_leads
      if (!profileId && email) {
        const { data: leadData } = await supabaseAdmin
          .from("funnel_leads")
          .select("nome, email, telefone")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (leadData) {
          console.log("📦 Found funnel_lead for:", email, "nome:", leadData.nome);
          const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
          const { data: newUser, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: { nome: leadData.nome },
            });

          if (createError) {
            console.error("❌ Failed to create user from lead:", createError.message);
          } else {
            profileId = newUser.user.id;
            await new Promise(r => setTimeout(r, 800));
            console.log("✅ Created user from funnel_lead:", profileId);

            await supabaseAdmin
              .from("profiles")
              .update({ status: "ativo", telefone: leadData.telefone })
              .eq("id", profileId);
            profileStatus = "ativo";
          }
        }
      }

      if (!profileId) {
        console.error("❌ FAILED: No user found or created for email:", email, "cpf:", cpf);
        await supabaseAdmin.from("webhook_logs").insert({
          email,
          event_type: payload.event || payload.type || "payment.approved",
          status_log: "usuario_nao_encontrado",
          raw_payload: payload,
        });
        return new Response(
          JSON.stringify({ error: "User not found and could not be created", email, cpf }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 8. IDEMPOTENCY CHECK ──
    // If we have a gateway transaction ID, check if we already processed this payment
    if (gatewayTxId) {
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("gateway_transaction_id", gatewayTxId)
        .maybeSingle();

      if (existingPayment) {
        console.log("⚡ IDEMPOTENCY: Payment already processed for tx:", gatewayTxId);
        await supabaseAdmin.from("webhook_logs").insert({
          email,
          event_type: payload.event || payload.type || "payment.approved",
          status_log: "duplicado_ignorado",
          raw_payload: payload,
        });
        return new Response(
          JSON.stringify({ status: "already_processed", gateway_transaction_id: gatewayTxId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 9. ACTIVATE USER ──
    console.log("🚀 ACTIVATING USER:", profileId);

    // 9a. Update profile to active
    const { error: profileUpdateErr } = await supabaseAdmin
      .from("profiles")
      .update({ status: "ativo" })
      .eq("id", profileId);

    if (profileUpdateErr) {
      console.error("❌ Failed to update profile status:", profileUpdateErr.message);
    } else {
      console.log("✅ Profile status updated to 'ativo'");
    }

    // 9b. Mark funnel lead as paid
    if (email) {
      const { error: leadErr } = await supabaseAdmin
        .from("funnel_leads")
        .update({ status: "paid" })
        .eq("email", email);
      if (leadErr) {
        console.error("⚠️ Failed to update funnel_lead:", leadErr.message);
      } else {
        console.log("✅ Funnel lead marked as 'paid'");
      }
    }

    // 9c. Upsert subscription
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", profileId)
      .maybeSingle();

    if (existingSub) {
      const { error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .update({
          subscription_plan_id: subscriptionPlanId,
          plan_price: planPrice,
          status: "active",
          payment_status: "paid",
        })
        .eq("id", existingSub.id);
      if (subErr) console.error("❌ Failed to update subscription:", subErr.message);
      else console.log("✅ Subscription updated");
    } else {
      const { error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: profileId,
          subscription_plan_id: subscriptionPlanId,
          plan_price: planPrice,
          status: "active",
          payment_status: "paid",
        });
      if (subErr) console.error("❌ Failed to insert subscription:", subErr.message);
      else console.log("✅ Subscription created");
    }

    // 9d. Record payment (idempotent — we checked above)
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      user_id: profileId,
      subscription_plan_id: subscriptionPlanId,
      amount: planPrice,
      status: "paid",
      gateway_transaction_id: gatewayTxId,
    });
    if (payErr) console.error("⚠️ Failed to record payment:", payErr.message);
    else console.log("✅ Payment recorded");

    // 8e. Ensure user_roles has 'user' entry
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", profileId)
      .eq("role", "user")
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: profileId, role: "user" });
      console.log("✅ User role assigned");
    }

    const elapsed = Date.now() - startTime;
    console.log(`🏁 WEBHOOK COMPLETE in ${elapsed}ms. User ${profileId} activated.`);
    console.log("═══════════════════════════════════════════");

    // Log success
    await supabaseAdmin.from("webhook_logs").insert({
      email,
      event_type: payload.event || payload.type || "payment.approved",
      status_log: "sucesso",
      raw_payload: payload,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        user_id: profileId,
        email,
        plan_price: planPrice,
        subscription_plan_id: subscriptionPlanId,
        elapsed_ms: elapsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("💥 WEBHOOK CRITICAL ERROR:", err.message);
    console.error("   Stack:", err.stack);
    // Best-effort error log
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        const errAdmin = createClient(supabaseUrl, serviceRoleKey);
        await errAdmin.from("webhook_logs").insert({
          email: null,
          event_type: "critical_error",
          status_log: "erro",
          raw_payload: { error: err.message, stack: err.stack },
        });
      }
    } catch (_) {}
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
