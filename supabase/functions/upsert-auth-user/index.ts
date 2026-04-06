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
    const { email, password, nome, full_name, create_if_missing } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists in auth
    // Search through paginated listUsers
    let authUser: any = null;
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) break;
      const found = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (found) {
        authUser = found;
        break;
      }
      if (users.length < perPage) break;
      page++;
    }

    if (!authUser) {
      // User doesn't exist in auth — nothing to update
      return new Response(JSON.stringify({ action: "not_found", message: "Usuário não encontrado no Auth" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. SECURITY GUARDRAIL: Check profile status
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status")
      .eq("id", authUser.id)
      .single();

    if (profile?.status === "ativo") {
      return new Response(
        JSON.stringify({ error: "E-mail já possui assinatura ativa. Faça login com sua senha original." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Safe to update password for pending/non-active users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password,
      user_metadata: nome ? { nome } : undefined,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ action: "updated", message: "Senha atualizada com sucesso" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
