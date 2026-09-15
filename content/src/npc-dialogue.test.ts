import test from 'node:test';
import assert from 'node:assert/strict';
import { namedNpcs, npcDialogue } from './index.js';

test('every persistent resident has authored greeting, weather and familiar dialogue', () => {
  for (const npc of namedNpcs) {
    const lines = npcDialogue[npc.id];
    assert.ok(lines, `${npc.id} needs dialogue`);
    assert.ok(lines.greeting.length > 0);
    assert.ok(lines.weather.length > 0);
    assert.ok(lines.familiar.length > 0);
  }
});
