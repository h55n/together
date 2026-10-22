import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { PlayerAvatar } from './PlayerAvatar';
import { COASTAL_WATERLINE_Y, KAYAK_PLAYER_SUPPORT_Y, sampleAvatarMotion } from '@together/shared';

test('kayak hands grip the paddle through strokes without stretching either arm', () => {
  for (const appearance of [{}, { height: 1.58, bodyWidthScale: 0.86 }, { height: 1.86, bodyWidthScale: 1.16 }]) {
    const avatar = new PlayerAvatar(appearance);
    try {
      avatar.setTransportMode('kayak');
      avatar.setTransform({ x: 13, y: KAYAK_PLAYER_SUPPORT_Y, z: -5 }, 0.7);
      const paddle = avatar.root.getObjectByName('transport:kayak-development')!.children[2]!;
      for (const speed of [0, 2.4, 0]) {
        for (let frame = 0; frame < 120; frame++) {
          avatar.updateMotion(1 / 60, 'kayak', { speed, directionX: 0, directionZ: 1 });
          avatar.root.updateMatrixWorld(true);
          for (const [side, x] of [['left', -0.35], ['right', 0.35]] as const) {
            const grip = paddle.localToWorld(new THREE.Vector3(x, 0, 0));
            const hand = avatar.hands[side].getWorldPosition(new THREE.Vector3());
            assert.ok(hand.distanceTo(grip) < 0.005, `${side} hand misses shaft by ${hand.distanceTo(grip)}`);
            const shoulder = avatar.root.getObjectByName(`avatar:${side}-shoulder`)!;
            const elbow = avatar.root.getObjectByName(`avatar:${side}-elbow`)!;
            assert.deepEqual(elbow.position.toArray(), [0, -0.38, 0]);
            assert.deepEqual(avatar.hands[side].position.toArray(), [0, -0.34, 0]);
            assert.ok(Number.isFinite(shoulder.quaternion.w));
          }
        }
      }
      avatar.setTransportMode('on_foot');
      for (let frame = 0; frame < 120; frame++) avatar.updateMotion(1 / 60, 'idle');
      for (const side of ['left', 'right']) {
        const shoulder = avatar.root.getObjectByName(`avatar:${side}-shoulder`)!;
        const elbow = avatar.root.getObjectByName(`avatar:${side}-elbow`)!;
        assert.ok(Math.abs(shoulder.rotation.y) < 1e-5);
        assert.ok(Math.abs(elbow.rotation.y) < 1e-5 && Math.abs(elbow.rotation.z) < 1e-5);
      }
    } finally { avatar.dispose(); }
  }
});

test('moving kayak strokes alternate paddle ends through the waterline', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.setTransportMode('kayak');
    avatar.setTransform({ x: 0, y: KAYAK_PLAYER_SUPPORT_Y, z: 0 }, 0);
    const paddle = avatar.root.getObjectByName('transport:kayak-development')!.children[2]!;
    const immersed = [false, false];
    for (let frame = 0; frame < 240; frame++) {
      avatar.updateMotion(1 / 60, 'kayak', { speed: 2.4, directionX: 0, directionZ: 1 });
      avatar.root.updateMatrixWorld(true);
      for (const [index, x] of [-1.1, 1.1].entries()) {
        if (paddle.localToWorld(new THREE.Vector3(x, 0, 0)).y < COASTAL_WATERLINE_Y) immersed[index] = true;
      }
    }
    assert.deepEqual(immersed, [true, true], 'Both ends must enter water during alternating strokes');
  } finally { avatar.dispose(); }
});

test('kayak hull floats along forward Z and the rider meets its seat', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.setTransportMode('kayak');
    avatar.setTransform({ x: 0, y: KAYAK_PLAYER_SUPPORT_Y, z: 0 }, 0);
    for (let frame = 0; frame < 120; frame++) avatar.updateMotion(1 / 60, 'kayak');
    avatar.root.updateMatrixWorld(true);
    const boat = avatar.root.getObjectByName('transport:kayak-development')!;
    const hull = new THREE.Box3().setFromObject(boat.children[0]!);
    assert.ok(hull.min.y < COASTAL_WATERLINE_Y && hull.max.y > COASTAL_WATERLINE_Y, 'Hull must straddle the rendered waterline');
    assert.ok(hull.max.z - hull.min.z > (hull.max.x - hull.min.x) * 3, 'Hull length follows forward Z');
    const seat = new THREE.Box3().setFromObject(boat.children[1]!);
    const pelvis = new THREE.Box3().setFromObject(avatar.root.getObjectByName('avatar:pelvis')!);
    assert.ok(Math.abs(pelvis.min.y - seat.max.y) < 0.015, 'Seated pelvis must meet seat top');
    assert.ok(avatar.root.getObjectByName('avatar:left-hip')!.rotation.x > 1, 'Legs extend forward from seated hips');
    const seatedEyes = avatar.eyeHeight;
    avatar.setTransportMode('on_foot');
    assert.ok(avatar.eyeHeight > seatedEyes + 0.3, 'First-person eyes follow the seated body offset');
  } finally { avatar.dispose(); }
});

test('ground vehicle wheels meet the avatar support plane', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.setTransform({ x: 0, y: 0.87, z: 0 }, 0);
    avatar.root.updateMatrixWorld(true);
    for (const name of ['bicycle', 'scooter', 'auto-rickshaw']) {
      const vehicle = avatar.root.getObjectByName(`transport:${name}-development`)!;
      const bounds = new THREE.Box3().setFromObject(vehicle);
      assert.ok(bounds.min.y > -0.03 && bounds.min.y < 0.04, `${name} bottom ${bounds.min.y}`);
    }
  } finally { avatar.dispose(); }
});

test('garment body leaves room for the neck and face', () => {
  const avatar = new PlayerAvatar();
  try {
    const body = avatar.torso.children.find(object => object instanceof THREE.Mesh)!;
    assert.ok(body);
    const bounds = new THREE.Box3().setFromObject(body);
    assert.ok(bounds.max.y <= 1.53, 'Shirt must stop below the face and neck');
    assert.ok(bounds.min.y <= 0.9 && bounds.min.y >= 0.8, 'Shirt must join the waist');
  } finally { avatar.dispose(); }
});

test('animated soles stay above support through directional strides and idle transitions', () => {
  for (const [directionX, directionZ] of [[0, 1], [0, -1], [1, 0], [-1, 0], [Math.SQRT1_2, Math.SQRT1_2]] as const) {
    const avatar = new PlayerAvatar();
    try {
      for (const action of ['walk', 'jog', 'idle'] as const) {
        for (let frame = 0; frame < 180; frame++) {
          avatar.updateMotion(1 / 60, action, { speed: action === 'jog' ? 3.2 : action === 'walk' ? 1.6 : 0, directionX, directionZ });
          avatar.root.updateMatrixWorld(true);
          for (const side of ['left', 'right']) {
            const sole = new THREE.Box3().setFromObject(avatar.root.getObjectByName(`avatar:${side}-shoe`)!);
            assert.ok(sole.min.y >= -1e-5, `${action} ${directionX},${directionZ} ${side} sole penetrated ${sole.min.y}`);
          }
        }
      }
    } finally { avatar.dispose(); }
  }
});

for (const [beforeAction, afterAction, beforeFrequency, afterFrequency] of [
  ['walk', 'jog', 6.8, 7.8], ['jog', 'walk', 7.8, 6.8],
] as const) {
  test(`${beforeAction} to ${afterAction} retains stride phase while changing cadence`, () => {
    const avatar = new PlayerAvatar();
    try {
      avatar.updateMotion(0.95, beforeAction);
      const shoulder = avatar.root.getObjectByName('avatar:right-shoulder')!;
      const before = shoulder.rotation.x;
      const phase = beforeFrequency * 0.95 + afterFrequency * 0.1;
      const target = sampleAvatarMotion({ action: afterAction, elapsedSeconds: phase / afterFrequency, speed: afterAction === 'jog' ? 3.2 : 1.6 });
      const expected = before + (target.rightArmPitch - before) * (1 - Math.exp(-0.1 * 16));
      avatar.updateMotion(0.1, afterAction);
      assert.ok(Math.abs(shoulder.rotation.x - expected) < 1e-6, 'Changing speed must not reset the stride cycle');
    } finally { avatar.dispose(); }
  });
}

test('an invalid movement speed cannot poison later gait poses', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.updateMotion(0.1, 'walk', { speed: NaN, directionX: 0, directionZ: 1 });
    avatar.updateMotion(0.1, 'walk', { speed: 1.6, directionX: 0, directionZ: 1 });
    avatar.root.traverse(object => assert.ok(Number.isFinite(object.rotation.x) && Number.isFinite(object.rotation.z)));
  } finally { avatar.dispose(); }
});

test('task gestures start from their own phase after waiting in the world', () => {
  const fresh = new PlayerAvatar(), waiting = new PlayerAvatar();
  try {
    waiting.updateMotion(2.713, 'idle');
    for (let frame = 0; frame < 90; frame++) {
      fresh.updateMotion(1 / 60, 'cut'); waiting.updateMotion(1 / 60, 'cut');
    }
    for (const joint of ['left-shoulder', 'right-shoulder', 'left-elbow', 'right-elbow']) {
      const a = fresh.root.getObjectByName(`avatar:${joint}`)!;
      const b = waiting.root.getObjectByName(`avatar:${joint}`)!;
      assert.ok(Math.abs(a.rotation.x - b.rotation.x) < 1e-6, `${joint} depends on time spent waiting`);
    }
  } finally { fresh.dispose(); waiting.dispose(); }
});

test('garment weave has separate colour/height sampling and releases its textures once', () => {
  const avatar = new PlayerAvatar();
  const torso = avatar.root.getObjectByName('avatar:left-upper-arm') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const trousers = avatar.root.getObjectByName('avatar:left-thigh') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const textures = new Set([torso.material.map, torso.material.bumpMap, trousers.material.map, trousers.material.bumpMap]);
  assert.equal(textures.size, 4);
  assert.equal(torso.material.map?.colorSpace, THREE.SRGBColorSpace);
  assert.equal(torso.material.bumpMap?.colorSpace, THREE.NoColorSpace);
  const disposed = new Map<THREE.Texture, number>();
  for (const texture of textures) texture!.addEventListener('dispose', () => disposed.set(texture!, (disposed.get(texture!) ?? 0) + 1));
  avatar.dispose(); avatar.dispose();
  assert.equal(disposed.size, 4);
  assert.ok([...disposed.values()].every(count => count === 1));
});

test('neutral shoe soles meet the physical capsule support baseline', () => {
  const avatar = new PlayerAvatar();
  try {
    avatar.setTransform({ x: 0, y: 0.87, z: 0 }, 0);
    avatar.root.updateMatrixWorld(true);
    for (const side of ['left', 'right']) {
      const shoe = avatar.root.getObjectByName(`avatar:${side}-shoe`)!;
      const bounds = new THREE.Box3().setFromObject(shoe);
      assert.ok(Math.abs(bounds.min.y) < 1e-6, `Sole at ${bounds.min.y}`);
    }
  } finally { avatar.dispose(); }
});

test('builds an articulated embodied rig with elbows, knees and a first-person-safe head', () => {
  const avatar = new PlayerAvatar();
  try {
    assert.ok(avatar.root.getObjectByName('avatar:left-elbow'));
    assert.ok(avatar.root.getObjectByName('avatar:right-elbow'));
    assert.ok(avatar.root.getObjectByName('avatar:left-knee'));
    assert.ok(avatar.root.getObjectByName('avatar:right-knee'));
    assert.ok(avatar.root.getObjectByName('avatar:pelvis'));
    assert.ok(avatar.head.children.every(child => child.position.y < 0.4), 'face parts must remain local to the neck pivot');

    avatar.setFirstPerson(true);
    assert.equal(avatar.head.visible, false);
    avatar.setFirstPerson(false);
    assert.equal(avatar.head.visible, true);

    avatar.updateMotion(0.2, 'sit');
    const leftKnee = avatar.root.getObjectByName('avatar:left-knee');
    const rightKnee = avatar.root.getObjectByName('avatar:right-knee');
    assert.ok(Math.abs(leftKnee?.rotation.x ?? 0) > 0.5);
    assert.ok(Math.abs(rightKnee?.rotation.x ?? 0) > 0.5);

    avatar.updateMotion(0.1, 'cut');
    assert.equal(avatar.root.getObjectByName('avatar:prop:knife')?.visible, true);
    assert.equal(avatar.root.getObjectByName('avatar:prop:produce')?.visible, true);

    avatar.updateMotion(0.1, 'wash');
    assert.equal(avatar.root.getObjectByName('avatar:prop:knife')?.visible, false);
    assert.equal(avatar.root.getObjectByName('avatar:prop:dish')?.visible, true);
    assert.equal(avatar.root.getObjectByName('avatar:prop:sponge')?.visible, true);
  } finally {
    avatar.dispose();
  }
});

test('renders authored face, hairstyle, facial hair and glasses choices as separate avatar details', () => {
  const avatar = new PlayerAvatar({
    faceBase: 'face_03', hair: 'hair_04', facialHair: 'beard_short', glasses: 'glasses_round',
    hairColor: '#24170f',
  });
  try {
    for (const name of [
      'avatar:face:eye-white-left', 'avatar:face:iris-left', 'avatar:face:mouth',
      'avatar:hair:fringe', 'avatar:hair:back', 'avatar:facial-hair:beard',
      'avatar:glasses:left-lens', 'avatar:glasses:right-lens',
      'avatar:left-hand:finger-1', 'avatar:right-hand:thumb', 'avatar:shirt:collar',
    ]) assert.ok(avatar.root.getObjectByName(name), `Missing ${name}`);
    const plain = new PlayerAvatar({ hair: 'hair_01', faceBase: 'face_01' });
    try {
      assert.notDeepEqual(
        new THREE.Box3().setFromObject(avatar.root.getObjectByName('avatar:hair:fringe')!).getSize(new THREE.Vector3()).toArray(),
        new THREE.Box3().setFromObject(plain.root.getObjectByName('avatar:hair:fringe')!).getSize(new THREE.Vector3()).toArray(),
        'selected hair ids should produce distinct silhouettes',
      );
      assert.equal(plain.root.getObjectByName('avatar:facial-hair:beard'), undefined);
      assert.equal(plain.root.getObjectByName('avatar:glasses:left-lens'), undefined);
    } finally { plain.dispose(); }
  } finally { avatar.dispose(); }
});

test('blinks periodically and opens a small smile for social actions', () => {
  const avatar = new PlayerAvatar();
  try {
    const eye = avatar.root.getObjectByName('avatar:face:eye-white-left') as THREE.Mesh;
    const mouth = avatar.root.getObjectByName('avatar:face:mouth-open') as THREE.Mesh;
    avatar.updateMotion(0.08, 'idle');
    const blinkScale = eye.scale.y;
    avatar.updateMotion(0.5, 'idle');
    const openScale = eye.scale.y;
    assert.ok(blinkScale < openScale, `blink ${blinkScale} should close below open ${openScale}`);
    avatar.updateMotion(0.1, 'laugh');
    assert.equal(mouth.visible, true);
    avatar.updateMotion(0.1, 'idle');
    assert.equal(mouth.visible, false);
  } finally { avatar.dispose(); }
});

test('home, outdoor, sleep and job uniforms have distinct authored garment silhouettes', () => {
  const home = new PlayerAvatar({ outfitContext: 'home', outfitId: 'home_sage' });
  const outdoor = new PlayerAvatar({ outfitContext: 'outdoor', outfitId: 'outdoor_terracotta' });
  const sleep = new PlayerAvatar({ outfitContext: 'sleep', outfitId: 'sleep_soft' });
  const work = new PlayerAvatar({ outfitContext: 'work', outfitId: 'job_cafe_barista' });
  try {
    const sleeveHeight = (avatar: PlayerAvatar) => (avatar.root.getObjectByName('avatar:left-upper-arm') as THREE.Mesh<THREE.CapsuleGeometry>).geometry.parameters.height;
    assert.ok(sleeveHeight(home) < sleeveHeight(outdoor));
    assert.ok(sleeveHeight(outdoor) < sleeveHeight(sleep));
    assert.ok(work.root.getObjectByName('avatar:outfit:work:apron-front'));
    assert.ok(home.root.getObjectByName('avatar:outfit:home:hem'));
    assert.ok(outdoor.root.getObjectByName('avatar:outfit:outdoor:layer'));
    assert.ok(sleep.root.getObjectByName('avatar:outfit:sleep:top'));
  } finally { home.dispose(); outdoor.dispose(); sleep.dispose(); work.dispose(); }
});

test('releases every owned body, action and transport material exactly once on disposal', () => {
  const avatar = new PlayerAvatar();
  const materials = new Set<THREE.Material>();
  avatar.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of entries) materials.add(material);
  });
  const released = new Map<THREE.Material, number>();
  for (const material of materials) material.addEventListener('dispose', () => released.set(material, (released.get(material) ?? 0) + 1));
  avatar.dispose();
  assert.equal(released.size, materials.size, 'transport materials must not leak when avatars are replaced');
  assert.ok([...released.values()].every(count => count === 1));
  avatar.dispose();
  assert.ok([...released.values()].every(count => count === 1), 'disposal must be idempotent');
});
