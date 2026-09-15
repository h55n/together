import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { MemoryService } from '../../server/src/game/MemoryService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo);
  const household = await households.createHousehold('user-a', { name: 'Memory Home', type: 'couple' });
  return { repo, household, memories: new MemoryService(repo) };
}

test('memory creation is private, authoritative and idempotent', async () => {
  const { household, memories } = await setup();
  const first = await memories.create(household.id, 'user-a', {
    idempotencyKey: 'memory-first-dinner-0001', type: 'story', caption: 'Our first dinner', locationId: 'mogra_court', weather: 'light_rain', participants: ['user-a'], eventId: 'first_dinner', screenshotPath: 'pending://capture-1',
  });
  const second = await memories.create(household.id, 'user-a', {
    idempotencyKey: 'memory-first-dinner-0001', type: 'story', caption: 'duplicate', locationId: 'elsewhere', weather: 'clear', participants: [], eventId: 'other', screenshotPath: 'pending://capture-2',
  });
  assert.equal(first.id, second.id);
  assert.equal(second.caption, 'Our first dinner');
  assert.equal((await memories.list(household.id, 'user-a')).length, 1);
});

test('memory captions can be updated by active household members only', async () => {
  const { household, memories } = await setup();
  const memory = await memories.create(household.id, 'user-a', {
    idempotencyKey: 'memory-caption-0001', type: 'manual', caption: 'Bay evening', locationId: 'bay_steps', weather: 'clear', participants: ['user-a'], screenshotPath: 'pending://capture-3',
  });
  const updated = await memories.updateCaption(household.id, 'user-a', memory.id, 'That windy evening by the bay');
  assert.equal(updated.caption, 'That windy evening by the bay');
  await assert.rejects(() => memories.updateCaption(household.id, 'outsider', memory.id, 'changed'), /active household member/);
});
