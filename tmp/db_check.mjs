import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'user_selected_plans' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: cols, error: err } = await supabase.from('user_selected_plans').select('*').limit(1);
    if (err) console.error(err);
    else console.log("Columns:", Object.keys(cols[0] || {}));
  } else {
    console.log(data);
  }
}
check();
