import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "Apenas administradores podem editar contas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, full_name, email, phone, cpf, password, status, subscription_plan_id, flame_streak } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth user (email and/or password) if provided
    const authUpdate: Record<string, any> = {};
    if (email) authUpdate.email = email;
    if (password) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      // When changing email, confirm it immediately
      if (email) authUpdate.email_confirm = true;

      const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, authUpdate);
      if (authError) {
        const msg = authError.message.includes("already been registered")
          ? "Este e-mail já está em uso por outra conta."
          : authError.message;
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update profile fields
    const profileUpdate: Record<string, any> = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (email !== undefined) profileUpdate.email = email;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (cpf !== undefined) profileUpdate.cpf = cpf;
    if (status !== undefined) profileUpdate.status = status;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user_id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return new Response(JSON.stringify({ error: "Erro ao atualizar perfil: " + profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle subscription plan change
    if (subscription_plan_id !== undefined) {
      // Fetch plan details
      const { data: plan } = await adminClient
        .from("subscription_plans")
        .select("id, price")
        .eq("id", subscription_plan_id)
        .maybeSingle();

      if (plan) {
        // Check if subscription exists
        const { data: existingSub } = await adminClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", user_id)
          .maybeSingle();

        if (existingSub) {
          await adminClient
            .from("subscriptions")
            .update({
              subscription_plan_id: plan.id,
              plan_price: plan.price,
              status: "active",
            })
            .eq("id", existingSub.id);
        } else {
          await adminClient.from("subscriptions").insert({
            user_id,
            subscription_plan_id: plan.id,
            plan_price: plan.price,
            status: "active",
            payment_status: "pending_audit",
            started_at: new Date().toISOString(),
          });
        }
      }
    }

    // Handle flame streak manual override
    if (flame_streak !== undefined && flame_streak !== null) {
      const streakNum = Number(flame_streak);
      if (!isNaN(streakNum) && streakNum >= 0) {
        // Upsert flame_status
        const { data: existingFlame } = await adminClient
          .from("flame_status")
          .select("id")
          .eq("user_id", user_id)
          .maybeSingle();

        if (existingFlame) {
          await adminClient
            .from("flame_status")
            .update({
              streak: streakNum,
              state: streakNum > 0 ? "ativa" : "normal",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user_id);
        } else {
          await adminClient.from("flame_status").insert({
            user_id,
            streak: streakNum,
            state: streakNum > 0 ? "ativa" : "normal",
            last_approved_date: new Date().toISOString().split("T")[0],
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
