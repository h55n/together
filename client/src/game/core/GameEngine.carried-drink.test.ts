import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createActivityState, createCafeState } from '@together/shared';
import { GameEngine } from '../GameEngine';
import { PlayerAvatar } from '../player/PlayerAvatar';

function engineWith(avatar: PlayerAvatar, scene: THREE.Scene): GameEngine {
  return Object.assign(Object.create(GameEngine.prototype), {
    avatar, scene, disposed: false, localUserId: 'a',
    ambientLeisure: null, sports: null,
    carriedCafeStore: new Map<string, string | null>(),
    carriedDrinkState: null,
  }) as GameEngine;
}
const hydrate = (state: ReturnType<typeof createActivityState>) =>
  ({ id: 'cafe', activityId: 'cafe_hangout' as const, state, createdAt: '', updatedAt: '' });

describe('carried café drink hydration', () => {
  it('holds a served drink in hand and lowers it after the sip', () => {
    const avatar = new PlayerAvatar();
    const scene = new THREE.Scene();
    const engine = engineWith(avatar, scene);
    try {
      const cup = () => avatar.root.getObjectByName('avatar:prop:carried-drink');
      const state = { ...createActivityState('cafe_hangout', 'a'), revision: 1, cafe: createCafeState(['a']) };
      engine.syncAmbientActivities([hydrate(state)]);
      expect(cup()!.visible).toBe(false);
      state.cafe = { ...state.cafe, revision: 2, orders: [{ id: 'order-1', drink: 'chai', orderedBy: 'a', servedTo: 'a' }] };
      engine.upsertAmbientActivity(hydrate(state));
      expect(cup()!.visible).toBe(true);
      state.cafe = { ...state.cafe, revision: 3, orders: [{ id: 'order-1', drink: 'chai', orderedBy: 'a', servedTo: 'a', sippedBy: 'a' }] };
      engine.upsertAmbientActivity(hydrate(state));
      expect(cup()!.visible).toBe(false);
    } finally {
      avatar.dispose();
    }
  });

  it('drops the drink when a removed session was the last one carrying it', () => {
    const avatar = new PlayerAvatar();
    const scene = new THREE.Scene();
    const engine = engineWith(avatar, scene);
    try {
      const cup = () => avatar.root.getObjectByName('avatar:prop:carried-drink');
      const state = { ...createActivityState('cafe_hangout', 'a'), revision: 1, cafe: { ...createCafeState(['a']), orders: [{ id: 'order-1', drink: 'lemon_soda' as const, orderedBy: 'a', servedTo: 'a' }] } };
      engine.syncAmbientActivities([hydrate(state)]);
      expect(cup()!.visible).toBe(true);
      engine.syncAmbientActivities([]);
      expect(cup()!.visible).toBe(false);
    } finally {
      avatar.dispose();
    }
  });
});
