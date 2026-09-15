import assert from 'node:assert/strict';
import test from 'node:test';
import { rooms } from './rooms.js';

test('socket rooms follow the PRD naming model', () => {
  assert.equal(rooms.user('u1'), 'user:u1');
  assert.equal(rooms.household('h1'), 'household:h1');
  assert.equal(rooms.cityShard('amaya_bay', '3:4'), 'city:amaya_bay:shard:3:4');
  assert.equal(rooms.interior('h1', 'kitchen'), 'interior:h1:kitchen');
  assert.equal(rooms.voice('h1'), 'voice:h1');
});
