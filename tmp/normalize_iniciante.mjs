import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const inicianteText = `SOBRE O TREINO
Essa planilha foi criada especialmente para iniciantes, com treinos simples, eficientes e fáceis de seguir, pensados para te ajudar a criar o hábito de treinar, fortalecer o corpo e evoluir aos poucos, sem sobrecarga.
Aqui você encontrará 3 treinos por semana, organizados para trabalhar diferentes grupos musculares e permitir que seu corpo se recupere entre as sessões.

Lembre-se:
- Comece com cargas leves
- Foque na execução correta dos exercícios
- Respeite seus limites
- E principalmente: não desista nos primeiros dias
Resultados não vêm de um treino perfeito, mas sim da soma de vários treinos feitos com constância.

Agora é hora de colocar o plano em prática e dar o primeiro passo para uma versão mais forte e disciplinada de você.

__section__

EXPLICANDO A DIVISÃO
Essa planilha foi organizada em 3 treinos diferentes (A, B e C) para que seu corpo seja trabalhado de forma equilibrada ao longo da semana.

Cada treino tem um foco específico, permitindo que você treine diferentes grupos musculares enquanto os outros descansam e se recuperam. Esse descanso é essencial para evitar sobrecarga, reduzir o risco de lesões e ajudar no desenvolvimento de força e resistência.

A divisão funciona assim:
Treino A – Pernas e glúteos
Focado nos músculos da parte inferior do corpo, trabalhando principalmente quadríceps, glúteos e panturrilhas.
Treino B – Parte superior
Voltado para os músculos da parte de cima do corpo, como costas, peito, ombros, bíceps e tríceps.
Treino C – Pernas e core

Essa divisão permite que você treine 3 vezes por semana de forma eficiente, dando tempo para o corpo descansar entre os treinos e evoluir com segurança.
A sugestão é realizar os treinos com um dia de descanso entre eles, por exemplo:
- Segunda: Treino A
- Quarta: Treino B
- Sexta: Treino C

__section__

TREINO A - PERNAS E GLÚTEOS

Agachamento livre
3 séries x 10–12 repetições

Leg Press
3 séries x 10–12 repetições

Cadeira extensora
3 séries x 12 repetições

Elevação pélvica (glúteo)
3 séries x 12 repetições

Panturrilha em pé ou no leg press
3 séries x 12–15 repetições

Abdominal simples
3 séries x 15 repetições

__section__

TREINO B - PARTE SUPERIOR

Puxada na frente (costas)
3 séries x 10–12 repetições

Remada baixa ou máquina
3 séries x 10–12 repetições

Supino máquina ou halter
3 séries x 10–12 repetições

Elevação lateral (ombro)
3 séries x 12 repetições

Tríceps corda
3 séries x 12 repetições

Rosca direta (bíceps)
3 séries x 12 repetições

__section__

TREINO C - PERNAS E CORE

Afundo (lunge)
3 séries x 10 repetições cada perna

Mesa flexora
3 séries x 12 repetições

Cadeira abdutora (glúteo)
3 séries x 12–15 repetições

Stiff com halter ou barra
3 séries x 10–12 repetições

Panturrilha sentada
3 séries x 12–15 repetições

Prancha abdominal
3 séries x 20–30 segundos`;

async function normalizeIniciante() {
  console.log("Normalizing 'Treino Iniciante'...");

  // Let's first check if there is a lesson with "iniciante" in the title
  const { data: lessons, error: checkError } = await supabase
    .from('challenge_lessons')
    .select('id, title')
    .ilike('title', '%iniciante%');

  if (checkError) {
    console.error("Error finding lesson:", checkError);
    return;
  }

  if (lessons && lessons.length > 0) {
    console.log("Found lessons:", lessons.map(l => l.title).join(", "));
    
    for (const l of lessons) {
      const { error } = await supabase
        .from('challenge_lessons')
        .update({ description: inicianteText })
        .eq('id', l.id);

      if (error) console.error("Error updating lesson", l.title, ":", error);
      else console.log(`✓ '${l.title}' updated successfully in challenge_lessons.`);
    }
  } else {
    console.log("No lesson found with 'iniciante' in challenge_lessons, trying training_plans table...");
    
    const { data: plans, error: plansError } = await supabase
      .from('training_plans')
      .select('id, name')
      .ilike('name', '%iniciante%');
      
    if (plansError) {
        console.error("Error finding plan:", plansError);
        return;
    }
    
    if (plans && plans.length > 0) {
        console.log("Found plans:", plans.map(p => p.name).join(", "));
        
        for (const p of plans) {
            const { error } = await supabase
                .from('training_plans')
                .update({ description: inicianteText })
                .eq('id', p.id);
                
            if (error) console.error("Error updating plan", p.name, ":", error);
            else console.log(`✓ '${p.name}' updated successfully in training_plans.`);
        }
    } else {
        console.log("Could not find any 'iniciante' plan in the database.");
    }
  }
}

normalizeIniciante();
