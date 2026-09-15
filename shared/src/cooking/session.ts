import { availableRecipeSteps, resolveRecipeOutcome, type RecipeDefinition, type RecipeOutcome } from './recipe.js';

export type CookingSessionState = {
  id: string;
  recipeId: string;
  status: 'active' | 'completed';
  completedStepIds: string[];
  availableStepIds: string[];
  stationClaims: Record<string, string>;
  participants: string[];
  mistakes: number;
  outcome?: RecipeOutcome;
};

function recompute(recipe: RecipeDefinition, state: CookingSessionState): CookingSessionState {
  const completed = new Set(state.completedStepIds);
  const available = availableRecipeSteps(recipe, completed).map((step) => step.id);
  if (completed.size >= recipe.steps.length) {
    const outcome = resolveRecipeOutcome(recipe, state.mistakes);
    return { ...state, status: 'completed', availableStepIds: [], ...(outcome ? { outcome } : {}) };
  }
  return { ...state, status: 'active', availableStepIds: available };
}

export function createCookingSession(id: string, recipe: RecipeDefinition): CookingSessionState {
  if (!id) throw new Error('Cooking session id is required');
  return recompute(recipe, {
    id,
    recipeId: recipe.id,
    status: recipe.steps.length ? 'active' : 'completed',
    completedStepIds: [],
    availableStepIds: [],
    stationClaims: {},
    participants: [],
    mistakes: 0,
  });
}

export function claimCookingStation(state: CookingSessionState, playerId: string, station: string): CookingSessionState {
  if (state.status !== 'active') throw new Error('Cooking session is complete');
  if (!playerId || !station) throw new Error('Player and station are required');
  const occupant = state.stationClaims[station];
  if (occupant && occupant !== playerId) throw new Error(`Station ${station} is occupied`);
  return {
    ...state,
    stationClaims: { ...state.stationClaims, [station]: playerId },
    participants: state.participants.includes(playerId) ? [...state.participants] : [...state.participants, playerId],
  };
}

export function releaseCookingStation(state: CookingSessionState, playerId: string, station: string): CookingSessionState {
  if (state.stationClaims[station] !== playerId) return state;
  const stationClaims = { ...state.stationClaims };
  delete stationClaims[station];
  return { ...state, stationClaims };
}

export function completeCookingStep(
  recipe: RecipeDefinition,
  state: CookingSessionState,
  playerId: string,
  stepId: string,
  mistake: boolean,
): CookingSessionState {
  if (state.status !== 'active') throw new Error('Cooking session is complete');
  if (!state.availableStepIds.includes(stepId)) throw new Error(`Step ${stepId} is not available`);
  const step = recipe.steps.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error('Unknown recipe step');
  if (state.stationClaims[step.station] !== playerId) throw new Error(`Station ${step.station} must be claimed by this player`);
  const next = {
    ...state,
    completedStepIds: [...state.completedStepIds, stepId],
    mistakes: state.mistakes + (mistake ? 1 : 0),
    participants: state.participants.includes(playerId) ? [...state.participants] : [...state.participants, playerId],
  };
  return recompute(recipe, next);
}
