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
  assert.equal(a.faceBase, 'face_01');
  assert.equal(a.hair, 'hair_02');
  assert.equal(a.facialHair, undefined);
  assert.equal(a.glasses, undefined);
  assert.equal(a.outfitId, 'outdoor_terracotta');
  assert.equal(a.outfitContext, 'outdoor');
});

test('work appearance keeps the job uniform id through mapping', () => {
  const work = avatarAppearanceFromConfig({
    bodyFrame: 'average', height: 1.72, skinTone: 5, faceBase: 'face_01', hair: 'hair_01',
    hairColor: '#2f211b', homeOutfit: 'home_01', outdoorOutfit: 'outdoor_01', sleepOutfit: 'sleep_01',
  }, 'work', 'job_cafe_barista');
  assert.equal(work.outfitContext, 'work');
  assert.equal(work.outfitId, 'job_cafe_barista');
});

test('avatar appearance preserves optional facial hair and glasses identity', () => {
  const appearance = avatarAppearanceFromConfig({
    bodyFrame: 'average', height: 1.72, skinTone: 5, faceBase: 'face_03', hair: 'hair_04',
    facialHair: 'beard_short', hairColor: '#24170f', glasses: 'glasses_round',
    homeOutfit: 'home_01', outdoorOutfit: 'outdoor_01', sleepOutfit: 'sleep_01',
  }, 'home');
  assert.equal(appearance.faceBase, 'face_03');
  assert.equal(appearance.hair, 'hair_04');
  assert.equal(appearance.facialHair, 'beard_short');
  assert.equal(appearance.glasses, 'glasses_round');
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

test('named outfits wear the colour they are named for', () => {
  const base = { bodyFrame: 'average' as const, height: 1.72, skinTone: 5, faceBase: 'face_01', hair: 'hair_01', hairColor: '#2f211b', homeOutfit: 'home_sage', sleepOutfit: 'sleep_soft' };
  assert.equal(avatarAppearanceFromConfig({ ...base, outdoorOutfit: 'outdoor_terracotta' }, 'outdoor').shirtColor, '#c96a4a');
  assert.equal(avatarAppearanceFromConfig({ ...base, outdoorOutfit: 'outdoor_blue' }, 'outdoor').shirtColor, '#5f93c9');
  assert.equal(avatarAppearanceFromConfig({ ...base, outdoorOutfit: 'outdoor_mustard' }, 'outdoor').shirtColor, '#e2b448');
  assert.equal(avatarAppearanceFromConfig({ ...base, outdoorOutfit: 'outdoor_01' }, 'home').shirtColor, '#8fb898');
});
