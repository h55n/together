import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_MINUTES_PER_REAL_MINUTE, realSecondsToGameMinutes, normalizeGameMinute } from './time.js';

test('time scale is canonical 12 game minutes per real minute', () => {
  assert.equal(GAME_MINUTES_PER_REAL_MINUTE, 12);
  assert.equal(realSecondsToGameMinutes(300), 60);
  assert.equal(realSecondsToGameMinutes(1800), 360);
});

test('game minute normalization wraps across a 24 hour day', () => {
  assert.equal(normalizeGameMinute(1440), 0);
  assert.equal(normalizeGameMinute(-1), 1439);
  assert.equal(normalizeGameMinute(725), 725);
});
