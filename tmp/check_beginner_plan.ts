import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanZyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  console.log("Found", data.length, "total plans");
  data.forEach(plan => {
    console.log(`- ID: ${plan.id}, Name: ${plan.name}, Level: ${plan.level}, Active: ${plan.active}`);
    if (plan.name.toLowerCase().includes("iniciante")) {
        console.log("-----------------------------------------");
        console.log("Full Content for Iniciante:");
        console.log(plan.description);
        console.log("-----------------------------------------");
    }
  });
}

checkPlans();
