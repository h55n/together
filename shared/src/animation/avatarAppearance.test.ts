import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarAppearanceFromConfig } from './avatarAppearance.js';

test('avatar appearance maps skin tone, body frame and outfit ids deterministically', () => {
  const a = avatarAppearanceFromConfig({
    bodyFrame: 'broad', height: 1.8, skinTone: 8, faceBase: 'face_01', hair: 'hair_02', hairColor: '#24170f',
    homeOutfit: 'home_sage', outdoorOutfit: 'outdoor_terracotta', sleepOutfit: 'sleep_01',
  }, 'outdoor');
  const b = avatarAppearanceFromConfig({
    bodyFrame: 'broad', height: 1.8, skinTone: 8, faceBase: 'face_01', hair: 'hair_02', hairColor: '#24170f',
    homeOutfit: 'home_sage', outdoorOutfit: 'outdoor_terracotta', sleepOutfit: 'sleep_01',
  }, 'outdoor');
  assert.deepEqual(a, b);
  assert.equal(a.height, 1.8);
  assert.ok(a.bodyWidthScale > 1);
  assert.match(a.skinColor, /^#[0-9a-f]{6}$/i);
});

test('outfit context changes clothing palette without changing identity skin tone', () => {
  const config = {
    bodyFrame: 'average' as const, height: 1.72, skinTone: 4, faceBase: 'face_01', hair: 'hair_01', hairColor: '#2f211b',
    homeOutfit: 'home_sage', outdoorOutfit: 'outdoor_blue', sleepOutfit: 'sleep_soft',
  };
  const home = avatarAppearanceFromConfig(config, 'home');
  const outdoor = avatarAppearanceFromConfig(config, 'outdoor');
  assert.equal(home.skinColor, outdoor.skinColor);
  assert.notEqual(home.shirtColor, outdoor.shirtColor);
});
