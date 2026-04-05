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

    const { user_ids } = await req.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profilesActivated = 0;
    let subsActivated = 0;
    const errors: string[] = [];

    // 1. Activate profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ status: "ativo" })
      .in("id", user_ids)
      .neq("status", "ativo")
      .select("id");

    if (profileError) {
      errors.push(`profiles: ${profileError.message}`);
    } else {
      profilesActivated = profileData?.length || 0;
    }

    // 2. Activate subscriptions - update existing ones
    const { data: subData, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "active", payment_status: "paid" })
      .in("user_id", user_ids)
      .select("id");

    if (subError) {
      errors.push(`subscriptions: ${subError.message}`);
    } else {
      subsActivated = subData?.length || 0;
    }

    // 3. For users without any subscription, create one
    const { data: existingSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .in("user_id", user_ids);

    const usersWithSub = new Set((existingSubs || []).map((s: any) => s.user_id));
    const usersWithoutSub = user_ids.filter((id: string) => !usersWithSub.has(id));

    if (usersWithoutSub.length > 0) {
      // Get default plan
      const { data: plans } = await supabaseAdmin
        .from("subscription_plans")
        .select("id, price")
        .eq("active", true)
        .order("price", { ascending: true })
        .limit(1);

      const defaultPlan = plans?.[0];

      for (const userId of usersWithoutSub) {
        const { error: insertErr } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            status: "active",
            payment_status: "paid",
            plan_price: defaultPlan?.price || 0,
            subscription_plan_id: defaultPlan?.id || null,
          });

        if (insertErr) {
          errors.push(`sub insert ${userId}: ${insertErr.message}`);
        } else {
          subsActivated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        profiles_activated: profilesActivated,
        subscriptions_activated: subsActivated,
        total_requested: user_ids.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
