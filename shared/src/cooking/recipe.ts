export type RecipeAction = 'wash' | 'cut' | 'measure' | 'boil' | 'fry' | 'stir' | 'pour' | 'plate' | 'serve';
export type RecipeQuality = 'good' | 'imperfect' | 'burnt';

export type IngredientRequirement = { itemId: string; quantity: number; optional?: boolean };
export type RecipeStep = {
  id: string;
  action: RecipeAction;
  station: string;
  dependsOn: string[];
  parallelGroup?: string;
};
export type RecipeOutcome = {
  id: string;
  minMistakes?: number;
  maxMistakes?: number;
  quality: RecipeQuality;
};
export type RecipeDefinition = {
  id: string;
  displayName: string;
  ingredients: IngredientRequirement[];
  tools: string[];
  steps: RecipeStep[];
  outcomes: RecipeOutcome[];
  servings: number;
  memoryTags?: string[];
};

export function validateRecipeGraph(recipe: RecipeDefinition): string[] {
  const issues: string[] = [];
  if (recipe.servings < 1) issues.push('servings must be at least 1');
  const stepIds = new Set<string>();
  for (const step of recipe.steps) {
    if (stepIds.has(step.id)) issues.push(`duplicate step id: ${step.id}`);
    stepIds.add(step.id);
  }
  for (const step of recipe.steps) {
    for (const dependency of step.dependsOn) {
      if (!stepIds.has(dependency)) issues.push(`missing dependency ${dependency} for ${step.id}`);
      if (dependency === step.id) issues.push(`step ${step.id} cannot depend on itself`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(recipe.steps.map((step) => [step.id, step]));
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const step = byId.get(id);
    if (step) {
      for (const dependency of step.dependsOn) {
        if (byId.has(dependency) && visit(dependency)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (recipe.steps.some((step) => visit(step.id))) issues.push('recipe dependency cycle detected');
  return [...new Set(issues)];
}

export function resolveRecipeOutcome(recipe: RecipeDefinition, mistakes: number): RecipeOutcome | undefined {
  const count = Math.max(0, Math.floor(mistakes));
  return recipe.outcomes.find((outcome) =>
    (outcome.minMistakes === undefined || count >= outcome.minMistakes)
    && (outcome.maxMistakes === undefined || count <= outcome.maxMistakes));
}

export function availableRecipeSteps(recipe: RecipeDefinition, completed: ReadonlySet<string>): RecipeStep[] {
  return recipe.steps.filter((step) => !completed.has(step.id) && step.dependsOn.every((id) => completed.has(id)));
}
