import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { EconomyService } from '../../server/src/game/EconomyService.js';
import { JobSessionService } from '../../server/src/game/JobSessionService.js';

async function setup() {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository);
  const economy = new EconomyService(repository);
  const jobs = new JobSessionService(repository, economy);
  const household = await households.createHousehold('worker-1', { type: 'couple', name: 'Work Home' });
  return { repository, household, jobs };
}

test('job payout requires completing the authored physical task sequence in order', async () => {
  const { household, jobs } = await setup();
  const session = await jobs.start(household.id, 'worker-1', 'cafe_roshan', 'job-start-cafe-001');
  assert.equal(session.nextAction, 'take_order');
  await assert.rejects(() => jobs.advance(session.id, 'worker-1', 'serve'), /Expected job action/);
  for (const action of ['take_order', 'grind', 'brew', 'heat_milk', 'serve', 'wipe']) {
    await jobs.advance(session.id, 'worker-1', action);
  }
  const completed = await jobs.complete(session.id, 'worker-1', 'job-finish-cafe-001');
  assert.equal(completed.session.state, 'complete');
  assert.equal(completed.economy.transaction.type, 'job_payout');
  assert.equal(completed.economy.transaction.itemRef, 'cafe_roshan');
  assert.ok(completed.economy.personalWallet > 1500);
});

test('a job session is private to the player who started it and start retries are idempotent', async () => {
  const { household, jobs } = await setup();
  const first = await jobs.start(household.id, 'worker-1', 'nursery_assistant', 'job-start-nursery-001');
  const retry = await jobs.start(household.id, 'worker-1', 'nursery_assistant', 'job-start-nursery-001');
  assert.equal(retry.id, first.id);
  await assert.rejects(() => jobs.advance(first.id, 'outsider', 'water'), /does not belong/);
  await assert.rejects(() => jobs.complete(first.id, 'worker-1', 'job-finish-too-soon'), /not complete/);
});
