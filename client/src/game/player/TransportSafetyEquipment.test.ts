import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { TransportSafetyEquipment, type TransportSafetyMode } from './TransportSafetyEquipment';

test('life jacket is a rounded wearable vest with chest coverage and shoulder straps', () => {
  const equipment = new TransportSafetyEquipment();
  try {
    const vest = equipment.lifeJacket;
    assert.ok(vest.getObjectByName('avatar:safety:life-jacket:front-left'));
    assert.ok(vest.getObjectByName('avatar:safety:life-jacket:front-right'));
    assert.ok(vest.getObjectByName('avatar:safety:life-jacket:shoulder-strap-left'));
    assert.ok(vest.getObjectByName('avatar:safety:life-jacket:buckle-upper'));
    vest.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(vest);
    assert.ok(bounds.min.y >= -0.31 && bounds.max.y <= 0.31, `vest height ${bounds.min.y}..${bounds.max.y}`);
    assert.ok(bounds.min.x >= -0.25 && bounds.max.x <= 0.25, `vest width ${bounds.min.x}..${bounds.max.x}`);
    assert.ok(bounds.min.z < -0.19 && bounds.max.z > 0.15, 'vest wraps the avatar torso front and back');
  } finally {
    equipment.dispose();
  }
});

test('scooter helmet forms a shallow dome above the eye line without a forward visor', () => {
  const equipment = new TransportSafetyEquipment();
  try {
    const shell = equipment.helmet.getObjectByName('avatar:safety:scooter-helmet:shell') as THREE.Mesh;
    assert.ok(shell);
    assert.ok(equipment.helmet.getObjectByName('avatar:safety:scooter-helmet:retention-band'));
    equipment.helmet.updateMatrixWorld(true);
    const shellBounds = new THREE.Box3().setFromObject(shell);
    const bounds = new THREE.Box3().setFromObject(equipment.helmet);
    assert.ok(shellBounds.min.y > 0.2, `helmet shell bottom ${shellBounds.min.y} stays above the eyes`);
    assert.ok(bounds.max.y < 0.45, `helmet top ${bounds.max.y} fits above the head`);
    assert.ok(bounds.min.z > -0.21, `helmet does not protrude into forward view (${bounds.min.z})`);
  } finally {
    equipment.dispose();
  }
});

test('transport mode shows only the safety equipment suited to that ride', () => {
  const equipment = new TransportSafetyEquipment();
  try {
    const expected: Record<TransportSafetyMode, [boolean, boolean]> = {
      on_foot: [false, false],
      bicycle: [false, false],
      scooter: [false, true],
      kayak: [true, false],
      auto_rickshaw: [false, false],
    };
    for (const [mode, [lifeJacket, helmet]] of Object.entries(expected) as [TransportSafetyMode, [boolean, boolean]][]) {
      equipment.setMode(mode);
      assert.equal(equipment.lifeJacket.visible, lifeJacket, `${mode} life jacket visibility`);
      assert.equal(equipment.helmet.visible, helmet, `${mode} helmet visibility`);
    }
    equipment.setMode('kayak');
    equipment.setMode('scooter');
    assert.equal(equipment.lifeJacket.visible, false, 'stale life jacket hides when switching to scooter');
    assert.equal(equipment.helmet.visible, true);
  } finally {
    equipment.dispose();
  }
});

test('dispose releases each owned geometry and material once and is idempotent', () => {
  const equipment = new TransportSafetyEquipment();
  const avatarBody = new THREE.Group();
  const avatarHead = new THREE.Group();
  avatarBody.name = 'avatar:body';
  avatarHead.name = 'avatar:head';
  avatarBody.add(equipment.lifeJacketRoot);
  avatarHead.position.y = 1.53;
  avatarHead.add(equipment.helmetRoot);
  equipment.lifeJacketRoot.position.set(0, 1.18, 0);
  equipment.setMode('kayak');
  avatarBody.updateMatrixWorld(true);
  avatarHead.updateMatrixWorld(true);
  const vestWorldBounds = new THREE.Box3().setFromObject(equipment.lifeJacketRoot);
  const helmetShell = equipment.helmetRoot.getObjectByName('avatar:safety:scooter-helmet:shell')!;
  const helmetShellWorldBounds = new THREE.Box3().setFromObject(helmetShell);
  assert.ok(vestWorldBounds.min.y > 0.85 && vestWorldBounds.max.y < 1.5, 'vest sits over avatar torso in body space');
  assert.ok(helmetShellWorldBounds.min.y > 1.7 && helmetShellWorldBounds.max.y < 2, 'helmet shell sits above avatar eyes in head space');

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  equipment.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  const geometryDisposals = new Map<THREE.BufferGeometry, number>();
  const materialDisposals = new Map<THREE.Material, number>();
  for (const geometry of geometries) geometry.addEventListener('dispose', () => geometryDisposals.set(geometry, (geometryDisposals.get(geometry) ?? 0) + 1));
  for (const material of materials) material.addEventListener('dispose', () => materialDisposals.set(material, (materialDisposals.get(material) ?? 0) + 1));

  equipment.dispose();
  equipment.dispose();
  equipment.setMode('kayak');
  assert.equal(equipment.root.children.length, 0);
  assert.equal(avatarBody.getObjectByName('avatar:safety:life-jacket'), undefined);
  assert.equal(avatarHead.getObjectByName('avatar:safety:scooter-helmet'), undefined);
  assert.equal(equipment.lifeJacket.children.length, 0);
  assert.equal(equipment.helmet.children.length, 0);
  assert.equal(geometryDisposals.size, geometries.size);
  assert.equal(materialDisposals.size, materials.size);
  for (const count of geometryDisposals.values()) assert.equal(count, 1);
  for (const count of materialDisposals.values()) assert.equal(count, 1);
});
