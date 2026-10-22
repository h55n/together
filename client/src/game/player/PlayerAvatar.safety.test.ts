import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { PlayerAvatar } from './PlayerAvatar';

test('actual local and remote avatar equipment follows transport and releases reparented wearables', () => {
  for (const firstPerson of [true, false]) {
    const avatar = new PlayerAvatar();
    avatar.setFirstPerson(firstPerson);
    avatar.setTransportMode('kayak');
    const vest = avatar.root.getObjectByName('avatar:safety:life-jacket')!;
    const helmet = avatar.root.getObjectByName('avatar:safety:scooter-helmet')!;
    assert.equal(vest.visible, true);
    assert.equal(helmet.visible, false);
    assert.equal(helmet.parent, avatar.head);
    avatar.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(vest);
    assert.ok(bounds.max.y > bounds.min.y + 0.3);
    assert.ok(bounds.max.y < avatar.head.getWorldPosition(new THREE.Vector3()).y + 0.1);
    avatar.setTransportMode('scooter');
    assert.equal(vest.visible, false);
    assert.equal(helmet.visible, true);
    assert.equal(avatar.head.visible, !firstPerson);
    avatar.setTransportMode('on_foot');
    assert.equal(vest.visible, false);
    assert.equal(helmet.visible, false);
    avatar.dispose(); avatar.dispose();
    assert.equal(vest.parent, null);
    assert.equal(helmet.parent, null);
    assert.equal(vest.children.length, 0);
    assert.equal(helmet.children.length, 0);
  }
});
