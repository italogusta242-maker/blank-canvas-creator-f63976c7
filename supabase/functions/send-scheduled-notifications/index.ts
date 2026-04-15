import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch pending notifications whose time has come
    const { data: pending, error: fetchErr } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchErr) {
      console.error("Error fetching scheduled:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const item of pending) {
      try {
        if (item.recipient_mode === "all") {
          // Get all active users
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("status", "ativo");

          if (profiles && profiles.length > 0) {
            const rows = profiles.map((p: { id: string }) => ({
              user_id: p.id,
              title: item.title,
              body: item.body,
              type: "admin_broadcast",
            }));

            // Insert in batches of 50 to avoid payload limits
            for (let i = 0; i < rows.length; i += 50) {
              const batch = rows.slice(i, i + 50);
              await supabase.from("notifications").insert(batch);
            }
            totalSent += profiles.length;
          }

          // Also save to broadcast_notifications for history
          await supabase
            .from("broadcast_notifications")
            .insert({ title: item.title, body: item.body });
        } else {
          // Individual notification
          if (item.target_user_id) {
            await supabase.from("notifications").insert({
              user_id: item.target_user_id,
              title: item.title,
              body: item.body,
              type: "admin_broadcast",
            });
            totalSent++;
          }
        }

        // Mark as sent
        await supabase
          .from("scheduled_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);
      } catch (err) {
        console.error(`Failed to process scheduled ${item.id}:`, err);
      }
    }

    console.log(`[scheduled] Processed ${pending.length}, sent ${totalSent}`);
    return new Response(
      JSON.stringify({ processed: pending.length, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
