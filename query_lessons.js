
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLessons() {
  const { data: modules, error: modError } = await supabase
    .from('challenge_modules')
    .select('id, title, type');
  
  if (modError) {
    console.error('Error fetching modules:', modError);
    return;
  }

  console.log('Modules:', JSON.stringify(modules, null, 2));

  const { data: lessons, error: lessError } = await supabase
    .from('challenge_lessons')
    .select('id, module_id, title, description, order_index')
    .order('order_index', { ascending: true });

  if (lessError) {
    console.error('Error fetching lessons:', lessError);
    return;
  }

  console.log('Lessons:', JSON.stringify(lessons, null, 2));
}

checkLessons();
