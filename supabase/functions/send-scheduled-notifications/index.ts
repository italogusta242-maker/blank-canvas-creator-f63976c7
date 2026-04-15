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

    // Check for auto-pool action (called by cron)
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "auto-pool") {
      const category = url.searchParams.get("category");
      if (!category) {
        return new Response(JSON.stringify({ error: "category required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if auto notifications are enabled
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "auto_notifications_enabled")
        .maybeSingle();

      if (setting?.value === "false") {
        console.log("[auto-pool] Disabled by admin, skipping");
        return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pick a random template from the category
      const { data: templates, error: tplErr } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("category", category);

      if (tplErr || !templates || templates.length === 0) {
        console.log(`[auto-pool] No templates for category: ${category}`);
        return new Response(JSON.stringify({ error: "no templates found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const picked = templates[Math.floor(Math.random() * templates.length)];
      console.log(`[auto-pool] Picked template: "${picked.title}" (${category})`);

      // Get all active users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("status", "ativo");

      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert notifications in batches
      const rows = profiles.map((p: { id: string }) => ({
        user_id: p.id,
        title: picked.title,
        body: picked.body,
        type: "auto_pool",
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        await supabase.from("notifications").insert(batch);
      }

      // Save to broadcast history
      await supabase
        .from("broadcast_notifications")
        .insert({ title: picked.title, body: picked.body });

      console.log(`[auto-pool] Sent "${picked.title}" to ${profiles.length} users`);
      return new Response(
        JSON.stringify({ sent: profiles.length, template: picked.title }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Original scheduled notifications logic ===
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

            for (let i = 0; i < rows.length; i += 50) {
              const batch = rows.slice(i, i + 50);
              await supabase.from("notifications").insert(batch);
            }
            totalSent += profiles.length;
          }

          await supabase
            .from("broadcast_notifications")
            .insert({ title: item.title, body: item.body });
        } else {
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
