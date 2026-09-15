import test from 'node:test';
import assert from 'node:assert/strict';
import { activities, namedNpcs, recipes, storyEvents } from './index.js';
import { validateRecipeGraph } from '@together/shared';

test('initial content includes the canonical ten named NPCs plus additional residents and eight leisure activities', () => {
  const ids = namedNpcs.map((npc) => npc.id);
  for (const id of ['roshan','kamla','ravi','meera','dev','naina','arjun','isha','sana','kabir']) assert.ok(ids.includes(id));
  assert.ok(namedNpcs.length >= 12);
  assert.equal(activities.length, 8);
});

test('initial recipes are graph-valid and include Indian comfort-food rituals', () => {
  assert.ok(recipes.some((recipe) => recipe.id === 'chai'));
  assert.ok(recipes.some((recipe) => recipe.id === 'khichdi'));
  for (const recipe of recipes) assert.deepEqual(validateRecipeGraph(recipe), []);
});

test('story content includes shared, Couple and Friends events with failure memories', () => {
  assert.ok(storyEvents.some((event) => event.paths.includes('all')));
  assert.ok(storyEvents.some((event) => event.paths.includes('couple')));
  assert.ok(storyEvents.some((event) => event.paths.includes('friends')));
  assert.ok(storyEvents.every((event) => event.outcomes.length >= 2));
});

test('every named NPC and leisure activity resolves to an authored Amaya Bay location anchor', async () => {
  const { AMAYA_BAY_LOCATION_ANCHORS } = await import('@together/shared');
  const known = new Set(AMAYA_BAY_LOCATION_ANCHORS.map((location) => location.id));
  for (const npc of namedNpcs) assert.ok(known.has(npc.homeOrWork), `missing NPC location ${npc.homeOrWork}`);
  for (const activity of activities) {
    if (activity.locationId !== 'city' && activity.locationId !== 'home_table') assert.ok(known.has(activity.locationId), `missing activity location ${activity.locationId}`);
  }
});

test('every recipe ingredient resolves to a priced grocery item', async () => {
  const { items } = await import('./index.js');
  const known = new Map(items.map((item) => [item.id, item]));
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const item = known.get(ingredient.itemId);
      assert.ok(item, `${recipe.id} missing ${ingredient.itemId}`);
      assert.ok((item?.price ?? 0) > 0, `${ingredient.itemId} has no market price`);
    }
  }
});


test('V1 content breadth includes at least twenty comfort-food recipes and all twenty canonical core stories', () => {
  assert.ok(recipes.length >= 20);
  const canonicalStories = [
    'move_in_day','first_dinner','pipe_disaster','power_cut','new_neighbour','leftovers','quiet_anniversary','flat_pack','adopt_plant','freelance_deadline',
    'stuck_indoors','job_good_news','housemate_birthday','something_needs_said','block_evening','monsoon_leak','first_kayak','expensive_thing','moving_day','first_night_new_place',
  ];
  const ids = new Set(storyEvents.map((story) => story.id));
  for (const id of canonicalStories) assert.ok(ids.has(id), `missing canonical story ${id}`);
});

test('release story library reaches shared, Couple and Friends breadth targets', () => {
  const shared = storyEvents.filter((event) => event.paths.includes('all')).length;
  const couple = storyEvents.filter((event) => event.paths.includes('couple')).length;
  const friends = storyEvents.filter((event) => event.paths.includes('friends')).length;
  assert.ok(shared >= 20, `expected >=20 shared stories, got ${shared}`);
  assert.ok(couple >= 8, `expected >=8 Couple stories, got ${couple}`);
  assert.ok(friends >= 8, `expected >=8 Friends stories, got ${friends}`);
});
