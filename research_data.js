const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanZyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: plans } = await supabase.from('training_plans').select('id, title, groups').limit(5);
  console.log('Training Plans:', JSON.stringify(plans, null, 2));
  
  const { data: lessons } = await supabase.from('challenge_lessons').select('id, title, description').limit(5);
  console.log('Challenge Lessons:', JSON.stringify(lessons, null, 2));
}

run();
