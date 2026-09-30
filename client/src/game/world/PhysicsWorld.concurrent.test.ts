import { expect, it } from 'vitest';
import { PhysicsWorld } from '../physics/PhysicsWorld';

it('keeps independently created worlds alive when overlapping startup is cancelled', async () => {
  const [a,b]=await Promise.all([PhysicsWorld.create(),PhysicsWorld.create()]);
  const first=a.createPlayer(), second=b.createPlayer();
  a.disposePlayer(first);a.dispose();
  expect(() => { b.step(); second.body.translation(); b.disposePlayer(second); b.dispose(); }).not.toThrow();
});
