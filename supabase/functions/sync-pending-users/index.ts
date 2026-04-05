import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all pending profiles with email
    const { data: pendingProfiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, nome, status")
      .in("status", ["pendente", "pendente_onboarding"])
      .not("email", "is", null);

    if (profilesErr) throw profilesErr;
    if (!pendingProfiles || pendingProfiles.length === 0) {
      return new Response(
        JSON.stringify({ activated: 0, message: "Nenhum perfil pendente encontrado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all successful payments
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("user_id, amount, subscription_plan_id")
      .eq("status", "paid");

    // Get all successful webhook logs
    const { data: webhookLogs } = await supabaseAdmin
      .from("webhook_logs")
      .select("email, status_log")
      .eq("status_log", "sucesso");

    // Build sets of user_ids that have paid and emails from successful webhooks
    const paidUserIds = new Set((payments || []).map((p: any) => p.user_id));
    const successEmails = new Set((webhookLogs || []).map((w: any) => w.email?.toLowerCase()).filter(Boolean));

    // Get paid funnel leads
    const { data: paidLeads } = await supabaseAdmin
      .from("funnel_leads")
      .select("email")
      .eq("status", "paid");
    const paidLeadEmails = new Set((paidLeads || []).map((l: any) => l.email?.toLowerCase()).filter(Boolean));

    const toActivate: string[] = [];

    for (const profile of pendingProfiles) {
      const email = profile.email?.toLowerCase();
      // Match if: has a payment record, or email is in successful webhooks, or funnel lead is paid
      if (
        paidUserIds.has(profile.id) ||
        (email && successEmails.has(email)) ||
        (email && paidLeadEmails.has(email))
      ) {
        toActivate.push(profile.id);
      }
    }

    if (toActivate.length === 0) {
      return new Response(
        JSON.stringify({ activated: 0, total_pending: pendingProfiles.length, message: "Nenhum match encontrado entre pendentes e pagamentos." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Activate profiles
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ status: "ativo" })
      .in("id", toActivate);

    if (updateErr) throw updateErr;

    // Ensure subscriptions exist
    const { data: existingSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .in("user_id", toActivate);

    const usersWithSub = new Set((existingSubs || []).map((s: any) => s.user_id));
    const needSub = toActivate.filter((id) => !usersWithSub.has(id));

    // Update existing subs
    if (usersWithSub.size > 0) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "active", payment_status: "paid" })
        .in("user_id", Array.from(usersWithSub));
    }

    // Create new subs for those without
    if (needSub.length > 0) {
      const { data: plans } = await supabaseAdmin
        .from("subscription_plans")
        .select("id, price")
        .eq("active", true)
        .order("price", { ascending: true })
        .limit(1);

      const defaultPlan = plans?.[0];

      const newSubs = needSub.map((userId) => ({
        user_id: userId,
        status: "active",
        payment_status: "paid",
        plan_price: defaultPlan?.price || 0,
        subscription_plan_id: defaultPlan?.id || null,
      }));

      await supabaseAdmin.from("subscriptions").insert(newSubs);
    }

    return new Response(
      JSON.stringify({
        activated: toActivate.length,
        total_pending: pendingProfiles.length,
        message: `${toActivate.length} usuário(s) ativado(s) com sucesso.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-pending error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
