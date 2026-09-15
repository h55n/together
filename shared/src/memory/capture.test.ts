import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreMemoryCapture, shouldAutoCapture } from './capture.js';

test('memory capture favors meaningful well-composed shared moments', () => {
  const strong = scoreMemoryCapture({
    participantsVisible: 2, participantsExpected: 2, occlusionRatio: 0.05,
    composition: 0.9, storyRelevance: 1, scenicValue: 0.8, lightingQuality: 0.9,
    secondsSinceAutomaticCapture: 900,
  });
  const weak = scoreMemoryCapture({
    participantsVisible: 1, participantsExpected: 2, occlusionRatio: 0.6,
    composition: 0.2, storyRelevance: 0, scenicValue: 0.1, lightingQuality: 0.3,
    secondsSinceAutomaticCapture: 90,
  });
  assert.ok(strong > weak);
  assert.equal(shouldAutoCapture(strong, 900), true);
  assert.equal(shouldAutoCapture(strong, 60), false);
});

import { makeMemoryImagePath, memoryImageIdFromPath } from './capture.js';

test('private Memory image references use opaque server-resolved ids', () => {
  assert.equal(makeMemoryImagePath('photo_abc-123'), 'memory-image:photo_abc-123');
  assert.equal(memoryImageIdFromPath('memory-image:photo_abc-123'), 'photo_abc-123');
  assert.equal(memoryImageIdFromPath('https://public.example/photo.jpg'), null);
  assert.equal(memoryImageIdFromPath('memory-image:../escape'), null);
});
