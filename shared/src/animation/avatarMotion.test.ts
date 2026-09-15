import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleAvatarMotion, type AvatarMotionState } from './avatarMotion.js';

function state(action: AvatarMotionState['action'], elapsed = 0.25): AvatarMotionState {
  return { action, elapsedSeconds: elapsed, speed: action === 'jog' ? 3.2 : action === 'walk' ? 1.6 : 0 };
}

test('walk and jog produce opposing arm/leg gait instead of a rigid sliding body', () => {
  const walk = sampleAvatarMotion(state('walk', 0.31));
  assert.ok(Math.abs(walk.leftArmPitch) > 0.1);
  assert.ok(Math.sign(walk.leftArmPitch) === -Math.sign(walk.leftLegPitch));
  const jog = sampleAvatarMotion(state('jog', 0.31));
  assert.ok(Math.abs(jog.leftArmPitch) > Math.abs(walk.leftArmPitch));
});

test('scrub, wipe, cut, stir and water each expose distinct hand micro-motion', () => {
  const tags = ['scrub', 'wipe', 'cut', 'stir', 'water'] as const;
  const signatures = tags.map((tag) => {
    const pose = sampleAvatarMotion(state(tag, 0.37));
    return [pose.rightArmPitch.toFixed(2), pose.rightArmRoll.toFixed(2), pose.rightHandX.toFixed(2), pose.rightHandY.toFixed(2), pose.rightHandZ.toFixed(2)].join(':');
  });
  assert.equal(new Set(signatures).size, tags.length);
});

test('carry and hand-over poses keep the hands forward and deliberate', () => {
  const carry = sampleAvatarMotion(state('carry', 0.2));
  const handOver = sampleAvatarMotion(state('hand_over', 0.2));
  assert.ok(carry.leftHandZ < -0.12 && carry.rightHandZ < -0.12);
  assert.ok(handOver.rightHandZ < carry.rightHandZ);
  assert.ok(handOver.rightArmPitch < carry.rightArmPitch);
});

test('idle includes subtle breathing but never large limb swings', () => {
  const idle = sampleAvatarMotion(state('idle', 0.9));
  assert.ok(Math.abs(idle.breath) <= 0.012);
  assert.ok(Math.abs(idle.leftArmPitch) < 0.08);
  assert.ok(Math.abs(idle.rightArmPitch) < 0.08);
});

test('cycling, scooter and kayak poses communicate transport instead of reusing walk', () => {
  const cycling = sampleAvatarMotion({ action: 'cycle', elapsedSeconds: 0.35, speed: 5 });
  const scooter = sampleAvatarMotion({ action: 'scooter', elapsedSeconds: 0.35, speed: 7 });
  const kayak = sampleAvatarMotion({ action: 'kayak', elapsedSeconds: 0.35, speed: 2 });
  assert.ok(Math.abs(cycling.leftLegPitch) > 0.25);
  assert.ok(cycling.leftArmPitch < -0.4 && cycling.rightArmPitch < -0.4);
  assert.ok(scooter.leftArmPitch < -0.35 && scooter.rightArmPitch < -0.35);
  assert.ok(Math.abs(kayak.torsoYaw) > 0.02 || Math.abs(kayak.leftArmPitch - kayak.rightArmPitch) > 0.1);
});

test('social and quiet-life animation hooks are distinct', () => {
  const wave = sampleAvatarMotion({ action: 'wave', elapsedSeconds: 0.35, speed: 0 });
  const highFive = sampleAvatarMotion({ action: 'high_five', elapsedSeconds: 0.35, speed: 0 });
  const typing = sampleAvatarMotion({ action: 'type', elapsedSeconds: 0.35, speed: 0 });
  assert.ok(wave.rightHandY > 0.2);
  assert.ok(highFive.rightHandY > 0.35);
  assert.ok(Math.abs(typing.leftHandX - typing.rightHandX) > 0.2);
});
