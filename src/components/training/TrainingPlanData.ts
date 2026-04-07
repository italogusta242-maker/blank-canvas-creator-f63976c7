/**
 * @purpose Config-driven training plans (hardcoded), same pattern as DietPlanData.ts.
 * Each plan becomes a "lesson" inside the workouts module on the Desafio page.
 */

export interface TrainingExerciseConfig {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface TrainingWorkoutConfig {
  name: string;
  exercises: TrainingExerciseConfig[];
}

export interface TrainingPlanConfig {
  id: string;
  title: string;
  emoji: string;
  level: string;
  frequency: string;
  description: string;
  about: string;
  workouts: TrainingWorkoutConfig[];
}

export const TRAINING_INICIANTES_ACADEMIA: TrainingPlanConfig = {
  id: "config-training-iniciantes-academia",
  title: "Treino Iniciantes (Academia)",
  emoji: "🏋️",
  level: "Iniciante",
  frequency: "3x na semana",
  description: "Foco em criar o hábito, fortalecer o corpo e evoluir aos poucos.",
  about: `Essa planilha foi criada especialmente para iniciantes, com treinos simples, eficientes e fáceis de seguir, pensados para te ajudar a criar o hábito de treinar, fortalecer o corpo e evoluir aos poucos, sem sobrecarga.

Aqui você encontrará 3 treinos por semana, organizados para trabalhar diferentes grupos musculares e permitir que seu corpo se recupere entre as sessões.

Lembre-se:
• Comece com cargas leves
• Foque na execução correta dos exercícios
• Respeite seus limites
• E principalmente: não desista nos primeiros dias

Resultados não vêm de um treino perfeito, mas sim da soma de vários treinos feitos com constância.

Agora é hora de colocar o plano em prática e dar o primeiro passo para uma versão mais forte e disciplinada de você.`,
  workouts: [
    {
      name: "Treino A — Pernas e Glúteos",
      exercises: [
        { name: "Agachamento livre", sets: 3, reps: "10 a 12" },
        { name: "Leg Press", sets: 3, reps: "10 a 12" },
        { name: "Cadeira extensora", sets: 3, reps: "12" },
        { name: "Elevação pélvica (glúteo)", sets: 3, reps: "12" },
        { name: "Panturrilha em pé ou no leg press", sets: 3, reps: "12 a 15" },
        { name: "Abdominal simples", sets: 3, reps: "15" },
      ],
    },
    {
      name: "Treino B — Parte Superior",
      exercises: [
        { name: "Puxada na frente (costas)", sets: 3, reps: "10 a 12" },
        { name: "Remada baixa ou máquina", sets: 3, reps: "10 a 12" },
        { name: "Supino máquina ou halter", sets: 3, reps: "10 a 12" },
        { name: "Elevação lateral (ombro)", sets: 3, reps: "12" },
        { name: "Tríceps corda", sets: 3, reps: "12" },
        { name: "Rosca direta (bíceps)", sets: 3, reps: "12" },
      ],
    },
    {
      name: "Treino C — Pernas e Core",
      exercises: [
        { name: "Afundo (lunge)", sets: 3, reps: "10 (cada perna)" },
        { name: "Mesa flexora", sets: 3, reps: "12" },
        { name: "Cadeira abdutora (glúteo)", sets: 3, reps: "12 a 15" },
        { name: "Stiff com halter ou barra", sets: 3, reps: "10 a 12" },
        { name: "Panturrilha sentada", sets: 3, reps: "12 a 15" },
        { name: "Prancha abdominal", sets: 3, reps: "20 a 30 segundos" },
      ],
    },
  ],
};

export const TRAINING_INTERMEDIARIO_ACADEMIA: TrainingPlanConfig = {
  id: "config-training-intermediario-academia",
  title: "Treino Intermediário (Academia)",
  emoji: "💪",
  level: "Intermediário",
  frequency: "5x na semana",
  description: "Foco em ganhar mais força, melhorar o condicionamento e desenvolver seu corpo de forma mais completa.",
  about: `Essa é a planilha de treinos para quem está no nível intermediário.

Não é mais apenas criar o hábito de treinar, mas evoluir de verdade: ganhar mais força, melhorar o condicionamento e desenvolver seu corpo de forma mais completa.
Essa planilha foi estruturada com 5 treinos semanais, aumentando o volume de treino e trabalhando os grupos musculares com mais frequência. Isso permite um estímulo maior para evolução, mas ainda respeitando o descanso necessário para recuperação.

Lembre-se:
• Foque na execução correta
• Tente evoluir as cargas aos poucos
• Respeite os dias de descanso
• A consistência continua sendo o fator mais importante`,
  workouts: [
    {
      name: "Treino A — Quadríceps e Glúteos",
      exercises: [
        { name: "Agachamento livre", sets: 4, reps: "8 a 10" },
        { name: "Leg press", sets: 4, reps: "10 a 12" },
        { name: "Cadeira extensora", sets: 3, reps: "12" },
        { name: "Afundo com halter", sets: 3, reps: "10 (cada perna)" },
        { name: "Panturrilha em pé ou no leg press", sets: 4, reps: "12 a 15" },
      ],
    },
    {
      name: "Treino B — Costas e Bíceps",
      exercises: [
        { name: "Puxada na frente", sets: 4, reps: "10" },
        { name: "Remada baixa", sets: 4, reps: "10" },
        { name: "Remada unilateral com halter", sets: 3, reps: "10" },
        { name: "Face pull", sets: 3, reps: "12" },
        { name: "Rosca direta", sets: 3, reps: "12" },
        { name: "Rosca martelo", sets: 3, reps: "12" },
      ],
    },
    {
      name: "Treino C — Posterior de Coxa e Glúteos",
      exercises: [
        { name: "Stiff com barra ou halter", sets: 4, reps: "10" },
        { name: "Mesa flexora", sets: 4, reps: "12" },
        { name: "Elevação pélvica", sets: 4, reps: "10" },
        { name: "Cadeira abdutora", sets: 3, reps: "15" },
        { name: "Panturrilha sentada", sets: 3, reps: "12 a 15" },
        { name: "Prancha abdominal", sets: 3, reps: "30 segundos" },
      ],
    },
    {
      name: "Treino D — Ombros e Tríceps",
      exercises: [
        { name: "Desenvolvimento com halter", sets: 4, reps: "10" },
        { name: "Elevação lateral", sets: 3, reps: "12" },
        { name: "Elevação frontal", sets: 3, reps: "12" },
        { name: "Tríceps corda", sets: 3, reps: "12" },
        { name: "Tríceps banco", sets: 3, reps: "10" },
      ],
    },
    {
      name: "Treino E — Glúteos e Core",
      exercises: [
        { name: "Elevação pélvica", sets: 4, reps: "10" },
        { name: "Afundo búlgaro", sets: 3, reps: "10 (cada perna)" },
        { name: "Cadeira abdutora", sets: 3, reps: "15" },
        { name: "Stiff leve", sets: 3, reps: "12" },
        { name: "Prancha lateral", sets: 3, reps: "20 segundos (cada lado)" },
        { name: "Abdominal bicicleta", sets: 3, reps: "15" },
      ],
    },
  ],
};

export const TRAINING_AVANCADO_ACADEMIA: TrainingPlanConfig = {
  id: "config-training-avancado-academia",
  title: "Treino Avançado (Academia)",
  emoji: "🔥",
  level: "Avançado",
  frequency: "5x na semana",
  description: "Planejamento com os melhores métodos para uma evolução sólida no seu físico.",
  about: `Oii, meninas!

Sou Karol Dias, personal trainer. Preparei o planejamento de treino para vocês com os melhores métodos para que alcancem realmente uma evolução sólida no seu físico. O treino pode ser seguido tanto por alunas iniciantes quanto alunas intermediárias. Então se você é iniciante faça com carga leves e moderadas aproveitando a oportunidade para aprimorar seu movimento.

Para alunas que já praticam musculação dediquem-se ao máximo a cada treino que eu tenho certeza que seu resultado será extraordinário.

Mas lembre-se que o treino não substitui um acompanhamento individualizado que cuida de cada limitação e rotina de vocês.`,
  workouts: [
    {
      name: "Segunda — Quadríceps",
      exercises: [
        { name: "Cadeira extensora", sets: 4, reps: "variado", notes: "1ª série: 15 rep com 2s de isometria em cima. 2ª série: 15 diretas, aumento de carga. 3ª série: 12 rep, suba um bloco de carga. 4ª série (clusterset) 5-5-5-5: carga muito alta, pausa de 20s a cada 5 rep, depois sem descanso reduza muito a carga e faça 20 rep rápidas." },
        { name: "Leg press unilateral", sets: 4, reps: "10", notes: "Use carga leve. Descanso 1:00min. 4 séries de 10 repetições no leg press unilateral." },
        { name: "Afundo no smith", sets: 3, reps: "variado", notes: "1ª série: 14 rep. 2ª série: 14 rep segurando 2s embaixo, mantenha carga na 1ª série. 3ª série: 10 rep diretas com carga alta. Reduza carga para metade e faça 20 rep com peso do corpo." },
        { name: "Agachamento", sets: 5, reps: "14" },
        { name: "Passada", sets: 4, reps: "10", notes: "4 séries de 10 rep com peso nas duas mãos + 10 somente peso do corpo." },
      ],
    },
    {
      name: "Terça — Ombro + Peito + Tríceps",
      exercises: [
        { name: "Aquecimento", sets: 2, reps: "10", notes: "Realize duas séries de 10 rep de cada exercício sem descanso. Use carga leve (3 quilos halteres sugestão): desenvolvimento, elevação lateral, elevação frontal." },
        { name: "Elevação lateral sentada", sets: 4, reps: "variado", notes: "1ª série: 15 rep com 1s de isometria em cima (carga média) sentada. 2ª série: 10 rep (carga pesada) sentada. 3ª e 4ª série: 8 rep (carga próximo da falha) descanse 40s e fique em pé, com carga mais leve realize 15 rep de elevação lateral em pé. O movimento em pé só será executado na 3ª e 4ª série." },
        { name: "Remada alta", sets: 2, reps: "variado", notes: "1ª série: 12 rep carga leve, barra de 10 quilos. 2ª série: 10 com barra de 12,5 ou de 15 quilos + reduza carga da barra e realize mais 12." },
        { name: "Desenvolvimento com halteres + barra", sets: 2, reps: "variado", notes: "1ª série: 12 rep de desenvolvimento com barra / 10 quilos + 10 com halteres (carga alta). 2ª série: Aumenta carga da barra e realize 6 rep, descanse 15s, faça mais 5, descanse 15s e faça mais 4 rep. Pegue os halteres leve e faça mais 15 rep." },
        { name: "Crucifixo inverso", sets: 3, reps: "variado", notes: "1ª: 10 rep segurando 2s atrás. 2ª e 3ª: 8 rep segurando 2s atrás + 10 diretas." },
        { name: "Supino inclinado + tríceps testa com barra W", sets: 3, reps: "variado", notes: "Caso tenha dificuldade do tríceps testa pode substituir para tríceps na polia. 1ª e 2ª série: 10 rep de supino + 12 rep de tríceps testa. 3ª série: 10 rep de supino (carga mais alta) + 20 rep de tríceps testa." },
      ],
    },
    {
      name: "Quarta — Glúteos",
      exercises: [
        { name: "Elevação Pélvica no Solo (Pré-ativação)", sets: 2, reps: "25", notes: "Utilize um step para apoio dos pés. Peso do copo ou caneleira no quadril." },
        { name: "Búlgaro Livre", sets: 3, reps: "variado", notes: "1ª série: 12 rep. 2ª série: 12 rep com 2s embaixo (mesma carga). 3ª série: 10 rep diretas (carga alta). Reduza a carga pela metade e faça 15 rep." },
        { name: "Extensão de Quadril na Polia (com banco)", sets: 3, reps: "15", notes: "Segure 3 segundos na contração. Ao chegar na 9ª repetição, continue sem segurar." },
        { name: "Cadeira Abdutora", sets: 4, reps: "12 / 10 / 8", notes: "4 séries de 12 / 10 / 8 repetições, aumentando a carga." },
      ],
    },
    {
      name: "Quinta — Costas + Bíceps",
      exercises: [
        { name: "Remada Curvada – Pegada Supinada", sets: 3, reps: "15 / 12 / 10", notes: "Aumente a carga a cada série." },
        { name: "Puxada com Corda no Cross + Pulldown com Corda", sets: 2, reps: "variado", notes: "1ª série: 15 rep na puxada com 2s de contração escapular + 12 rep de pulldown. 2ª série: 10 rep na puxada (aumente 3 blocos). Pulldown 6-6-6 (Cluster Set): pausa de 20s entre cada bloco. Carga mais desafiadora." },
        { name: "Remada Serrote", sets: 2, reps: "12" },
        { name: "Remada com Triângulo", sets: 3, reps: "variado", notes: "1ª série: 12 rep. 2ª série: 10 rep (aumente 3 blocos). 3ª série: 9 rep (aumente 1 bloco). Reduza 5 blocos e faça 30 rep." },
        { name: "Puxada no Pulley", sets: 3, reps: "12" },
        { name: "Bíceps na Polia com Barra W", sets: 3, reps: "10", notes: "Utilize carga mais pesada." },
      ],
    },
    {
      name: "Sexta — Posterior de Coxa",
      exercises: [
        { name: "Extensão de Joelho na Bola + Cadeira Flexora", sets: 4, reps: "variado", notes: "12 rep na cadeira flexora. Bata o peso em todas as rep. Saia sempre da inércia. 15 rep de flexão de joelho na bola." },
        { name: "Mesa Flexora", sets: 3, reps: "variado", notes: "1ª série: 15 rep com 2s em cima. 2ª série: 10 rep com 1s embaixo (1 bloco a mais). 3ª série: 10 rep diretas (carga alta). Reduza pela metade e faça 10 rep descendo em 3 segundos." },
        { name: "Agachamento Terra", sets: 4, reps: "15", notes: "Carga leve a média. Se necessário, utilize step nas anilhas. Amplitude final: meio da canela ou próximo ao joelho." },
        { name: "Stiff", sets: 3, reps: "10" },
        { name: "Cadeira Adutora", sets: 4, reps: "12" },
      ],
    },
  ],
};

export const TRAINING_CASA: TrainingPlanConfig = {
  id: "config-training-casa",
  title: "Treino em Casa",
  emoji: "🏠",
  level: "Todos os níveis",
  frequency: "4x na semana",
  description: "Treino funcional para fazer em casa com materiais simples.",
  about: `Orientações Gerais:

• Utilize potes de produtos de limpeza com água ou areia como carga.
• Ajuste o peso de acordo com sua capacidade, mantendo boa execução.
• Respeite os tempos de descanso indicados.`,
  workouts: [
    {
      name: "Treino 1 — Membros Inferiores",
      exercises: [
        { name: "Agachamento", sets: 5, reps: "12", notes: "12 repetições descendo em 3 segundos e subindo em 3 segundos + 12 repetições diretas." },
        { name: "Afundo com Base Parada + Afundo com Chute", sets: 4, reps: "10 + 10", notes: "10 rep de afundo com base parada. Com a mesma perna, faça mais 10 rep de afundo com chute. Descanso: 1 minuto e 30 segundos. Após o descanso, troque a perna." },
        { name: "Avanço com Peso à Frente do Corpo", sets: 4, reps: "15", notes: "Pernas alternadas (como uma passada)." },
        { name: "Agachamento Sumô com Isometria Progressiva", sets: 4, reps: "10 + 10", notes: "A cada repetição, aumente o tempo de isometria no fundo do movimento: 1ª rep: 1s, 2ª rep: 2s, ... 10ª rep: 10s. Após completar as 10 rep com isometria, faça mais 10 rep diretas." },
      ],
    },
    {
      name: "Treino 2 — Membros Superiores",
      exercises: [
        { name: "Flexão de Braço (Joelhos Apoiados em uma Toalha)", sets: 3, reps: "8 a 10", notes: "Descanso: 1 minuto e 30 segundos." },
        { name: "Desenvolvimento com Peso", sets: 4, reps: "20" },
        { name: "Remada com Peso + Crucifixo Inverso", sets: 3, reps: "20 + 20", notes: "20 rep de remada + 20 rep de crucifixo inverso." },
        { name: "Burpee + Abdominal + Flexão com Joelhos Apoiados", sets: 4, reps: "10 cada", notes: "Faça 10 rep de cada exercício, sem descanso entre eles. Ao finalizar os 3 movimentos, descanse 2 minutos." },
        { name: "Triset + Cardio", sets: 3, reps: "12 + 12 + 12 + 1min", notes: "12 rep de crucifixo + 12 rep de supino fechado reto + 12 rep de tríceps coice. Em seguida: 1 minuto de cardio (burpee saltando fora e dentro do step ou outro objetivo similar)." },
      ],
    },
    {
      name: "Treino 3 — Posterior e Glúteos",
      exercises: [
        { name: "Sequência Unilateral – Elevação Pélvica", sets: 3, reps: "15 (cada perna)", notes: "15 rep de elevação pélvica unilateral + 15 segundos de isometria no topo." },
        { name: "Flexão de Joelho + Stiff", sets: 3, reps: "30s + 12", notes: "30 segundos de flexão de joelho com meia + 12 rep de stiff com halter (descendo em 4 segundos)." },
        { name: "Sequência de Agachamentos + Retrocesso", sets: 4, reps: "variado", notes: "5 rep de agachamento (desce em 5 / sobe em 5) + 10 rep de agachamento com insistência + 12 rep de retrocesso no step com halter nos ombros. Perna direita, depois perna esquerda." },
        { name: "Stiff + Good Morning", sets: 4, reps: "10 + 10", notes: "10 rep de stiff com halteres (desce em 3 / segura 1 / sobe direto) + 10 rep de good morning com barra nas costas ou cabo de vassoura." },
      ],
    },
    {
      name: "Treino 4 — Glúteos + Cardio",
      exercises: [
        { name: "Agachamento Sumô no Step + Afundos", sets: 4, reps: "12 + 10 + 10", notes: "12 rep de agachamento sumô com pés sobre o step (desce em 3). Perna direita: 10 rep de afundo com halteres (desce em 2) + 10 rep de afundo contralateral. Solte o peso de uma das mãos para o afundo contralateral." },
        { name: "Goblet + Búlgaro + Agachamento", sets: 3, reps: "10 + 10 + 10", notes: "10 rep de goblet com joelho semi-flexionado + 10 rep por perna de búlgaro insistido com saltinho curto (sem carga) + 10 rep de agachamento com insistência. Descanso: 1 minuto." },
        { name: "Finalizador", sets: 4, reps: "variado", notes: "1 minuto de burpee + 20 agachamentos + 15 retrocessos. Descanso: 2 minutos." },
      ],
    },
  ],
};

/** All available training plans, ordered for display */
export const ALL_TRAININGS: TrainingPlanConfig[] = [
  TRAINING_INICIANTES_ACADEMIA,
  TRAINING_INTERMEDIARIO_ACADEMIA,
  TRAINING_AVANCADO_ACADEMIA,
  TRAINING_CASA,
];
