import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { NoteService } from '../../server/src/game/NoteService.js';

async function setup() {
  const repo = new LocalGameRepository();
  const households = new HouseholdService(repo, () => 0.61);
  const household = await households.createHousehold('a', { name: 'Notes Home', type: 'friends' });
  await households.joinHousehold('b', household.inviteCode);
  return { repo, household, notes: new NoteService(repo) };
}

test('household members can leave short physical notes and see newest first', async () => {
  const { household, notes } = await setup();
  const first = await notes.create(household.id, 'a', { text: 'Milk is in the fridge.', placement: 'fridge' });
  const second = await notes.create(household.id, 'b', { text: 'Meet at Bay Steps?', placement: 'door' });
  const list = await notes.list(household.id, 'a');
  assert.equal(list.length, 2);
  assert.equal(list[0]?.id, second.id);
  assert.equal(list[1]?.id, first.id);
  assert.equal(first.authorUserId, 'a');
});

test('notes are private and bounded rather than becoming an embedded social network', async () => {
  const { household, notes } = await setup();
  await assert.rejects(() => notes.create(household.id, 'outsider', { text: 'hello', placement: 'fridge' }), /active household member/);
  await assert.rejects(() => notes.create(household.id, 'a', { text: 'x'.repeat(281), placement: 'fridge' }), /too long/);
});
