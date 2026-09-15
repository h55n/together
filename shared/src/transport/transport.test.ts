import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTransportSpeed, TRANSPORT_PROFILES } from './transport.js';

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
