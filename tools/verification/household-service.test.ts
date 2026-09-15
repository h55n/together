import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { HouseholdService } from '../../server/src/game/HouseholdService.js';

test('server creates canonical household funds and enforces Couple capacity', async () => {
  const repository = new LocalGameRepository();
  const service = new HouseholdService(repository, () => 0.11);
  const household = await service.createHousehold('user-a', { name: 'Sea Window', type: 'couple' });
  assert.equal(household.sharedWallet, 8000);
  assert.equal(household.members[0]?.personalWallet, 1500);
  assert.equal(household.inviteCode.length, 6);
  await service.joinHousehold('user-b', household.inviteCode);
  await assert.rejects(() => service.joinHousehold('user-c', household.inviteCode), /limited to 2 members/);
});

test('server active-time accounting advances narrative stage from active play only', async () => {
  const repository = new LocalGameRepository();
  const service = new HouseholdService(repository, () => 0.13);
  const household = await service.createHousehold('user-stage', { name: 'Slow Life', type: 'friends' });
  const afterHour = await service.advanceActiveTime(household.id, 60 * 60);
  assert.equal(afterHour.activeTimeSeconds, 60 * 60);
  assert.equal(afterHour.stage, 1);
  const afterFourHours = await service.advanceActiveTime(household.id, 3 * 60 * 60);
  assert.equal(afterFourHours.stage, 2);
  await assert.rejects(() => service.advanceActiveTime(household.id, -1), /positive/);
});
