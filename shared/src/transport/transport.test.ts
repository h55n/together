import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTransportHeading, advanceTransportSpeed, constrainKayakMovement, isInsideKayakWater, KAYAK_LAUNCH_POSITION, KAYAK_RETURN_POSITION, TRANSPORT_PROFILES } from './transport.js';

test('bicycle and scooter have calm city-scale speed caps rather than racing speeds', () => {
  assert.ok(TRANSPORT_PROFILES.bicycle.maxSpeed >= 4.8 && TRANSPORT_PROFILES.bicycle.maxSpeed <= 6.2);
  assert.ok(TRANSPORT_PROFILES.scooter.maxSpeed > TRANSPORT_PROFILES.bicycle.maxSpeed);
  assert.ok(TRANSPORT_PROFILES.scooter.maxSpeed <= 10);
});

test('transport acceleration and braking are gradual and bounded', () => {
  let speed = 0;
  for (let i = 0; i < 200; i += 1) speed = advanceTransportSpeed('bicycle', speed, 1, false, 1 / 60);
  assert.ok(speed > 3 && speed <= TRANSPORT_PROFILES.bicycle.maxSpeed);
  const beforeBrake = speed;
  for (let i = 0; i < 20; i += 1) speed = advanceTransportSpeed('bicycle', speed, 0, true, 1 / 60);
  assert.ok(speed < beforeBrake);
  assert.ok(speed >= 0);
});


test('vehicle heading turns independently from camera look and only while moving', () => {
  const startYaw = 0.35;
  const stationary = advanceTransportHeading('bicycle', startYaw, 1, 0, 1 / 30);
  assert.equal(stationary, startYaw);

  const moving = advanceTransportHeading('bicycle', startYaw, 1, 4.5, 1 / 30);
  assert.ok(moving < startYaw);

  const opposite = advanceTransportHeading('bicycle', startYaw, -1, 4.5, 1 / 30);
  assert.ok(opposite > startYaw);

  const auto = advanceTransportHeading('auto_rickshaw', startYaw, 1, 9, 1);
  assert.equal(auto, startYaw);
});


test('kayak traversal stays inside the authored Bay water and launches/returns at safe sides of shore', () => {
  assert.equal(isInsideKayakWater(KAYAK_LAUNCH_POSITION), true);
  assert.equal(isInsideKayakWater(KAYAK_RETURN_POSITION), false);

  const northEdge = { x: 135, z: -344 };
  const blockedLandward = constrainKayakMovement(northEdge, { x: 0, z: 8 });
  assert.equal(blockedLandward.z, 0);

  const nearWestEdge = { x: -209, z: -400 };
  const clampedWest = constrainKayakMovement(nearWestEdge, { x: -12, z: 0 });
  assert.equal(nearWestEdge.x + clampedWest.x, -210);

  const openWater = { x: 135, z: -390 };
  const free = constrainKayakMovement(openWater, { x: 2, z: -3 });
  assert.deepEqual(free, { x: 2, z: -3 });
});
