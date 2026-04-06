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

export type PlannerType = "essencial" | "constancia" | "elite";
export type Phase = 1 | 2 | 3;

export interface PlannerPhaseConfig {
  waterGoal: number; // in Liters
  sleepGoal: number; // in Hours
  goals: GoalDefinition[];
}

const PLANNER_MATRIX: Record<PlannerType, Record<Phase, PlannerPhaseConfig>> = {
  essencial: {
    1: {
      waterGoal: 1.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber MIN 1,5 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "2 treinos MIN na semana (30 a 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "1 cardio na semana (mínimo)" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para autocuidado" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "nao_beliscar", label: "Foco", emoji: "🤐", description: "Não beliscar entre refeições" },
      ]
    },
    2: {
      waterGoal: 2.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 2 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "3 treinos na semana (mínimo 30 min)" },
        { key: "sem_preguica", label: "Motivação", emoji: "🔥", description: "Não faltar treino por preguiça" },
        { key: "sem_celular", label: "Higiene do Sono", emoji: "📱", description: "Evitar celular antes de dormir" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana (mínimo)" },
        { key: "dieta_almoco", label: "CM e Almoço", emoji: "🥗", description: "Seguir dieta no CM e almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Separar 15 minutos para você" },
      ]
    },
    3: {
      waterGoal: 2.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 2,5 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "3 treinos na semana (mínimo 35 min)" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana (mínimo)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Separar 15 minutos para você" },
      ]
    }
  },
  constancia: {
    1: {
      waterGoal: 2.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 2 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "3 treinos na semana (mínimo 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana (mínimo 20 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para autocuidado" },
        { key: "nao_beliscar", label: "Foco", emoji: "🤐", description: "Não beliscar entre refeições" },
      ]
    },
    2: {
      waterGoal: 2.5,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 2,5 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "3 treinos na semana (mínimo 40 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana (mínimo 25 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para autocuidado" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
      ]
    },
    3: {
      waterGoal: 3.0,
      sleepGoal: 8,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 3 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "4 treinos na semana (mínimo 30 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios na semana" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para autocuidado" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
      ]
    }
  },
  elite: {
    1: {
      waterGoal: 2.5,
      sleepGoal: 6,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 2,5 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5 treinos na semana (mínimo 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios (mínimo 25 min)" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre as refeicoes" },
        { key: "dieta_completa", label: "Dieta Elite", emoji: "🥗", description: "Seguir dieta no café, almoço e jantar" },
        { key: "sem_acucar", label: "Limpeza", emoji: "🚫", description: "Evitar açúcar" },
        { key: "sono", label: "Sono", emoji: "🌙", description: "Dormir mínimo 6h" },
        { key: "autocuidado", label: "Autocuidado", emoji: "🧘", description: "Tirar 15 minutos para autocuidado" },
      ]
    },
    2: {
      waterGoal: 3.0,
      sleepGoal: 6,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 3 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5 treinos na semana (mínimo 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "2 cardios (mínimo 25-30 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre as refeições" },
        { key: "sem_acucar", label: "Hardcore", emoji: "🚫", description: "Zero açúcar MIN na semana" },
      ]
    },
    3: {
      waterGoal: 3.0,
      sleepGoal: 6,
      goals: [
        { key: "agua", label: "Água", emoji: "💧", description: "Beber 3 litros de água por dia" },
        { key: "treino", label: "Treinamento", emoji: "🏋️", description: "5 treinos na semana (mínimo 45 min)" },
        { key: "cardio", label: "Cardio", emoji: "🏃‍♀️", description: "3 cardios (mínimo 30 min)" },
        { key: "dieta_cafe", label: "Café da Manhã", emoji: "🍳", description: "Seguir dieta no café da manhã" },
        { key: "dieta_almoco", label: "Almoço", emoji: "🥗", description: "Seguir dieta no almoço" },
        { key: "dieta_jantar", label: "Jantar", emoji: "🍲", description: "Seguir dieta no jantar" },
        { key: "nao_beliscar", label: "Foco Extremo", emoji: "🤐", description: "Não beliscar entre as refeições" },
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
    case 1: return "Semana 1 (Dias 1-7)";
    case 2: return "Semana 2 (Dias 8-14)";
    case 3: return "Semana 3 (Dias 15-21)";
  }
}

export function getGoalsForUser(plannerType: string | undefined, daysElapsed: number): PlannerPhaseConfig {
  let mappedType = (plannerType || "essencial").toLowerCase();
  
  // Mapping of common display names to internal keys
  if (mappedType.includes("iniciante")) mappedType = "essencial";
  if (mappedType.includes("intermediário") || mappedType.includes("intermediário")) mappedType = "constancia";
  if (mappedType.includes("avançado") || mappedType.includes("elite")) mappedType = "elite";
  
  const type = mappedType as PlannerType;
  const validType = PLANNER_MATRIX[type] ? type : "essencial";
  const phase = getPhase(daysElapsed);
  
  return PLANNER_MATRIX[validType][phase];
}
