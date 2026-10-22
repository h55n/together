import * as THREE from 'three';
import { createAmayaBayPatrolPath, planAmayaBaySurfacePath, locationAnchor, scheduleActionAt, cityHeightAt, type SurfacePoint } from '@together/shared';
import { namedNpcs } from '@together/content';

const CLOTHING = [0x6c6958, 0x466a67, 0x925f4f, 0x586a7b, 0x756948, 0x4e7351, 0x7d665f, 0x536879, 0x9b6b55, 0x645d7a];

type ActorRig = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
};

export class NamedNPCSystem {
  readonly root = new THREE.Group();
  private elapsedSeconds = 0;
  private readonly actors = namedNpcs.map((definition, index) => {
    const rig = createActor(CLOTHING[index % CLOTHING.length]!);
    rig.root.name = `named-npc:${definition.id}`;
    rig.root.userData.npcId = definition.id;
    rig.root.userData.displayName = definition.displayName;
    this.root.add(rig.root);
    const anchor = locationAnchor(definition.homeOrWork);
    const patrol = anchor
      ? createAmayaBayPatrolPath(anchor.position, 20 + (index % 4) * 4, index % 2 === 0 ? 1 : -1)
      : [];
    const phase = index * 0.83;
    const initial = samplePingPongPath(patrol, phase * 3);
    const base = { x: (anchor?.position.x ?? 0) + Math.sin(phase * 2.2) * 2.4, z: (anchor?.position.z ?? 0) + Math.cos(phase * 1.7) * 2.4 };
    const motion: ResidentMotion = {
      initialized: false, mobile: false, position: { ...base }, base,
      patrolPoint: initial?.point ?? { ...base }, nextIndex: initial?.nextIndex ?? 1,
      direction: initial?.direction ?? 1, connector: [], connectorIndex: 0,
      blocked: false, moved: 0, desiredYaw: initial?.yaw ?? phase,
    };
    return { definition, ...rig, phase, patrol, motion };
  });

  constructor(private readonly canTraverse?: (from: SurfacePoint, to: SurfacePoint) => boolean) {
    this.root.name = 'named-npcs';
  }

  update(deltaSeconds: number, gameMinutes: number, playerPosition: THREE.Vector3): void {
    const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    this.elapsedSeconds += delta;
    const time = this.elapsedSeconds;

    for (const entry of this.actors) {
      const anchor = locationAnchor(entry.definition.homeOrWork);
      if (!anchor) {
        entry.root.visible = false;
        continue;
      }

      const action = scheduleActionAt(entry.definition.schedule, gameMinutes);
      if (action === 'off_schedule') {
        entry.root.visible = false;
        continue;
      }

      const mobile = isMobileScheduleAction(action) && entry.patrol.length >= 2;
      const motion = entry.motion;
      if (!motion.initialized) {
        const spawn = mobile ? motion.patrolPoint : motion.base;
        motion.position.x = spawn.x;
        motion.position.z = spawn.z;
        motion.mobile = mobile;
        motion.initialized = true;
        entry.root.rotation.y = mobile ? motion.desiredYaw : entry.phase;
      } else if (motion.mobile !== mobile) {
        // Route once on schedule change, retaining the saved patrol cursor.
        const destination = mobile ? motion.patrolPoint : motion.base;
        const route = planAmayaBaySurfacePath(motion.position, destination);
        motion.connector = route?.points ?? [];
        motion.connectorIndex = 1;
        motion.blocked = route === null;
        motion.mobile = mobile;
      }
      const obstructionBlocked = advanceResident(motion, entry.patrol, delta * 0.75, this.canTraverse);
      const x = motion.position.x, z = motion.position.z;
      entry.root.position.set(x, cityHeightAt(x, z), z);
      const desiredYaw = motion.moved > 0.000001 ? motion.desiredYaw : entry.root.rotation.y;
      const turn = normalizeAngle(desiredYaw - entry.root.rotation.y);
      entry.root.rotation.y += THREE.MathUtils.clamp(turn, -2.8 * delta, 2.8 * delta);
      const walking = motion.moved > 0.000001;
      entry.root.userData.scheduleAction = action;
      entry.root.userData.navigationMode = motion.blocked ? 'route_unavailable' : obstructionBlocked ? 'blocked' : walking ? mobile ? 'surface_patrol' : 'returning' : 'stationary';
      const distance = Math.hypot(playerPosition.x - x, playerPosition.z - z);
      entry.root.visible = distance < 135;
      if (!entry.root.visible) continue;

      const stride = walking ? Math.sin(time * 4.2 + entry.phase) * 0.42 : Math.sin(time * 1.1 + entry.phase) * 0.025;
      entry.leftArm.rotation.x = stride;
      entry.rightArm.rotation.x = -stride;
      entry.leftLeg.rotation.x = -stride * 0.9;
      entry.rightLeg.rotation.x = stride * 0.9;
      entry.torso.rotation.z = Math.sin(time * 2 + entry.phase) * (walking ? 0.015 : 0.006);
      entry.torso.position.y = Math.abs(Math.sin(time * (walking ? 4.2 : 1.1) + entry.phase)) * (walking ? 0.012 : 0.004);

      // Nearby named residents acknowledge the player's presence without snapping their whole body.
      const toPlayerX = playerPosition.x - x;
      const toPlayerZ = playerPosition.z - z;
      if (distance < 9 && Math.hypot(toPlayerX, toPlayerZ) > 0.001) {
        const worldYaw = Math.atan2(-toPlayerX, -toPlayerZ);
        const localYaw = normalizeAngle(worldYaw - entry.root.rotation.y);
        entry.head.rotation.y = THREE.MathUtils.clamp(localYaw, -0.58, 0.58);
      } else {
        entry.head.rotation.y *= Math.exp(-delta * 4);
      }
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
  }
}

type ResidentMotion = {
  initialized: boolean;
  mobile: boolean;
  position: SurfacePoint;
  base: SurfacePoint;
  patrolPoint: SurfacePoint;
  nextIndex: number;
  direction: number;
  connector: readonly SurfacePoint[];
  connectorIndex: number;
  blocked: boolean;
  moved: number;
  desiredYaw: number;
};

function advanceResident(motion: ResidentMotion, patrol: readonly SurfacePoint[], budget: number, canTraverse?: (from: SurfacePoint, to: SurfacePoint) => boolean): boolean {
  motion.moved = 0;
  if (motion.blocked || budget <= 0) return false;
  // Consume actual cached segments, including corners. No path rebuild or
  // sampled global-time target, segment array or temporary point per frame.
  let emptySegments = 0;
  while (budget > 0.000001) {
    const connecting = motion.connectorIndex < motion.connector.length;
    if (!connecting && (!motion.mobile || patrol.length < 2)) break;
    const target = connecting ? motion.connector[motion.connectorIndex]! : patrol[motion.nextIndex]!;
    const dx = target.x - motion.position.x, dz = target.z - motion.position.z;
    const remaining = Math.hypot(dx, dz);
    const moved = Math.min(budget, remaining);
    if (remaining > 0.000001) {
      if (canTraverse && !canTraverse(motion.position, { x: motion.position.x + dx / remaining * moved, z: motion.position.z + dz / remaining * moved })) return true;
      motion.position.x += dx / remaining * moved;
      motion.position.z += dz / remaining * moved;
      motion.desiredYaw = Math.atan2(-dx, -dz);
      motion.moved += moved;
      budget -= moved;
      emptySegments = 0;
    } else if (++emptySegments > patrol.length + motion.connector.length) break;
    if (!connecting) {
      motion.patrolPoint.x = motion.position.x;
      motion.patrolPoint.z = motion.position.z;
    }
    if (remaining > moved + 0.000001) break;
    motion.position.x = target.x;
    motion.position.z = target.z;
    if (connecting) {
      motion.connectorIndex += 1;
    } else {
      if (motion.nextIndex === patrol.length - 1) motion.direction = -1;
      else if (motion.nextIndex === 0) motion.direction = 1;
      motion.nextIndex += motion.direction;
    }
  }
  return false;
}

function isMobileScheduleAction(action: string): boolean {
  return /courtyard|neighbourhood|nursery|community|open_cafe|close_cafe/.test(action);
}

function samplePingPongPath(
  points: readonly SurfacePoint[],
  travelledMetres: number,
): { point: SurfacePoint; yaw: number; nextIndex: number; direction: number } | null {
  if (points.length < 2) return null;
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.z - points[index - 1]!.z);
    segmentLengths.push(length);
    totalLength += length;
  }
  if (totalLength <= 1e-6) return null;

  const cycle = totalLength * 2;
  const wrapped = ((travelledMetres % cycle) + cycle) % cycle;
  const reverse = wrapped > totalLength;
  let targetDistance = reverse ? cycle - wrapped : wrapped;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index]!;
    if (targetDistance > length && index < segmentLengths.length - 1) {
      targetDistance -= length;
      continue;
    }
    const start = points[index]!;
    const end = points[index + 1]!;
    const t = length <= 1e-6 ? 0 : Math.min(1, targetDistance / length);
    const point = {
      x: start.x + (end.x - start.x) * t,
      z: start.z + (end.z - start.z) * t,
    };
    const dx = (end.x - start.x) * (reverse ? -1 : 1);
    const dz = (end.z - start.z) * (reverse ? -1 : 1);
    return { point, yaw: Math.atan2(-dx, -dz), nextIndex: reverse ? index : index + 1, direction: reverse ? -1 : 1 };
  }

  const final = points.at(-1)!;
  const previous = points.at(-2)!;
  const dx = (final.x - previous.x) * (reverse ? -1 : 1);
  const dz = (final.z - previous.z) * (reverse ? -1 : 1);
  return { point: { ...final }, yaw: Math.atan2(-dx, -dz), nextIndex: points.length - 2, direction: -1 };
}

function createActor(color: number): ActorRig {
  const root = new THREE.Group();
  const clothing = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa96f50, roughness: 0.84 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2f2825, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x343b3c, roughness: 0.9 });

  const torso = new THREE.Group();
  torso.name = 'npc:torso';
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 5, 8), clothing);
  torsoMesh.position.y = 1.12;
  torsoMesh.scale.z = 0.74;
  torso.add(torsoMesh);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.22), clothing);
  shoulders.position.y = 1.38;
  torso.add(shoulders);
  root.add(torso);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.24), dark);
  pelvis.position.y = 0.85;
  pelvis.name = 'npc:pelvis';
  root.add(pelvis);

  const head = new THREE.Group();
  head.name = 'npc:head';
  head.position.y = 1.66;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
  face.scale.set(0.88, 1.05, 0.94);
  head.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 0.055;
  head.add(hairCap);
  for (const eyeX of [-0.055, 0.055]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), hair);
    eye.position.set(eyeX, 0.02, -0.15);
    head.add(eye);
  }
  root.add(head);

  const leftArm = limbPivot('npc:left-arm', -0.31, 1.36);
  const rightArm = limbPivot('npc:right-arm', 0.31, 1.36);
  addArmSegments(leftArm, clothing, skin);
  addArmSegments(rightArm, clothing, skin);
  root.add(leftArm, rightArm);

  const leftLeg = limbPivot('npc:left-leg', -0.13, 0.84);
  const rightLeg = limbPivot('npc:right-leg', 0.13, 0.84);
  addLegSegments(leftLeg, dark);
  addLegSegments(rightLeg, dark);
  root.add(leftLeg, rightLeg);

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg };
}

function limbPivot(name: string, x: number, y: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(x, y, 0);
  return pivot;
}

function addArmSegments(pivot: THREE.Group, clothing: THREE.Material, skin: THREE.Material): void {
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 4, 7), clothing);
  upper.position.y = -0.18;
  pivot.add(upper);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.18, 4, 7), skin);
  forearm.position.y = -0.48;
  pivot.add(forearm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), skin);
  hand.position.y = -0.69;
  hand.scale.set(0.82, 1.05, 0.72);
  pivot.add(hand);
}

function addLegSegments(pivot: THREE.Group, material: THREE.Material): void {
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.24, 4, 7), material);
  thigh.position.y = -0.22;
  pivot.add(thigh);
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 7), material);
  shin.position.y = -0.55;
  pivot.add(shin);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.28), material);
  shoe.position.set(0, -0.76, -0.06);
  pivot.add(shoe);
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
