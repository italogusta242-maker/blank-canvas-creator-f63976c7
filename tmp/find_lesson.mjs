import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanVyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: lessons, error } = await supabase
    .from('challenge_lessons')
    .select('id, title')
    .ilike('title', '%Casa%');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Lessons found:', JSON.stringify(lessons, null, 2));
  }
}

run();
