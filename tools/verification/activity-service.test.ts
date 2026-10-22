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

test('photography framing remains active and checklist capture cannot replace a real image', async () => {
  const { service, household } = await setup();
  const session = await service.start(household.id, 'u1', 'photography', 'activity-start-0002');
  await assert.rejects(() => service.advance(session.id, 'u1', 'capture'), /photography capture/i);
  const framed = await service.advance(session.id, 'u1', 'frame');
  assert.equal(framed.state.status, 'active');
  await assert.rejects(() => service.advance(session.id, 'u1', 'capture'), /photography capture/i);
  assert.equal(framed.state.score, undefined);
});

test('card tables reject checklist bypass before and after a household member joins', async () => {
  const { service, household } = await setup();
  const session = await service.start(household.id, 'u1', 'board_game', 'activity-board-minimum-0001');
  await assert.rejects(() => service.advance(session.id, 'u1', 'deal'), /sports commands/i);
  await service.join(session.id, 'u2');
  await assert.rejects(() => service.advance(session.id, 'u1', 'deal'), /sports commands/i);
  const advanced = await service.boardGameCommand(session.id, 'u1', { key: 'card-flip-first', expectedRevision: 0, kind: 'flip', index: 0 });
  assert.deepEqual(advanced.state.boardGame?.revealed, [0]);
  assert.equal(advanced.state.status, 'active');
});

test('concurrent activity join and progress preserve both authoritative changes', async () => {
  const { service, household } = await setup();
  const session = await service.start(household.id, 'u1', 'picnic', 'activity-concurrent-0001');
  await Promise.all([
    service.join(session.id, 'u2'),
    service.picnicCommand(session.id, 'u1', { key: 'concurrent-mat', expectedRevision: 0, kind: 'place_mat', x: 0.5, z: -0.5 }),
  ]);
  const saved = (await service.list(household.id, 'u1')).find((entry) => entry.id === session.id);
  assert.deepEqual(new Set(saved?.state.participants), new Set(['u1', 'u2']));
  assert.deepEqual(saved?.state.picnic?.participants, ['u1', 'u2']);
  assert.deepEqual(saved?.state.picnic?.mat, { x: 0.5, z: -0.5, placedBy: 'u1' });
  assert.equal(saved?.state.picnic?.revision, 1);
  assert.equal(saved?.state.status, 'active');
});
