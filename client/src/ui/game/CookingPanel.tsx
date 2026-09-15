import { useMemo, useState, type ReactElement } from 'react';
import { cookingActionPresentation, type CookingSessionState, type RecipeDefinition, type RecipeStep } from '@together/shared';

export type CookingSessionView = {
  id: string;
  householdId: string;
  recipeId: string;
  state: CookingSessionState;
  createdAt: string;
  updatedAt: string;
};

export type KitchenInventoryView = { itemId: string; quantity: number };

export function CookingPanel(props: {
  open: boolean;
  recipes: readonly RecipeDefinition[];
  inventory: readonly KitchenInventoryView[];
  session: CookingSessionView | null;
  busy: boolean;
  message: string | null;
  onStart: (recipeId: string) => Promise<void>;
  onStep: (step: RecipeStep, mistake: boolean) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  const [recipeId, setRecipeId] = useState(props.recipes[0]?.id ?? '');
  const [allowMistake, setAllowMistake] = useState(false);
  const selected = props.recipes.find((recipe) => recipe.id === recipeId) ?? props.recipes[0];
  const activeRecipe = props.session ? props.recipes.find((recipe) => recipe.id === props.session?.recipeId) : undefined;
  const stock = useMemo(() => new Map(props.inventory.map((entry) => [entry.itemId, entry.quantity])), [props.inventory]);
  if (!props.open) return null;

  const missing = selected?.ingredients.filter((ingredient) => !ingredient.optional && (stock.get(ingredient.itemId) ?? 0) < ingredient.quantity) ?? [];
  const availableSteps = activeRecipe?.steps.filter((step) => props.session?.state.availableStepIds.includes(step.id)) ?? [];

  return <section className="game-panel cooking-panel" aria-label="Cook at home">
    <header className="panel-header"><div><p className="eyebrow">Home · shared kitchen</p><h2>{props.session ? activeRecipe?.displayName ?? 'Cooking' : 'Cook together'}</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    {!props.session ? <>
      <p className="panel-copy">Ingredients come from the shared home inventory. Starting a meal reserves them once; different household members can work separate stations at the same time.</p>
      <label className="field-label" htmlFor="recipe-select">Recipe</label>
      <select id="recipe-select" className="text-field" value={recipeId} onChange={(event) => setRecipeId(event.target.value)}>
        {props.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.displayName} · {recipe.servings} servings</option>)}
      </select>
      {selected && <div className="ingredient-list">
        {selected.ingredients.map((ingredient) => { const available = stock.get(ingredient.itemId) ?? 0; const short = !ingredient.optional && available < ingredient.quantity; return <div key={ingredient.itemId} className={short ? 'ingredient-row missing' : 'ingredient-row'}><span>{humanize(ingredient.itemId)}{ingredient.optional ? ' · optional' : ''}</span><span>{available} / {ingredient.quantity}</span></div>; })}
      </div>}
      {missing.length > 0 && <p className="status-copy">You are missing {missing.map((item) => humanize(item.itemId)).join(', ')}. Pick them up at any grocery in the city.</p>}
      <button className="primary-action" disabled={props.busy || !selected || missing.length > 0} onClick={() => selected && void props.onStart(selected.id)}>{props.busy ? 'Preparing…' : 'Start cooking'}</button>
    </> : <>
      <div className="cooking-progress"><span>{props.session.state.completedStepIds.length} / {activeRecipe?.steps.length ?? 0} actions</span><span>{props.session.state.participants.length} participant{props.session.state.participants.length === 1 ? '' : 's'}</span></div>
      {props.session.state.status === 'completed' ? <div className="cooking-outcome"><p className="eyebrow">Meal ready</p><h3>{humanize(props.session.state.outcome?.id ?? 'shared meal')}</h3><p className="panel-copy">{props.session.state.outcome?.quality === 'burnt' ? 'Not perfect, but definitely a story.' : props.session.state.outcome?.quality === 'imperfect' ? 'A little imperfect. Still dinner.' : 'Everything came together.'}</p></div> : <>
        <p className="panel-copy">Choose one available physical step. Its station is claimed to you while the action is performed, so another player can work another branch.</p>
        <div className="cooking-step-list">{availableSteps.map((step) => { const presentation = cookingActionPresentation(step.action); const holder = props.session?.state.stationClaims[step.station]; return <button className="cooking-step" key={step.id} disabled={props.busy || Boolean(holder)} onClick={() => void props.onStep(step, allowMistake)}><strong>{presentation.label} · {humanize(step.id)}</strong><span>{humanize(step.station)}{holder ? ' · occupied' : ''}</span></button>; })}</div>
        <label className="mistake-toggle"><input type="checkbox" checked={allowMistake} onChange={(event) => setAllowMistake(event.target.checked)} />DEV · allow an imperfect attempt</label>
      </>}
    </>}
    {props.message && <p className="status-copy">{props.message}</p>}
  </section>;
}

function humanize(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
