
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findModules() {
  const { data: modules, error } = await supabase
    .from('challenge_modules')
    .select('id, title');
  
  if (error) {
    console.error("Error fetching modules:", error);
    return;
  }

  console.log("Modules found:", JSON.stringify(modules, null, 2));
}

findModules();
