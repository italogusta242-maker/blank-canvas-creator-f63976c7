import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanZyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listLessons() {
  const { data: lessons, error: checkError } = await supabase
    .from('challenge_lessons')
    .select('id, title');

  if (checkError) {
    console.error("Error finding lesson:", checkError);
    return;
  }

  console.log("All Challenge Lessons:");
  lessons.forEach(l => console.log(l.title));
  
  const { data: plans } = await supabase.from('training_plans').select('id, name');
  console.log("All Training Plans:");
  plans?.forEach(p => console.log(p.name));
}

listLessons();
