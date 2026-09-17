import test from 'node:test';
import assert from 'node:assert/strict';
import { jobById, starterPropertyById } from '../../shared/src/index.js';
import type { TransactionRecord } from '../../server/src/db/GameRepository.js';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';
import { EconomyService } from '../../server/src/game/EconomyService.js';
import { JobSessionService } from '../../server/src/game/JobSessionService.js';
import { ActivityService } from '../../server/src/game/ActivityService.js';
import { PropertySelectionService } from '../../server/src/game/PropertySelectionService.js';

class FailingTransactionRepository extends LocalGameRepository {
  failTransactionWrites = false;

  override async saveTransaction(transaction: TransactionRecord): Promise<void> {
    if (this.failTransactionWrites) throw new Error('simulated transaction persistence failure');
    await super.saveTransaction(transaction);
  }
}

async function makeHousehold() {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository, () => 0.12345);
  const household = await households.createHousehold('owner', { type: 'friends', name: 'Audit Home' });
  return { repository, households, household };
}

test('idempotent job start does not disclose another users session', async () => {
  const { repository, household } = await makeHousehold();
  const jobs = new JobSessionService(repository, new EconomyService(repository));
  await jobs.start(household.id, 'owner', 'nursery_assistant', 'shared-job-key-001');
  await assert.rejects(() => jobs.start(household.id, 'outsider', 'nursery_assistant', 'shared-job-key-001'), /active household member|does not belong/i);
});

test('idempotent activity start does not disclose another households session', async () => {
  const { repository, household } = await makeHousehold();
  const activities = new ActivityService(repository);
  await activities.start(household.id, 'owner', 'photography', 'shared-activity-key-001');
  await assert.rejects(() => activities.start(household.id, 'outsider', 'photography', 'shared-activity-key-001'), /active household member/i);
});

test('completed job session cannot be paid twice with a different completion key', async () => {
  const { repository, household } = await makeHousehold();
  const jobs = new JobSessionService(repository, new EconomyService(repository));
  const session = await jobs.start(household.id, 'owner', 'nursery_assistant', 'job-start-double-pay');
  for (const action of jobById('nursery_assistant')!.actions) await jobs.advance(session.id, 'owner', action);
  const first = await jobs.complete(session.id, 'owner', 'job-finish-first-001');
  await assert.rejects(() => jobs.complete(session.id, 'owner', 'job-finish-second-002'), /already complete|already paid/i);
  const fresh = await repository.getHousehold(household.id);
  assert.equal(fresh?.members[0]?.personalWallet, first.economy.personalWallet);
});

test('solo explorer stores the canonical UUID property record id', async () => {
  const repository = new LocalGameRepository();
  const households = new HouseholdService(repository, () => 0.42);
  const household = await households.createSoloExplorer('solo-user');
  assert.equal(household.propertyId, starterPropertyById('one_bhk')?.recordId);
  assert.match(household.propertyId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('property assignment emits the canonical property_assigned story flag', async () => {
  const { repository, households, household } = await makeHousehold();
  await households.joinHousehold('friend', household.inviteCode);
  const properties = new PropertySelectionService(repository, households);
  const vote = await properties.openPropertyVote(household.id, 'owner', 'one_bhk');
  await properties.castPropertyVote(vote.id, 'friend', 'yes');
  const saved = await repository.getHousehold(household.id);
  const flags = saved?.hiddenState.flags as Record<string, boolean> | undefined;
  assert.equal(flags?.property_assigned, true);
});

test('purchase persistence is atomic when the transaction write fails', async () => {
  const repository = new FailingTransactionRepository();
  const households = new HouseholdService(repository, () => 0.2);
  const household = await households.createHousehold('owner', { type: 'friends', name: 'Atomic Home' });
  const economy = new EconomyService(repository);
  repository.failTransactionWrites = true;

  await assert.rejects(
    () => economy.purchase(household.id, 'owner', {
      itemId: 'chair_wood_01',
      wallet: 'personal',
      idempotencyKey: 'atomic-purchase-fail-001',
    }),
    /simulated transaction persistence failure/,
  );

  const fresh = await repository.getHousehold(household.id);
  assert.equal(fresh?.members[0]?.personalWallet, 1500);
  assert.deepEqual(await repository.listInventory('household', household.id), []);
});
