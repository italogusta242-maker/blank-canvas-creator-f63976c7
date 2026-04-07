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

/** All available training plans, ordered for display */
export const ALL_TRAININGS: TrainingPlanConfig[] = [
  TRAINING_INICIANTES_ACADEMIA,
  TRAINING_INTERMEDIARIO_ACADEMIA,
];
