import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, telefone, newPassword } = await req.json();

    if (!email || !telefone || !newPassword) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, telefone, newPassword" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.toLowerCase().trim();
    const phoneDigits = telefone.replace(/\D/g, "");

    // Check profile matches email + phone
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, telefone, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError || !profile) {
      // Fallback: check funnel_leads
      const { data: lead } = await supabaseAdmin
        .from("funnel_leads")
        .select("email, telefone")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!lead) {
        return new Response(JSON.stringify({ error: "Dados não conferem. Verifique email e telefone." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const leadPhoneDigits = (lead.telefone || "").replace(/\D/g, "");
      if (leadPhoneDigits !== phoneDigits) {
        return new Response(JSON.stringify({ error: "Dados não conferem. Verifique email e telefone." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const profilePhoneDigits = (profile.telefone || "").replace(/\D/g, "");
      if (profilePhoneDigits !== phoneDigits) {
        return new Response(JSON.stringify({ error: "Dados não conferem. Verifique email e telefone." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find auth user by email — paginate to find reliably
    let authUser: any = null;
    let page = 1;
    while (!authUser) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 50,
      });
      if (listError) throw listError;
      if (!users || users.length === 0) break;
      authUser = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (!authUser && users.length < 50) break;
      page++;
    }

    if (!authUser) {
      // Auth user doesn't exist — auto-repair: create the Auth user now
      const nome = profile?.id
        ? (await supabaseAdmin.from("profiles").select("nome").eq("id", profile.id).single()).data?.nome
        : undefined;

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { nome: nome || "Usuário" },
      });

      if (createErr) {
        // If email_exists, the user IS in Auth but listUsers missed them
        // Try to find by creating a dummy sign-in attempt won't work, 
        // so use the admin API to get user by email directly
        if (createErr.message?.includes("already been registered")) {
          console.log("User exists in Auth but listUsers missed. Searching all users...");
          // Brute search all pages
          let searchPage = 1;
          while (!authUser) {
            const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({
              page: searchPage,
              perPage: 1000,
            });
            if (!allUsers || allUsers.length === 0) break;
            authUser = allUsers.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
            if (!authUser && allUsers.length < 1000) break;
            searchPage++;
          }
          
          if (!authUser) {
            return new Response(JSON.stringify({
              error: "Erro interno ao localizar sua conta. Entre em contato com o suporte.",
              code: "AUTH_LOOKUP_FAILED",
            }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.error("Auto-repair createUser failed:", createErr);
          return new Response(JSON.stringify({
            error: "Erro ao criar sua conta. Entre em contato com o suporte informando seu e-mail.",
            code: "CREATE_FAILED",
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        authUser = newUser.user;
      }

      // Wait for trigger
      await new Promise(r => setTimeout(r, 300));

      // Ensure profile is active
      if (profile?.id) {
        await supabaseAdmin.from("profiles").update({ status: "ativo" }).eq("id", profile.id);
      } else {
        // Ensure profile exists
        const { data: existingP } = await supabaseAdmin.from("profiles").select("id").eq("id", authUser.id).maybeSingle();
        if (!existingP) {
          await supabaseAdmin.from("profiles").insert({
            id: authUser.id,
            email: normalizedEmail,
            nome: nome || "Usuário",
            status: "ativo",
          });
        } else {
          await supabaseAdmin.from("profiles").update({ status: "ativo" }).eq("id", authUser.id);
        }
      }

      // Ensure role
      const { data: existingRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", authUser.id).eq("role", "user").maybeSingle();
      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({ user_id: authUser.id, role: "user" });
      }

      // Ensure subscription
      const { data: existingSub } = await supabaseAdmin.from("subscriptions").select("id").eq("user_id", authUser.id).maybeSingle();
      if (!existingSub) {
        const { data: defaultPlan } = await supabaseAdmin
          .from("subscription_plans")
          .select("id, price")
          .eq("active", true)
          .order("price", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (defaultPlan) {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: authUser.id,
            subscription_plan_id: defaultPlan.id,
            plan_price: defaultPlan.price,
            status: "active",
            payment_status: "pending_audit",
            started_at: new Date().toISOString(),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, auto_repaired: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also ensure profile is ativo (in case it was stuck)
    await supabaseAdmin.from("profiles").update({ status: "ativo" }).eq("id", authUser.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("reset-password-verify error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
