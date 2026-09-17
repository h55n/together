import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRecipeGraph } from '@together/shared';
import { activities, namedNpcs, recipes, storyEvents } from './index.js';

export function validateContent(): string[] {
  const issues: string[] = [];
  const requireUnique = (kind: string, ids: readonly string[]) => {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    for (const id of new Set(duplicates)) issues.push(`duplicate ${kind} id: ${id}`);
  };
  requireUnique('npc', namedNpcs.map((value) => value.id));
  requireUnique('recipe', recipes.map((value) => value.id));
  requireUnique('activity', activities.map((value) => value.id));
  requireUnique('story', storyEvents.map((value) => value.id));
  for (const recipe of recipes) for (const issue of validateRecipeGraph(recipe)) issues.push(`recipe ${recipe.id}: ${issue}`);
  if (namedNpcs.length < 10) issues.push('fewer than ten canonical named NPCs');
  if (activities.length < 8) issues.push('fewer than eight core leisure activities');
  return issues;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === modulePath) {
  const issues = validateContent();
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Validated ${namedNpcs.length} NPCs, ${recipes.length} recipes, ${activities.length} activities and ${storyEvents.length} story events.`);
  }
}
