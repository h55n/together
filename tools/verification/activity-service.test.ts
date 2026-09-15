import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { ActivityService } from '../../server/src/game/ActivityService.js';

async function setup() {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository);
  const created = await households.createHousehold('u1', { name: 'Leisure Home', type: 'friends' });
  await households.joinHousehold('u2', created.inviteCode);
  return { repository, households, household: created, service: new ActivityService(repository) };
}

test('activity sessions are household-authoritative, idempotent and joinable by members', async () => {
  const { service, household } = await setup();
  const first = await service.start(household.id, 'u1', 'picnic', 'activity-start-0001');
  const retry = await service.start(household.id, 'u1', 'picnic', 'activity-start-0001');
  assert.equal(retry.id, first.id);
  const joined = await service.join(first.id, 'u2');
  assert.deepEqual(joined.state.participants, ['u1', 'u2']);
  await assert.rejects(() => service.join(first.id, 'outsider'), /active household member/i);
});

test('activity sessions only advance through authored embodied steps and complete without payout', async () => {
  const { service, household } = await setup();
  const session = await service.start(household.id, 'u1', 'photography', 'activity-start-0002');
  await assert.rejects(() => service.advance(session.id, 'u1', 'capture'), /next activity step/i);
  const framed = await service.advance(session.id, 'u1', 'frame');
  assert.equal(framed.state.status, 'active');
  const completed = await service.advance(session.id, 'u1', 'capture');
  assert.equal(completed.state.status, 'complete');
  assert.equal(completed.state.score, undefined);
});
