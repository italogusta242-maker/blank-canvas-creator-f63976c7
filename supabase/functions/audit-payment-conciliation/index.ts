import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CsvTransaction {
  data_hora: string;
  meio: string;
  valor: string;
  nsu: string;
  nome_origem: string;
  identificador: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transactions } = (await req.json()) as { transactions: CsvTransaction[] };
    if (!transactions || !Array.isArray(transactions)) {
      return new Response(JSON.stringify({ error: "Missing transactions array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data
    // Fetch data with specific fields to save memory
    const { data: allProfiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email, status")
      .eq("status", "ativo"); // Only active profiles for matching and Lista C. 
                              // Wait, if a user is pending but in CSV, we need to find them.
                              // So we need all profiles? No, let's fetch all but only basic fans.
    
    const { data: allPendingProfiles, error: pendErr } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email, status")
      .neq("status", "ativo");

    const { data: allSubs, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, status, plan_price");
      
    const { data: allUserRoles, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "user");
      
    const { data: allPayments, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("user_id, gateway_transaction_id")
      .not("gateway_transaction_id", "is", null);

    if (profErr || subErr || roleErr || payErr || pendErr) {
      console.error("Fetch error:", { profErr, subErr, roleErr, payErr, pendErr });
      throw new Error("Failed to fetch data from database");
    }

    const profiles = [...(allProfiles || []), ...(allPendingProfiles || [])];
    const subs = allSubs || [];
    const userRoles = allUserRoles || [];
    const payments = allPayments || [];

    const userRoleSet = new Set(userRoles.map((r: any) => r.user_id));
    const subsByUser = new Map<string, any>();
    for (const s of subs) {
      subsByUser.set(s.user_id, s);
    }

    // Build lookup maps - STRICT matching only
    const profilesByNormalizedName = new Map<string, { p: any; words: string[] }[]>();
    for (const p of profiles) {
      if (p.nome) {
        const key = normalizeStr(p.nome);
        const words = key.split(/\s+/).filter(w => w.length > 1);
        if (!profilesByNormalizedName.has(key)) profilesByNormalizedName.set(key, []);
        profilesByNormalizedName.get(key)!.push({ p, words });
      }
    }

    const paymentsByGateway = new Map<string, any>();
    for (const pay of payments) {
      if (pay.gateway_transaction_id) {
        paymentsByGateway.set(pay.gateway_transaction_id, pay);
      }
    }

    // Track which profile IDs have already been matched to prevent duplicates
    const alreadyMatchedProfileIds = new Set<string>();

    const listaA: any[] = []; // Sucesso - CSV matched with active profile
    const listaB: any[] = []; // Alerta - CSV not found OR found but pending
    const matchedProfileIds = new Set<string>();

    for (const tx of transactions) {
      const nsu = (tx.nsu || "").trim();
      const nome = (tx.nome_origem || "").trim();
      const identificador = (tx.identificador || "").trim();

      let matchedProfile: any = null;

      // 1. Try matching NSU as gateway_transaction_id (exact)
      if (nsu && paymentsByGateway.has(nsu)) {
        const pay = paymentsByGateway.get(nsu)!;
        const candidate = profiles.find((p: any) => p.id === pay.user_id);
        if (candidate && !alreadyMatchedProfileIds.has(candidate.id)) {
          matchedProfile = candidate;
        }
      }

      // 2. Try matching NSU as UUID directly against profile IDs (exact)
      if (!matchedProfile && nsu && isUUID(nsu)) {
        const candidate = profiles.find((p: any) => p.id === nsu);
        if (candidate && !alreadyMatchedProfileIds.has(candidate.id)) {
          matchedProfile = candidate;
        }
      }

      // 3. Try matching identificador as UUID (exact)
      if (!matchedProfile && identificador && isUUID(identificador)) {
        const candidate = profiles.find((p: any) => p.id === identificador);
        if (candidate && !alreadyMatchedProfileIds.has(candidate.id)) {
          matchedProfile = candidate;
        }
      }

      // 4. Name matching: exact first, then controlled partial for multi-word names
      if (!matchedProfile && nome) {
        const key = normalizeStr(nome);
        if (key.length >= 3) {
          // 4a. Exact normalized name match
          const candidates = profilesByNormalizedName.get(key);
          if (candidates) {
            const unmatched = candidates.filter((c: any) => !alreadyMatchedProfileIds.has(c.p.id));
            if (unmatched.length === 1) {
              matchedProfile = unmatched[0].p;
            }
          }

          // 4b. Controlled partial: both must have 2+ words, one contains the other
          if (!matchedProfile) {
            const csvWords = key.split(/\s+/).filter(w => w.length > 1);
            if (csvWords.length >= 2) {
              const partialMatches: any[] = [];
              for (const [pKey, pList] of profilesByNormalizedName) {
                for (const item of pList) {
                  if (item.words.length < 2) continue;
                  // Check if all words from the shorter name exist in the longer
                  const shorter = csvWords.length <= item.words.length ? csvWords : item.words;
                  const longer = csvWords.length <= item.words.length ? item.words : csvWords;
                  const allMatch = shorter.every(sw => longer.some(lw => lw === sw));
                  if (allMatch && !alreadyMatchedProfileIds.has(item.p.id)) {
                    partialMatches.push(item.p);
                  }
                }
              }
              if (partialMatches.length === 1) {
                matchedProfile = partialMatches[0];
              }
            }
          }
        }
      }

      if (matchedProfile) {
        alreadyMatchedProfileIds.add(matchedProfile.id);
        matchedProfileIds.add(matchedProfile.id);
        const sub = subsByUser.get(matchedProfile.id);
        const isAtivo = matchedProfile.status === "ativo";
        const hasActiveSub = sub && sub.status === "active";

        if (isAtivo && hasActiveSub) {
          // Lista A: already active
          listaA.push({
            csv_nome: nome || identificador,
            csv_valor: tx.valor,
            csv_data: tx.data_hora,
            csv_meio: tx.meio,
            db_id: matchedProfile.id,
            db_nome: matchedProfile.nome,
            db_email: matchedProfile.email,
            db_status: matchedProfile.status,
            sub_status: sub?.status || "sem assinatura",
          });
        } else {
          // Lista B: found but not active - needs activation
          listaB.push({
            csv_nome: nome || identificador,
            csv_valor: tx.valor,
            csv_data: tx.data_hora,
            csv_meio: tx.meio,
            db_id: matchedProfile.id,
            db_nome: matchedProfile.nome,
            db_email: matchedProfile.email,
            db_status: matchedProfile.status,
            sub_status: sub?.status || "sem assinatura",
            problema: !isAtivo ? "Perfil não ativo (pendente)" : "Sem assinatura ativa",
          });
        }
      } else {
        // Lista B: not found at all
        listaB.push({
          csv_nome: nome || identificador || "Desconhecido",
          csv_valor: tx.valor,
          csv_data: tx.data_hora,
          csv_meio: tx.meio,
          db_id: null,
          db_nome: null,
          db_email: null,
          db_status: null,
          sub_status: null,
          problema: "Usuário não encontrado no banco",
        });
      }
    }

    // Lista C: users with role=user, status=ativo, but NOT in CSV
    const listaC: any[] = [];
    for (const p of profiles) {
      if (
        p.status === "ativo" &&
        userRoleSet.has(p.id) &&
        !matchedProfileIds.has(p.id)
      ) {
        const sub = subsByUser.get(p.id);
        listaC.push({
          db_id: p.id,
          db_nome: p.nome,
          db_email: p.email,
          db_status: p.status,
          sub_status: sub?.status || "sem assinatura",
          sub_valor: sub?.plan_price || 0,
        });
      }
    }

    // Optimization: Return a smaller response by omitting nulls or redundant fields if possible
    // but keeping current structure for frontend compatibility
    const responseBody = JSON.stringify({
      lista_a: listaA,
      lista_b: listaB,
      lista_c: listaC,
      resumo: {
        total_csv: transactions.length,
        sucesso: listaA.length,
        alerta: listaB.length,
        investigar: listaC.length,
      },
    });

    console.log(`Conciliation finished. Response size: ${Math.round(responseBody.length / 1024)} KB`);

    return new Response(
      responseBody,
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Conciliation error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
