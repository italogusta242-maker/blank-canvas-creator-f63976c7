import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  if (!profile) return;

  // Simple test: UPSERT without onConflict
  console.log("Testing UPSERT without manual onConflict...");
  const { error: err1 } = await supabase.from('user_selected_plans').upsert({
    user_id: profile.id,
    plan_type: 'test_no_conflict',
    source_plan_id: 'test-id',
    created_at: new Date().toISOString()
  });
  
  if (err1) {
    console.log("No Conflict Result:", err1.message);
  } else {
    console.log("No Conflict Result: SUCCESS (Supabase used default index or ignored conflict)");
  }

  // Check columns
  const { data: rows } = await supabase.from('user_selected_plans').select('*').limit(1);
  if (rows && rows.length > 0) {
    console.log("Columns found:", Object.keys(rows[0]));
  } else {
    console.log("Table is empty or not accessible");
  }
}
check();
