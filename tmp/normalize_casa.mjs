
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iimkmfhgjupjvrsseqro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWttZmhnanVwanVyc3NlcXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA3NjAsImV4cCI6MjA5MDEwNjc2MH0.HjQTu3ObUSOsZgeUquWbrL4slWSxfpksiNSsyoDoOQQ';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const casaText = `ORIENTAÇÕES GERAIS
Utilize potes de produtos de limpeza com água ou areia como carga.
Ajuste o peso de acordo com sua capacidade, mantendo boa execução.
Respeite os tempos de descanso indicados.

TREINO 1 – MEMBROS INFERIORES

Agachamento
5 séries
12 repetições lentas (3s descida/3s subida)
12 repetições diretas

Afundo com Base Parada + Afundo com Chute
4 séries
10 repetições de base parada
10 repetições com chute
Descanso: 1 minuto e 30 segundos
Após o descanso, troque a perna

Avanço com Peso à Frente do Corpo
4 séries de 15 repetições
Pernas alternadas (como uma passada)

Agachamento Sumô com Isometria Progressiva (1 a 10 segundos)
4 séries
A cada repetição, aumente a isometria (1s na 1ª até 10s na 10ª)
Após completar as 10 reps com isometria, faça mais 10 reps diretas

TREINO 2 – MEMBROS SUPERIORES

Flexão de Braço (Joelhos Apoiados em uma Toalha)
8 a 10 repetições
Descanso: 1 minuto e 30 segundos

Desenvolvimento com Peso
4 séries de 20 repetições

Remada com Peso + Crucifixo Inverso
3 séries
20 repetições de remada
20 repetições de crucifixo inverso

Burpee + Abdominal + Flexão com Joelhos Apoiados
Total: 4 séries
Faça 10 repetições de cada sem descanso
Ao finalizar o bloco, descanse 2 minutos

Triset + Cardio
3 séries de:
12 reps crucifixo
12 reps supino fechado reto
12 reps tríceps coice
Em seguida: 1 minuto de cardio (burpee ou similar)

TREINO 3 – POSTERIOR E GLÚTEOS

Sequência Unilateral – Elevação Pélvica
3 séries (cada perna)
15 repetições de elevação pélvica unilateral
15 segundos de isometria no topo

Flexão de Joelho + Stiff
3 séries de:
30 segundos de flexão de joelho com meia
12 repetições de stiff com halter (descida em 4s)

Sequência de Agachamentos + Retrocesso
4 séries de:
5 reps agachamento lento (5s/5s)
10 reps agachamento com insistência
12 reps retrocesso no step com halter
Fazer perna direita depois esquerda

Stiff + Good Morning
4 séries de:
10 reps stiff (desce 3/segura 1/sobe direto)
10 reps good morning com barra ou vassoura

TREINO 4 – GLÚTEOS + CARDIO

Agachamento Sumô no Step + Afundo
4 séries de:
12 reps sumô no step (desce em 3s)
Perna direita: 10 reps afundo halter (desce em 2s) + 10 reps afundo contralateral
Repetir para perna esquerda

Goblet + Búlgaro + Agachamento
3 séries de:
10 reps goblet joelho semi-flexionado
10 reps por perna búlgaro insistido com saltinho
10 reps agachamento com insistência
Descanso: 1 minuto

Finalizador
4 séries de:
1 minuto de burpee
20 agachamentos
15 retrocessos
Descanso: 2 minutos`;

async function normalizeCasa() {
  console.log("Normalizing 'Treino em casa' from PDF data...");

  const { error } = await supabase
    .from('challenge_lessons')
    .update({ description: casaText })
    .ilike('title', '%Treino em casa%');

  if (error) console.error("Error updating Treino em casa:", error);
  else console.log("✓ 'Treino em casa' updated successfully.");
}

normalizeCasa();
