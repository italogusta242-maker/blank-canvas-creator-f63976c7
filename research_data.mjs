import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanVyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: plans, error: pErr } = await supabase.from('training_plans').select('id, title, groups').limit(5);
  if (pErr) console.error('Error fetching plans:', pErr);
  else console.log('Training Plans found:', plans.length);
  
  const { data: lessons, error: lErr } = await supabase.from('challenge_lessons').select('id, title, description').limit(5);
  if (lErr) console.error('Error fetching lessons:', lErr);
  else console.log('Challenge Lessons found:', lessons.length);

  const { data: selections, error: sErr } = await supabase.from('user_selected_plans').select('*').limit(5);
  if (sErr) console.error('Error fetching selections:', sErr);
  else console.log('User selections:', JSON.stringify(selections, null, 2));
}

run();
