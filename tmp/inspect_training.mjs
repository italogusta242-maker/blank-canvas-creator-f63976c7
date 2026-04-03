import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanVyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- BUSCANDO LIÇÕES DE TREINO ---');
  const { data: lessons, error: err1 } = await supabase
    .from('challenge_lessons')
    .select('id, title, description')
    .ilike('title', '%Treino%');
    
  if (err1) {
    console.error('Erro ao buscar lições:', err1);
  } else {
    lessons.forEach(l => {
      console.log(`[ID: ${l.id}] TITULO: ${l.title}`);
      console.log(`DESCRIÇÃO: ${l.description}`);
      console.log('-------------------');
    });
  }

  console.log('\n--- BUSCANDO PLANOS DE TREINO ---');
  const { data: plans, error: err2 } = await supabase
    .from('training_plans')
    .select('*');
    
  if (err2) {
    console.error('Erro ao buscar planos:', err2);
  } else {
    plans.forEach(p => {
      console.log(`[ID: ${p.id}] NOME: ${p.title}`);
      console.log(`DESCRIÇÃO: ${p.description}`);
      console.log('-------------------');
    });
  }
}

run();
