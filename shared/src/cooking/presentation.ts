import type { AvatarAction } from '../animation/avatarMotion.js';
import type { RecipeAction } from './recipe.js';

export type CookingActionPresentation = {
  label: string;
  avatarAction: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>;
};

const PRESENTATION: Record<RecipeAction, CookingActionPresentation> = {
  wash: { label: 'Wash', avatarAction: 'wash' },
  cut: { label: 'Cut', avatarAction: 'cut' },
  measure: { label: 'Measure', avatarAction: 'place' },
  boil: { label: 'Boil', avatarAction: 'stir' },
  fry: { label: 'Fry', avatarAction: 'stir' },
  stir: { label: 'Stir', avatarAction: 'stir' },
  pour: { label: 'Pour', avatarAction: 'pour' },
  plate: { label: 'Plate', avatarAction: 'place' },
  serve: { label: 'Serve', avatarAction: 'hand_over' },
};

export function cookingActionPresentation(action: RecipeAction): CookingActionPresentation {
  return PRESENTATION[action];
}
