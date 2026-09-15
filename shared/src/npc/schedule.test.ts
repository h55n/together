import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduleActionAt, type NPCSchedule } from './schedule.js';

const roshan: NPCSchedule = {
  npcId: 'roshan',
  periods: [
    { start: '06:30', end: '07:00', action: 'open_cafe' },
    { start: '07:00', end: '12:00', action: 'work_counter' },
    { start: '12:00', end: '13:00', action: 'break_back_table' },
    { start: '13:00', end: '22:00', action: 'work_counter' },
  ],
};

test('named NPC schedules resolve authored periods deterministically', () => {
  assert.equal(scheduleActionAt(roshan, 6 * 60 + 45), 'open_cafe');
  assert.equal(scheduleActionAt(roshan, 10 * 60), 'work_counter');
  assert.equal(scheduleActionAt(roshan, 12 * 60 + 30), 'break_back_table');
  assert.equal(scheduleActionAt(roshan, 23 * 60), 'off_schedule');
});
