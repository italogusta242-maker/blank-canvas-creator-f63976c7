/**
 * Progressive Daily Goals Matrix
 * 
 * Goals are now fully dynamic based on the user's planner choice:
 * A) Foco Essencial
 * B) Constância
 * C) Elite
 * 
 * And divided by phases (D1-7, D8-14, D15-21)
 */

export type GoalKey = 
  | "treino" 
  | "agua" 
  | "sono" 
  | "cardio" 
  | "dieta_cafe" 
  | "dieta_almoco" 
  | "dieta_jantar" 
  | "nao_beliscar" 
  | "autocuidado"
  | "sem_preguica"
  | "sem_celular"
  | "sem_acucar"
  | "dieta_completa";

export interface GoalDefinition {
  key: GoalKey;
  label: string;
  emoji: string;
  description: string;
}

export type PlannerType = "foco_essencial" | "constancia" | "elite";
export type Phase = 1 | 2 | 3;

export interface PlannerPhaseConfig {
  waterGoal: number; // in Liters
  sleepGoal: number; // in Hours
  goals: GoalDefinition[];
}

const PLANNER_MATRIX: Record<PlannerType, Record<Phase, PlannerPhaseConfig>> = {
  foco_essencial: {
    1: {
      waterGoal: 1.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Mínimo 1,5L por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 2x na semana (30 a 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 1 na semana" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "nao_beliscar", label: "Foco", emoji: "🤐", description: "Não beliscar entre refeições" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    },
    2: {
      waterGoal: 2.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "2 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 3x na semana (mín 30 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 2x na semana" },
        { key: "sem_preguica", label: "Disciplina", emoji: "🔥", description: "Não faltar treino por preguiça" },
        { key: "sem_celular", label: "Sono Limpo", emoji: "📱", description: "Evitar celular antes de dormir" },
        { key: "dieta_cafe", label: "Café/Almoço", emoji: "🥗", description: "Seguir dieta no CM e almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    },
    3: {
      waterGoal: 2.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "2,5 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 3x na semana (mín 35 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 2x na semana" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    }
  },
  constancia: {
    1: {
      waterGoal: 2.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "2 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 3x na semana (mín 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 2x na semana (mín 20 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "nao_beliscar", label: "Foco", emoji: "🤐", description: "Não beliscar entre refeições" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    },
    2: {
      waterGoal: 2.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "2,5 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 3x na semana (mín 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 2x na semana (mín 25 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    },
    3: {
      waterGoal: 3.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "3 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "Mínimo 4x na semana (mín 30 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "Mínimo 2x na semana" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    }
  },
  elite: {
    1: {
      waterGoal: 2.5,
      sleepGoal: 6,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "2,5 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5x na semana (mín 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana (mín 25 min)" },
        { key: "dieta_completa", label: "Dieta Rigorosa", emoji: "🥗", description: "Seguir dieta no CM, almoço e jantar" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre refeições" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "sono", label: "Sono", emoji: "🌙", description: "Dormir no mínimo 6h" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para você" },
      ]
    },
    2: {
      waterGoal: 3.0,
      sleepGoal: 6, // implied
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "3 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5x na semana (mín 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios (mín 25-30 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre refeições" },
        { key: "sem_acucar", label: "Hardcore", emoji: "🚫", description: "Zero açúcar mínimo na semana" },
      ]
    },
    3: {
      waterGoal: 3.0,
      sleepGoal: 6, // implied
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "3 litros por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5x na semana (mín 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "3 cardios (mín 30 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir a dieta" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir a dieta" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir a dieta" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre refeições" },
        { key: "sem_acucar", label: "Hardcore", emoji: "🚫", description: "ZERO açúcar" },
      ]
    }
  }
};

export function getPhase(daysElapsed: number): Phase {
  if (daysElapsed <= 7) return 1;
  if (daysElapsed <= 14) return 2;
  return 3;
}

export function getPhaseLabel(phase: Phase): string {
  switch (phase) {
    case 1: return "Fase 1 (Dias 1-7)";
    case 2: return "Fase 2 (Dias 8-14)";
    case 3: return "Fase 3 (Dias 15-21)";
  }
}

export function getGoalsForUser(plannerType: string | undefined, daysElapsed: number): PlannerPhaseConfig {
  const type = (plannerType || "foco_essencial") as PlannerType;
  const validType = PLANNER_MATRIX[type] ? type : "foco_essencial";
  const phase = getPhase(daysElapsed);
  
  return PLANNER_MATRIX[validType][phase];
}
