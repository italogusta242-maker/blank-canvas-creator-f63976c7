import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Check for unique constraints using informational queries if possible
  // Since I can't run raw SQL, I'll try to trigger a conflict error voluntarily or check schema via RPC if any
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  if (!profile) return;

  console.log("Testing upsert with onConflict for user_selected_plans...");
  // Try a dummy upsert with onConflict to see if it throws "column does not exist" or "no unique constraint"
  const { error } = await supabase.from('user_selected_plans').upsert({
    user_id: profile.id,
    plan_type: 'test',
    source_plan_id: 'test-id',
    created_at: new Date().toISOString()
  }, { onConflict: 'user_id,plan_type,source_plan_id' });

  if (error) {
    console.log("Conflict Test Result:", error.message);
  } else {
    console.log("Conflict Test Result: SUCCESS (Constraint exists or handled)");
  }
}
check();
