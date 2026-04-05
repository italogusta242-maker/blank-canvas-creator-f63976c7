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

    let profilesUpdated = 0;
    let subsUpdated = 0;
    const errors: string[] = [];

    // Update profiles to 'pendente'
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ status: "pendente" })
      .in("id", user_ids)
      .select("id");

    if (profileError) {
      errors.push(`profiles: ${profileError.message}`);
    } else {
      profilesUpdated = profileData?.length || 0;
    }

    // Update subscriptions to canceled/pending
    const { data: subData, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled", payment_status: "pending" })
      .in("user_id", user_ids)
      .select("id");

    if (subError) {
      errors.push(`subscriptions: ${subError.message}`);
    } else {
      subsUpdated = subData?.length || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        profiles_updated: profilesUpdated,
        subscriptions_updated: subsUpdated,
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
