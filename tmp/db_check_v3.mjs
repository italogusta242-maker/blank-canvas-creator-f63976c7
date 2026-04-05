import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: rows } = await supabase.from('user_selected_plans').select('*').limit(1);
  if (rows && rows.length > 0) {
    console.log("Columns found in user_selected_plans:", Object.keys(rows[0]));
  } else {
    // If empty, try to get info via RPC or just guess common ones
    console.log("Table is empty, checking profiles to confirm connection...");
    const { data: profile } = await supabase.from('profiles').select('*').limit(1);
    if (profile) console.log("Connection OK");
  }
}
check();
