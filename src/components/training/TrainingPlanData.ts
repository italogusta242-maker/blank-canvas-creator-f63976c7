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

/** All available training plans, ordered for display */
export const ALL_TRAININGS: TrainingPlanConfig[] = [
  TRAINING_INICIANTES_ACADEMIA,
];
