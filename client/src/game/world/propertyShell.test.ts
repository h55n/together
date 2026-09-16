import assert from 'node:assert/strict';
import test from 'node:test';
import { propertyRoofSpec } from './propertyShell.js';

test('couple studio roof clears the player camera and overhangs the walls', () => {
  const roof = propertyRoofSpec(11, 9, 3);
  assert.ok(roof.width > 11);
  assert.ok(roof.depth > 9);
  assert.ok(roof.centerY > 3);
  assert.ok(roof.thickness >= 0.16);
});

test('larger property roofs scale with their architectural shell', () => {
  const small = propertyRoofSpec(11, 9, 3);
  const large = propertyRoofSpec(18, 15, 3);
  assert.ok(large.width > small.width);
  assert.ok(large.depth > small.depth);
  assert.equal(large.centerY, small.centerY);
});
