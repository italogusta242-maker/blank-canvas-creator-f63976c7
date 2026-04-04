export type MinimalChallenge = {
  id: string;
  title?: string | null;
};

const normalizeChallengeTitle = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const isMirisNoFocoChallenge = (title?: string | null) =>
  normalizeChallengeTitle(title).includes("miris no foco");

export const pickPreferredChallenge = <T extends MinimalChallenge>(challenges: T[] | null | undefined) => {
  if (!Array.isArray(challenges) || challenges.length === 0) return null;
  return challenges.find((challenge) => isMirisNoFocoChallenge(challenge.title)) || challenges[0];
};