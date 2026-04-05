
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLessons() {
  const { data, error } = await supabase
    .from('challenge_lessons')
    .select('id, title, description')
    .ilike('title', '%Treino%');

  if (error) {
    console.error("Error fetching lessons:", error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

fetchLessons();
