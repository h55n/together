import type { AvatarConfig } from '../contracts.js';

export type AvatarOutfitContext = 'home' | 'outdoor' | 'sleep' | 'work';

export type RuntimeAvatarAppearance = {
  height: number;
  bodyWidthScale: number;
  skinColor: string;
  shirtColor: string;
  trouserColor: string;
  faceBase: string;
  hair: string;
  facialHair?: string;
  hairColor: string;
  glasses?: string;
  outfitId: string;
  outfitContext: AvatarOutfitContext;
};

const SKIN_TONES = [
  '#f1c7a7', '#eab996', '#dda982', '#d09a74', '#c28a66', '#b47a5a',
  '#a36c50', '#925e47', '#80503d', '#6d4334', '#59362b', '#472a23',
] as const;

// Fallback palette for unnamed outfit ids: clear, cheerful anime colours rather than muddy greys.
const OUTFIT_PALETTES = [
  ['#5f93c9', '#2f3d58'], ['#c96a4a', '#efe3cc'], ['#8fb898', '#5b4b3d'],
  ['#e2b448', '#3b4a62'], ['#d97aa0', '#3a4256'], ['#f2ede2', '#5a6f8c'],
  ['#7c66c4', '#e6dcc8'], ['#4e9a6a', '#ede2cc'], ['#e08a4c', '#34405a'],
] as const;

/** Named wardrobe choices look like their names; matched by keyword so variants share a look. */
const NAMED_OUTFITS: ReadonlyArray<readonly [string, string, string]> = [
  ['terracotta', '#c96a4a', '#efe3cc'], ['blue', '#5f93c9', '#2f3d58'], ['sage', '#8fb898', '#5b4b3d'],
  ['mustard', '#e2b448', '#3b4a62'], ['soft', '#cfd8ea', '#b6c1d9'], ['barista', '#f2ede2', '#3a3f4a'],
  ['garden', '#7fae6a', '#5a4a38'], ['delivery', '#e2683c', '#2f3d58'], ['market', '#e9c46a', '#4a5568'],
];

export function avatarAppearanceFromConfig(
  config: AvatarConfig,
  context: AvatarOutfitContext,
  outfitIdOverride?: string,
): RuntimeAvatarAppearance {
  const selectedOutfit = context === 'home' ? config.homeOutfit : context === 'sleep' ? config.sleepOutfit : config.outdoorOutfit;
  const outfitId = outfitIdOverride ?? selectedOutfit;
  const named = NAMED_OUTFITS.find(([keyword]) => outfitId.includes(keyword));
  const [shirtColor, trouserColor] = named ? [named[1], named[2]] : OUTFIT_PALETTES[stableHash(`${context}:${outfitId}`) % OUTFIT_PALETTES.length]!;
  return {
    height: config.height,
    bodyWidthScale: config.bodyFrame === 'slim' ? 0.9 : config.bodyFrame === 'broad' ? 1.12 : 1,
    skinColor: SKIN_TONES[config.skinTone - 1] ?? SKIN_TONES[4],
    shirtColor,
    trouserColor,
    faceBase: config.faceBase,
    hair: config.hair,
    ...(config.facialHair ? { facialHair: config.facialHair } : {}),
    hairColor: config.hairColor,
    ...(config.glasses ? { glasses: config.glasses } : {}),
    outfitId,
    outfitContext: context,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return Math.abs(hash >>> 0);
}
