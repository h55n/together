import type { AvatarConfig } from '../contracts.js';

export type AvatarOutfitContext = 'home' | 'outdoor' | 'sleep';

export type RuntimeAvatarAppearance = {
  height: number;
  bodyWidthScale: number;
  skinColor: string;
  shirtColor: string;
  trouserColor: string;
  hairColor: string;
};

const SKIN_TONES = [
  '#f1c7a7', '#eab996', '#dda982', '#d09a74', '#c28a66', '#b47a5a',
  '#a36c50', '#925e47', '#80503d', '#6d4334', '#59362b', '#472a23',
] as const;

const OUTFIT_PALETTES = [
  ['#637a70', '#3c4748'], ['#9a6955', '#423d3f'], ['#5c7087', '#343d48'],
  ['#8a7658', '#45423c'], ['#765f7d', '#3f3947'], ['#587762', '#36433d'],
  ['#9b8171', '#4b4140'], ['#677b88', '#354149'], ['#7b7561', '#413e38'],
] as const;

export function avatarAppearanceFromConfig(config: AvatarConfig, context: AvatarOutfitContext): RuntimeAvatarAppearance {
  const outfitId = context === 'home' ? config.homeOutfit : context === 'sleep' ? config.sleepOutfit : config.outdoorOutfit;
  const paletteIndex = stableHash(`${context}:${outfitId}`) % OUTFIT_PALETTES.length;
  const [shirtColor, trouserColor] = OUTFIT_PALETTES[paletteIndex]!;
  return {
    height: config.height,
    bodyWidthScale: config.bodyFrame === 'slim' ? 0.9 : config.bodyFrame === 'broad' ? 1.12 : 1,
    skinColor: SKIN_TONES[config.skinTone - 1] ?? SKIN_TONES[4],
    shirtColor,
    trouserColor,
    hairColor: config.hairColor,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return Math.abs(hash >>> 0);
}
