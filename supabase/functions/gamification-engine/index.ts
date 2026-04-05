import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();
    console.log(`Gamification Engine: Executing action - ${action}`);

    // ACTION: 18h Daily Trigger
    if (action === "daily_18h_trigger") {
      const { data: users } = await supabase.from('profiles').select('id');
      
      if (!users) return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });

      const today = new Date().toISOString().split('T')[0];

      for (const u of users) {
        // Check if user has completed any training today
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('user_id', u.id)
          .eq('status', 'completed')
          .gte('completed_at', `${today}T00:00:00.000Z`)
          .limit(1);

        if (!progress || progress.length === 0) {
          // Send push & in-app local notification
          const copys = [
            "O dia está acabando e seu shape não vai vir deitado no sofá. 15 minutinhos hoje? Vamos!",
            "E aí, desistiu do foco? Ainda dá tempo de treinar hoje 🔥",
            "Sua rotina pede constância! Um treino rápido agora muda o jogo."
          ];
          const randomCopy = copys[Math.floor(Math.random() * copys.length)];

          await supabase.from('notifications').insert({
            user_id: u.id,
            title: "Hora do Treino! ⏰",
            body: randomCopy,
            type: "gamification"
          });
        }
      }
      return new Response(JSON.stringify({ status: "success", metric: "18h trigger fired" }), { headers: corsHeaders });
    }

    // ACTION: Milestone Trigger (E.g. Webhook from lesson_progress)
    if (action === "milestone_webhook") {
      const userId = payload.record.user_id;

      const { count } = await supabase
        .from('lesson_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (count === 10 || count === 50 || count === 100) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: "Milestone Alcançado! 🏆",
          body: `VOCÊ É INSANA! ${count} treinos concluídos. Seu troféu virtual já está garantido!`,
          type: "achievement"
        });
      }
      return new Response(JSON.stringify({ status: "success", metric: "Milestone verified" }), { headers: corsHeaders });
    }

    // ACTION: Anaac verified user post broadcast (Webhook from community_posts)
    if (action === "admin_broadcast_webhook") {
      const { user_id, content } = payload.record;

      // Check if author is verified
      const { data: profile } = await supabase.from('profiles').select('is_verified').eq('id', user_id).single();
      
      if (profile && profile.is_verified) {
        await supabase.from('broadcast_notifications').insert({
          title: "Novo conteúdo Oficial! 🌟",
          body: content.substring(0, 100) + "...",
          markdown_content: `**Conteúdo novo na Comunidade!**\n\n${content}`
        });
      }
      return new Response(JSON.stringify({ status: "success", metric: "Broadcast applied if admin" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ status: "unknown action" }), { headers: corsHeaders });
  } catch (err: any) {
    console.error("Error running gamification engine", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
