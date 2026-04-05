
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanZyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

const supabase = createClient(supabaseUrl, supabaseKey);

const inicianteText = `SOBRE O TREINO
Essa planilha foi criada especialmente para iniciantes, com treinos simples, eficientes e fáceis de seguir, pensados para te ajudar a criar o hábito de treinar, fortalecer o corpo e evoluir aos poucos, sem sobrecarga.

TREINO 1
Agachamento
3 séries de 12 repetições

Leg Press
3 séries de 12 repetições

Cadeira extensora
3 séries de 15 repetições

Cadeira flexora
3 séries de 12 repetições

Elevação pélvica
3 séries de 15 repetições

Panturrilha em pé
3 séries de 15 repetições

TREINO 2
Remada sentada
3 séries de 12 repetições

Puxada aberta
3 séries de 12 repetições

Supino com halter
3 séries de 12 repetições

Desenvolvimento com halter
3 séries de 12 repetições

Bíceps com halter
3 séries de 12 repetições

Tríceps na polia
3 séries de 12 repetições

TREINO 3
Agachamento sumô
3 séries de 12 repetições

Afundo
3 séries de 10 repetições cada perna

Mesa flexora
3 séries de 12 repetições

Cadeira abdutora
3 séries de 15 repetições

Abdominal supra
3 séries de 20 repetições

Prancha abdominal
3 séries de 45 segundos`;

const intermediarioText = `SOBRE O TREINO
Essa planilha foi estruturada com 5 treinos semanais para alunos que já possuem uma base e buscam evolução constante.

TREINO 1
Leg press 45
4 séries x 12 repetições

Cadeira extensora
3 séries x 15 repetições

Agachamento livre
4 séries x 10 repetições

Afundo com halter
3 séries x 12 repetições cada perna

Panturrilha em pé
4 séries x 15 repetições

TREINO 2
Puxada aberta no pulley
4 séries x 12 repetições

Remada baixa com triângulo
3 séries x 12 repetições

Crucifixo inverso com halteres
3 séries x 12 repetições

Rosca direta com barra W
3 séries x 12 repetições

Rosca martelo com halteres
3 séries x 12 repetições

TREINO 3
Stiff com barra ou halter
4 séries x 12 repetições

Mesa flexora
3 séries x 12 repetições

Elevação pélvica
4 séries x 12 repetições

Cadeira abdutora
3 séries x 15 repetições

Panturrilha sentada
4 séries x 15 repetições

Prancha abdominal
3 séries x 45 segundos

TREINO 4
Desenvolvimento com halteres
4 séries x 10 repetições

Elevação lateral
3 séries x 12 repetições

Elevação frontal
3 séries x 12 repetições

Tríceps corda
3 séries x 12 repetições

Tríceps banco
3 séries x 10 repetições

TREINO 5
Elevação pélvica
4 séries x 10 repetições

Afundo búlgaro
3 séries x 10 repetições cada perna

Cadeira abdutora
3 séries x 15 repetições

Stiff leve
3 séries x 12 repetições

Prancha lateral
3 séries x 20 segundos cada lado`;

async function normalizeMaterials() {
  console.log("Starting normalization of training materials...");

  // Update Iniciante
  const { error: error1 } = await supabase
    .from('challenge_lessons')
    .update({ description: inicianteText })
    .ilike('title', '%Treino Iniciantes%');

  if (error1) console.error("Error updating Treino Iniciantes:", error1);
  else console.log("✓ Treino Iniciantes normalized successfully.");

  // Update Intermediário
  const { error: error2 } = await supabase
    .from('challenge_lessons')
    .update({ description: intermediarioText })
    .ilike('title', '%Treino Intermediário%');

  if (error2) console.error("Error updating Treino Intermediário:", error2);
  else console.log("✓ Treino Intermediário normalized successfully.");

  console.log("Normalization finished.");
}

normalizeMaterials();
