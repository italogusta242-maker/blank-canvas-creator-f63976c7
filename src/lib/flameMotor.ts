export type FlameRewardTier = "bronze" | "silver" | "gold" | "diamond" | "none";

export interface FlameReward {
  days: number;
  tier: FlameRewardTier;
  title: string;
  description: string;
  cashbackEligible: boolean;
}

export const REWARD_MILESTONES: FlameReward[] = [
  { days: 7, tier: "bronze", title: "Faísca Consistente", description: "Você sobreviveu à primeira semana! O hábito está começando a se formar.", cashbackEligible: false },
  { days: 21, tier: "silver", title: "Chama Estabelecida", description: "21 dias! A ciência diz que você formou um hábito. Parabéns por manter o foco.", cashbackEligible: false },
  { days: 63, tier: "gold", title: "Incêndio Incontrolável", description: "63 dias de disciplina impecável. Você desbloqueou recompensas exclusivas e benefícios VIP.", cashbackEligible: true },
  { days: 365, tier: "diamond", title: "Mestre da Forja", description: "Um ano inteiro ardendo em disciplina. Você é uma lenda na comunidade.", cashbackEligible: true },
];

export function getUnlockedRewards(currentStreak: number): FlameReward[] {
  return REWARD_MILESTONES.filter(reward => currentStreak >= reward.days);
}

export function getNextReward(currentStreak: number): FlameReward | null {
  return REWARD_MILESTONES.find(reward => currentStreak < reward.days) || null;
}

export function calculateFlameIntensity(streak: number): number {
  if (streak === 0) return 0;
  if (streak < 7) return 30;
  if (streak < 21) return 60;
  if (streak < 63) return 90;
  return 100;
}

/** Stub: check and update flame status after habit changes */
export async function checkAndUpdateFlame(_userId: string): Promise<void> {
  // Flame state is managed optimistically via flameOptimistic + useFlameState hook
}

/** Stub: trigger milestone community post */
export async function triggerMilestonePost(_userId: string, _type: string): Promise<void> {
  // TODO: implement automatic milestone posts
}
