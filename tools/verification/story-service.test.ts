import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { StoryService } from '../../server/src/game/StoryService.js';
import type { StoryDefinition } from '@together/shared';

const story: StoryDefinition = {
  id: 'burned_dinner', title: 'Burned Dinner', paths: ['all'], stageRange: [0, 2],
  triggers: [{ type: 'flag', key: 'moved_in', value: true }],
  tasks: [{ id: 'cook', type: 'micro_action', target: 'cook_meal' }],
  outcomes: [
    { id: 'tasty', when: { maxFailures: 0 }, memoryTag: 'good_dinner', setFlags: { first_dinner_done: true } },
    { id: 'burnt', when: { minFailures: 1 }, memoryTag: 'burned_dinner', setFlags: { first_dinner_done: true, burned_first_dinner: true } },
  ],
};

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'Story Home', type: 'couple' });
  household.hiddenState = { flags: { moved_in: true } };
  await repo.saveHousehold(household);
  return { repo, household, stories: new StoryService(repo, [story]) };
}

test('eligible story begins once and persists task state', async () => {
  const { household, stories } = await setup();
  const first = await stories.start(household.id, 'user-a', 'burned_dinner');
  const second = await stories.start(household.id, 'user-a', 'burned_dinner');
  assert.equal(first.id, second.id);
  assert.equal(first.state, 'active');
  assert.deepEqual(first.taskState, { cook: 'pending' });
});

test('failure resolves an alternate story memory and changes future household flags', async () => {
  const { repo, household, stories } = await setup();
  const instance = await stories.start(household.id, 'user-a', 'burned_dinner');
  await stories.updateTask(household.id, 'user-a', instance.id, 'cook', 'failed');
  const resolved = await stories.resolve(household.id, 'user-a', instance.id);
  assert.equal(resolved.branch, 'burnt');
  assert.equal(resolved.memoryTag, 'burned_dinner');
  const updated = await repo.getHousehold(household.id);
  assert.equal(((updated?.hiddenState.flags as Record<string, boolean>)?.burned_first_dinner), true);
});

test('story tasks advance explicitly and required tasks must resolve before outcome', async () => {
  const { household, stories } = await setup();
  const instance = await stories.start(household.id, 'user-a', 'burned_dinner');
  await assert.rejects(() => stories.resolve(household.id, 'user-a', instance.id), /required tasks/);
  const progressed = await stories.updateTask(household.id, 'user-a', instance.id, 'cook', 'complete');
  assert.equal(progressed.taskState.cook, 'complete');
  const resolved = await stories.resolve(household.id, 'user-a', instance.id);
  assert.equal(resolved.state, 'resolved');
  await assert.rejects(() => stories.updateTask(household.id, 'user-a', instance.id, 'missing', 'complete'), /Story is already resolved|Unknown story task/);
});

test('server lists only currently eligible unstarted stories without exposing ineligible branches', async () => {
  const { household, stories } = await setup();
  const eligible = await stories.eligible(household.id, 'user-a');
  assert.deepEqual(eligible.map((entry) => entry.id), ['burned_dinner']);
  await stories.start(household.id, 'user-a', 'burned_dinner');
  assert.deepEqual(await stories.eligible(household.id, 'user-a'), []);
});
