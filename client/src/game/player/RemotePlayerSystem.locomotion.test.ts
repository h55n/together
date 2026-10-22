import assert from 'node:assert/strict';
import test from 'node:test';
import { RemotePlayerSystem } from '../network/RemotePlayerSystem';
import type { PlayerSnapshot } from '@together/shared';

const snapshot: PlayerSnapshot = { seq: 0, sentAt: 0, position: { x: 0, y: 1.1, z: 0 }, yaw: 0, animation: 'walk', transport: 'walking' };

test('a stationary remote walk snapshot does not step in place', () => {
  const remotes = new RemotePlayerSystem();
  try {
    remotes.applySnapshot('friend', snapshot);
    remotes.update(0.2);
    assert.equal(remotes.root.getObjectByName('avatar:left-hip')!.rotation.x, 0);
  } finally { remotes.dispose(); }
});

test('remote lateral movement uses the same directional gait as the local player', () => {
  const remotes = new RemotePlayerSystem();
  try {
    remotes.applySnapshot('friend', snapshot);
    remotes.applySnapshot('friend', { ...snapshot, seq: 1, position: { x: 0.32, y: 1.1, z: 0 } });
    remotes.update(0.2);
    const leg = remotes.root.getObjectByName('avatar:left-hip')!;
    assert.ok(Math.abs(leg.rotation.z) > 0.05);
    assert.ok(Math.abs(leg.rotation.x) < 0.01);
  } finally { remotes.dispose(); }
});
