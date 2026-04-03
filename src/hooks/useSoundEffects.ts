/**
 * Sound effects module — TEMPORARILY DISABLED.
 * All SFX calls are now no-ops to remove interaction sounds system-wide.
 */

const noop = () => {};

export const SFX = {
  confirm: noop,
  victory: noop,
  xp: noop,
  notification: noop,
  flameIgnite: noop,
  error: noop,
  tap: noop,
  waterDrop: noop,
  coachWhistle: noop,
  gymPlates: noop,
} as const;

export type SfxName = keyof typeof SFX;

export const useSoundEffects = () => {
  const play = (_name: SfxName) => {};
  return { play };
};
