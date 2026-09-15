import test from 'node:test';
import assert from 'node:assert/strict';
import { stageForActiveSeconds, progressionStageName } from './progression.js';

test('active play time maps to the seven narrative stages without offline punishment', () => {
  assert.equal(stageForActiveSeconds(0), 0);
  assert.equal(stageForActiveSeconds(60 * 60), 1);
  assert.equal(stageForActiveSeconds(4 * 60 * 60), 2);
  assert.equal(stageForActiveSeconds(10 * 60 * 60), 3);
  assert.equal(stageForActiveSeconds(20 * 60 * 60), 4);
  assert.equal(stageForActiveSeconds(30 * 60 * 60), 5);
  assert.equal(stageForActiveSeconds(40 * 60 * 60), 6);
});

test('stage names preserve the PRD life-chapter language instead of XP levels', () => {
  assert.deepEqual(Array.from({ length: 7 }, (_, stage) => progressionStageName(stage)), [
    'Arrival', 'First Days', 'Settling In', 'Belonging', 'Growing Home', 'Our Life', 'Open Living',
  ]);
});
