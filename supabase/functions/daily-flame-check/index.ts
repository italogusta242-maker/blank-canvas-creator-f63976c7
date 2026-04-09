import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CHALLENGE_START_DATE = "2026-04-08";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Motor 2: O Juiz da Meia-Noite
 *
 * Runs at 03:00 UTC (00:00 BRT) via cron.
 * Checks all users with flame_status and demotes those who didn't
 * post anything yesterday in the community.
 *
 * - Ativa → Trégua (if yesterday not approved)
 * - Trégua → Extinta (if yesterday not approved)
 * - Normal stays Normal
 * - Extinta stays Extinta
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Yesterday in BRT (UTC-3)
    const now = new Date();
    const brtOffset = -3 * 60 * 60 * 1000;
    const brtNow = new Date(now.getTime() + brtOffset);
    const yesterday = new Date(brtNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    console.log(`[daily-flame-check] Running for date: ${yesterdayStr}`);

    const { data: activeFlames, error: fetchErr } = await supabase
      .from("flame_status")
      .select("user_id, state, streak, last_approved_date")
      .in("state", ["ativa", "tregua"]);

    if (fetchErr) {
      console.error("Error fetching flame statuses:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!activeFlames || activeFlames.length === 0) {
      console.log("[daily-flame-check] No active/truce flames to process");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let demotedToTruce = 0;
    let demotedToExtinct = 0;
    let unchanged = 0;

    for (const flame of activeFlames) {
      if (flame.last_approved_date === yesterdayStr) {
        unchanged++;
        continue;
      }

      const todayStr = brtNow.toISOString().split("T")[0];
      if (flame.last_approved_date === todayStr) {
        unchanged++;
        continue;
      }

      if (yesterdayStr < CHALLENGE_START_DATE) {
        unchanged++;
        continue;
      }

      const approved = await isDayApproved(supabase, flame.user_id, yesterdayStr);

      if (approved) {
        await supabase
          .from("flame_status")
          .update({ last_approved_date: yesterdayStr, updated_at: new Date().toISOString() })
          .eq("user_id", flame.user_id);
        unchanged++;
      } else {
        if (flame.state === "ativa") {
          await supabase
            .from("flame_status")
            .update({ state: "tregua", updated_at: new Date().toISOString() })
            .eq("user_id", flame.user_id);
          demotedToTruce++;
        } else if (flame.state === "tregua") {
          await supabase
            .from("flame_status")
            .update({ state: "extinta", updated_at: new Date().toISOString() })
            .eq("user_id", flame.user_id);
          demotedToExtinct++;
        }
      }
    }

    const result = {
      processed: activeFlames.length,
      unchanged,
      demotedToTruce,
      demotedToExtinct,
      date: yesterdayStr,
    };

    console.log("[daily-flame-check] Results:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[daily-flame-check] Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Check if a day is "approved" for the flame system (server-side version).
 * Approved if user made at least 1 community post that day.
 */
async function isDayApproved(
  supabase: any,
  userId: string,
  dateStr: string
): Promise<boolean> {
  // Check community posts
  const { data: posts } = await supabase
    .from("community_posts")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", `${dateStr}T00:00:00`)
    .lt("created_at", `${dateStr}T23:59:59.999`)
    .limit(1);

  if (posts && posts.length > 0) return true;

  return false;
}
