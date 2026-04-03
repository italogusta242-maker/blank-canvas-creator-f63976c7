export interface MotivationalMessage {
  condition: "extinguindo" | "normal" | "fogo_alto" | "ameaca";
  emoji: string;
  title: string;
  message: string;
}

export const MESSAGES: MotivationalMessage[] = [
  {
    condition: "ameaca",
    emoji: "🥺",
    title: "Sua ofensiva vai morrer!",
    message: "Faltam poucas horas para o dia acabar. Você vai mesmo jogar todos esses dias de esforço no lixo? O mascote está chorando...",
  },
  {
    condition: "ameaca",
    emoji: "⚠️",
    title: "Atenção: Risco Extremo",
    message: "Se você não completar suas tarefas hoje, sua chama voltará para ZERO. Levanta e faz o que tem que ser feito!",
  },
  {
    condition: "extinguindo",
    emoji: "🧊",
    title: "Chama Extinta...",
    message: "Você não cumpriu suas metas e seu streak foi zerado. O fracasso faz parte, mas recomeçar é uma obrigação. Volte amanhã mais forte.",
  },
  {
    condition: "normal",
    emoji: "🔥",
    title: "Mantendo a Chama",
    message: "Sua chama está viva, mas pode crescer mais. Continue marcando seus treinos para alcançar a próxima recompensa.",
  },
  {
    condition: "fogo_alto",
    emoji: "🌋",
    title: "Disciplina Implacável",
    message: "Ninguém consegue te parar! Você está construindo uma mentalidade de elite. Mantenha o ritmo monstruoso.",
  }
];

export function getMessageForState(state: MotivationalMessage["condition"]): MotivationalMessage {
  const matches = MESSAGES.filter(m => m.condition === state);
  if (matches.length === 0) return MESSAGES.find(m => m.condition === "normal")!;
  return matches[Math.floor(Math.random() * matches.length)];
}

// ── Coach notification message pools ──

export const COACH_WATCHING_START = [
  "Igor está acompanhando seu treino em tempo real! 💪",
  "O treinador acabou de abrir seu perfil. Ele está de olho! 👀",
  "Igor viu que você começou o treino. Manda ver!",
];

export const NUTRI_WATCHING_DIET = [
  "A nutricionista viu que você completou toda a dieta hoje! 🥗",
  "Parabéns! Sua nutri ficou orgulhosa do seu compromisso!",
];

export const NUTRI_WATCHING_HALF = [
  "Metade das refeições feitas! A nutri está acompanhando 👀",
  "Bom progresso na dieta! Continue assim.",
];

export const POST_WORKOUT_SHARE = [
  "Você moveu {{volume}}kg hoje! Compartilhe essa conquista! 🏆",
  "Treino finalizado com {{volume}}kg de volume total! Insano! 🔥",
];

export function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function fillTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, String(value));
  }
  return result;
}

export function shouldTrigger(probability: number): boolean {
  return Math.random() < probability;
}
