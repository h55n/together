import * as THREE from 'three';
import { AMAYA_BAY_CITY, AMAYA_BAY_VENUES, cityHeightAt, createSeededRandom, createAmayaBayPatrolPath, venueFrontApproach, type SurfacePoint } from '@together/shared';
import { AmbientCrowdLod, type AuthoredCrowdSource } from './AmbientCrowdLod';
import type { AmbientWalker } from './ambient-walker';

const SHOP_FRONTS = AMAYA_BAY_VENUES.map(venue => venueFrontApproach(venue));
const DOOR_REACH = 10;

function doorEndsFor(path: readonly SurfacePoint[]): Array<1 | -1> {
  const nearFront = (point: SurfacePoint | undefined) => !!point && SHOP_FRONTS.some(front => Math.hypot(front.x - point.x, front.z - point.z) < DOOR_REACH);
  return [...(nearFront(path.at(-1)) ? [1 as const] : []), ...(nearFront(path[0]) ? [-1 as const] : [])];
}

/** Limb ids baked into the body geometry; the vertex shader swings each about its joint. */
const LIMB = { torso: 0, leftLeg: 1, rightLeg: 2, leftArm: 3, rightArm: 4 } as const;
const MAX_DODGE = 0.6, AVOID_LOOKAHEAD = 1.8, AVOID_WIDTH = 0.9;
const HIP_PIVOT = -0.2, SHOULDER_PIVOT = 0.36, STRIDE_METRES = 1.35;

const BODY_HEIGHT = 1.03;
const HEAD_HEIGHT = 1.62;
const CULL_DISTANCE = 115;

// Distances are baked once; presentation never controls the patrol cursor.
function sampleWalkerPath(walker: AmbientWalker): number {
  if (walker.pathLength <= 0 || walker.path.length < 2) return walker.yaw;
  const reverse = walker.patrolDistance >= walker.pathLength;
  const distance = reverse ? walker.pathLength * 2 - walker.patrolDistance : walker.patrolDistance;
  let segment = 1;
  while (segment < walker.path.length - 1 && walker.lengths[segment]! < distance) segment++;
  const start = walker.path[segment - 1]!, end = walker.path[segment]!;
  const length = walker.lengths[segment]! - walker.lengths[segment - 1]!;
  const t = length > 0 ? (distance - walker.lengths[segment - 1]!) / length : 0;
  walker.position.x = start.x + (end.x - start.x) * t;
  walker.position.z = start.z + (end.z - start.z) * t;
  walker.direction = reverse ? -1 : 1;
  return Math.atan2(-(end.x - start.x) * walker.direction, -(end.z - start.z) * walker.direction);
}

function advanceGuardedWalker(walker: AmbientWalker, budget: number, canTraverse: (from: SurfacePoint, to: SurfacePoint) => boolean): boolean {
  if (walker.pathLength <= 0) return true;
  const cycle = walker.pathLength * 2;
  while (budget > 0.000001) {
    const cursor = walker.patrolDistance;
    const reverse = cursor >= walker.pathLength;
    let boundary = cycle;
    // Validate the actual cached segments, including corners and reversals;
    // a long frame must never test a straight shortcut across a curved path.
    for (const length of walker.lengths) {
      const candidate = reverse ? cycle - length : length;
      if (candidate > cursor + 0.000001 && candidate < boundary) boundary = candidate;
    }
    const used = Math.min(budget, boundary - cursor);
    const from = { x: walker.position.x, z: walker.position.z };
    walker.patrolDistance = (cursor + used) % cycle;
    sampleWalkerPath(walker);
    if (!canTraverse(from, walker.position)) {
      walker.patrolDistance = cursor;
      sampleWalkerPath(walker);
      return false;
    }
    budget -= used;
  }
  return true;
}

export class AmbientNPCSystem {
  readonly root = new THREE.Group();

  private readonly walkers: AmbientWalker[] = [];
  private elapsedSeconds = 0;
  private readonly blockedWalkerIndices: number[] = [];
  private readonly bodies: THREE.InstancedMesh;
  private readonly gait: THREE.InstancedBufferAttribute;
  private nodeBodyMaterial: THREE.Material | null = null;
  private disposed = false;
  private readonly heads: THREE.InstancedMesh;
  private lod: AmbientCrowdLod | null = null;
  private readonly lodRoot = new THREE.Group();
  /** Per-walker stand-in visibility for the frame; the authored LOD reuses it to pick candidates. */
  private readonly visibleFlags: Uint8Array;
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: true });
  private readonly skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, vertexColors: true });
  private readonly bodyMatrix = new THREE.Matrix4();
  private readonly headMatrix = new THREE.Matrix4();
  private readonly bodyPosition = new THREE.Vector3();
  private readonly headPosition = new THREE.Vector3();
  private readonly bodyQuaternion = new THREE.Quaternion();
  private readonly headingQuaternion = new THREE.Quaternion();
  private readonly tiltQuaternion = new THREE.Quaternion();
  private readonly visibleScale = new THREE.Vector3(1, 1, 1);
  private readonly hiddenScale = new THREE.Vector3(0, 0, 0);
  private readonly yAxis = new THREE.Vector3(0, 1, 0);
  private readonly zAxis = new THREE.Vector3(0, 0, 1);

  constructor(count = 32, private readonly canTraverse?: (from: SurfacePoint, to: SurfacePoint) => boolean, source?: AuthoredCrowdSource) {
    this.root.name = 'ambient-city-npcs-development';
    this.visibleFlags = new Uint8Array(count);
    // Optional proximity LOD: nearby walkers show the authored townies when the GLBs load.
    if (source) {
      this.lod = new AmbientCrowdLod(source);
      this.lodRoot.name = 'ambient-npcs-authored';
      this.root.add(this.lodRoot);
      void this.lod.attach().catch(() => undefined);
    }
    // WebGL limb swing; renderers that skip onBeforeCompile simply show the standing pose.
    this.bodyMaterial.onBeforeCompile = injectLimbSwing;
    this.root.userData.blockedWalkerIndices = this.blockedWalkerIndices;

    this.bodies = new THREE.InstancedMesh(
      createWalkerBodyGeometry(),
      this.bodyMaterial,
      count,
    );
    this.bodies.name = 'ambient-npc-bodies';
    this.bodies.castShadow = true;
    // Shadows follow the same limb swing as the visible body.
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = injectLimbSwing;
    this.bodies.customDepthMaterial = depth;
    this.bodies.frustumCulled = false;
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.gait = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
    this.gait.setUsage(THREE.DynamicDrawUsage);
    this.bodies.geometry.setAttribute('gait', this.gait);

    this.heads = new THREE.InstancedMesh(
      createWalkerHeadGeometry(),
      this.skinMaterial,
      count,
    );
    this.heads.name = 'ambient-npc-heads';
    this.heads.castShadow = true;
    this.heads.frustumCulled = false;
    this.heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.root.add(this.bodies, this.heads);

    // A lively seaside palette: whites, saris and bright kurtas rather than muted greys.
    const clothing = [0xf3efe6, 0xd2453a, 0xe9b949, 0x3f7fc4, 0x4e9a6a, 0xd97aa6, 0x7c5cc4, 0xf08a4b, 0x2f4f7a, 0xc9d8e8];
    const skinTones = [0xf1c8a6, 0xd9a07a, 0xb7795a, 0x8d5a3f, 0x6b402c];
    const random = createSeededRandom(918273);
    for (let i = 0; i < count; i += 1) {
      const district = AMAYA_BAY_CITY.districts[i % AMAYA_BAY_CITY.districts.length]!;
      const extent = 20 + random() * Math.min(52, district.radius * 0.42);
      const offsetX = (random() - 0.5) * district.radius * 0.52;
      const offsetZ = (random() - 0.5) * district.radius * 0.52;
      // The promenade and Lantern Street carry the evening crowd; the rest spread across districts.
      const focus = crowdFocus(i, count, random);
      const centerX = focus?.x ?? district.center.x + offsetX;
      const centerZ = focus?.z ?? district.center.z + offsetZ;
      const along = (random() - 0.5) * extent * 2;
      const path = createAmayaBayPatrolPath({ x: centerX, z: centerZ }, extent * 2, i % 2 === 0 ? 1 : -1);
      const lengths = [0];
      for (let segment = 1; segment < path.length; segment++) lengths.push(lengths[segment - 1]! + Math.hypot(path[segment]!.x - path[segment - 1]!.x, path[segment]!.z - path[segment - 1]!.z));
      const pathLength = lengths.at(-1) ?? 0;
      const x = path[0]?.x ?? centerX, z = path[0]?.z ?? centerZ;
      const walker: AmbientWalker = {
        position: new THREE.Vector3(x, cityHeightAt(x, z), z),
        // Some people in busy places simply linger: chatting, watching the water.
        speed: focus && i % 6 === 5 ? 0 : 0.68 + random() * 0.72,
        path,
        lengths,
        pathLength,
        direction: random() > 0.5 ? 1 : -1,
        phase: random() * Math.PI * 2,
        patrolDistance: 0,
        yaw: 0,
        stride: random() * Math.PI * 2,
        swing: 0,
        dodge: 0,
        doorEnds: doorEndsFor(path),
        indoorsUntil: 0,
        lastDirection: 1,
      };
      walker.patrolDistance = pathLength > 0 ? ((along / (extent * 2) + 0.5) * pathLength + (walker.direction === -1 ? pathLength : 0)) : 0;
      walker.yaw = sampleWalkerPath(walker);
      walker.lastDirection = walker.direction;
      walker.position.y = cityHeightAt(walker.position.x, walker.position.z);
      this.walkers.push(walker);
      this.bodies.setColorAt(i, new THREE.Color(clothing[Math.floor(random() * clothing.length)]!));
      this.heads.setColorAt(i, new THREE.Color(skinTones[Math.floor(random() * skinTones.length)]!));
      this.writeWalkerMatrices(i, walker, true, 0);
    }

    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }

  /** `shelter` 0..1: in heavy rain most people are indoors; patrols keep advancing out of sight. */
  update(deltaSeconds: number, playerPosition: THREE.Vector3, shelter = 0): void {
    const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    this.elapsedSeconds += dt;
    const now = this.elapsedSeconds;
    this.blockedWalkerIndices.length = 0;
    for (let index = 0; index < this.walkers.length; index += 1) {
      const walker = this.walkers[index]!;
      // Someone who stepped into a shop stays inside for a while, then comes back out the same door.
      if (walker.indoorsUntil > now) {
        walker.swing = 0;
        this.gait.setXY(index, walker.stride, 0);
        this.writeWalkerMatrices(index, walker, false, now);
        continue;
      }
      const beforeX = walker.position.x, beforeZ = walker.position.z;
      // Presentation distance may hide an actor, never change their physical
      // speed or pause their deterministic patrol. Reflect analytically so a
      // longer frame also stays inside the original patrol endpoints.
      if (this.canTraverse) {
        if (!advanceGuardedWalker(walker, walker.speed * dt, this.canTraverse)) this.blockedWalkerIndices.push(index);
      } else {
        walker.patrolDistance = walker.pathLength > 0 ? (walker.patrolDistance + walker.speed * dt) % (walker.pathLength * 2) : 0;
      }
      const heading = sampleWalkerPath(walker);
      walker.position.y = cityHeightAt(walker.position.x, walker.position.z);
      // Turning around at a patrol end that sits at a shop front means popping inside.
      if (walker.direction !== walker.lastDirection) {
        const reachedEnd: 1 | -1 = walker.lastDirection;
        walker.lastDirection = walker.direction;
        if (walker.doorEnds.includes(reachedEnd)) {
          walker.indoorsUntil = now + 6 + ((index * 0.381966 + now * 0.1) % 1) * 8;
          // They turn around out of sight and step back out already facing the way they will walk.
          walker.yaw = heading;
        }
      }
      const moved = Math.hypot(walker.position.x - beforeX, walker.position.z - beforeZ);
      walker.stride = (walker.stride + moved / STRIDE_METRES * Math.PI * 2) % (Math.PI * 2);
      const targetSwing = dt > 0 && moved / dt > 0.15 ? 0.42 : 0;
      walker.swing += (targetSwing - walker.swing) * (1 - Math.exp(-dt * 8));
      this.gait.setXY(index, walker.stride, walker.swing);
      const turn = Math.atan2(Math.sin(heading - walker.yaw), Math.cos(heading - walker.yaw));
      walker.yaw += THREE.MathUtils.clamp(turn, -2.8 * dt, 2.8 * dt);
      const dodge = THREE.MathUtils.clamp(this.avoidance(index, walker, playerPosition), -MAX_DODGE, MAX_DODGE);
      walker.dodge += (dodge - walker.dodge) * (1 - Math.exp(-dt * 4));
      // A stable per-walker threshold means the same hardy few stay out as the rain builds.
      const sheltering = shelter > 0 && (index * 0.618034) % 1 < shelter * 0.8;
      const inside = walker.indoorsUntil > now;
      const visible = !sheltering && !inside && walker.position.distanceTo(playerPosition) <= CULL_DISTANCE;
      this.visibleFlags[index] = visible ? 1 : 0;
      this.writeWalkerMatrices(index, walker, visible, now);
    }

    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    this.gait.needsUpdate = true;
    if (this.lod) {
      const change = this.lod.update(playerPosition, this.walkers, this.visibleFlags, dt);
      for (const index of change.hidden) this.writeWalkerMatrices(index, this.walkers[index]!, false, now);
      for (const index of change.shown) this.writeWalkerMatrices(index, this.walkers[index]!, true, now);
    }
    this.root.userData.navigationMode = this.blockedWalkerIndices.length ? 'blocked' : 'surface_patrol';
  }

  /**
   * WebGPU ignores `onBeforeCompile`; swap in a node material that applies the same limb swing.
   * Loaded lazily so WebGL never pulls in the node modules. Failure leaves the standing pose.
   */
  async enableNodeLimbSwing(): Promise<void> {
    const [{ MeshStandardNodeMaterial }, tsl] = await Promise.all([
      import('three/webgpu') as unknown as Promise<{ MeshStandardNodeMaterial: new (parameters?: object) => THREE.Material & { positionNode: unknown; vertexColors: boolean } }>,
      import('three/tsl'),
    ]);
    if (this.disposed) return;
    // Minimal structural view of the TSL node API used here; the full typings are stricter than these expressions need.
    type ScalarNode = { x: ScalarNode; y: ScalarNode; z: ScalarNode; add(value: unknown): ScalarNode; sub(value: unknown): ScalarNode; mul(value: unknown): ScalarNode };
    const node = tsl as unknown as {
      attribute(name: string, type: string): ScalarNode; instancedDynamicBufferAttribute(attribute: unknown, type: string): ScalarNode;
      float(value: number): ScalarNode; min(a: unknown, b: unknown): ScalarNode; abs(value: unknown): ScalarNode;
      sin(value: unknown): ScalarNode; cos(value: unknown): ScalarNode; vec3(x: unknown, y: unknown, z: unknown): ScalarNode; positionLocal: ScalarNode;
    };
    const limb = node.attribute('limb', 'float');
    const gait = node.instancedDynamicBufferAttribute(this.gait, 'vec2');
    const weight = (id: number) => node.float(1).sub(node.min(node.abs(limb.sub(id)), 1));
    const left = weight(LIMB.leftLeg), right = weight(LIMB.rightLeg), leftArm = weight(LIMB.leftArm), rightArm = weight(LIMB.rightArm);
    const swing = node.sin(gait.x).mul(gait.y);
    const angle = swing.mul(left.sub(right)).add(swing.mul(0.8).mul(rightArm.sub(leftArm)));
    const pivot = left.add(right).mul(HIP_PIVOT).add(leftArm.add(rightArm).mul(SHOULDER_PIVOT));
    const local = node.positionLocal;
    const lift = local.y.sub(pivot);
    const material = new MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.9 });
    material.vertexColors = true;
    material.positionNode = node.vec3(local.x, pivot.add(lift.mul(node.cos(angle))).sub(local.z.mul(node.sin(angle))), lift.mul(node.sin(angle)).add(local.z.mul(node.cos(angle))));
    const previous = this.bodies.material as THREE.Material;
    this.bodies.material = material;
    if (previous !== this.bodyMaterial) previous.dispose();
    this.nodeBodyMaterial = material;
  }

  /** Development visual review only: which walkers currently wear an authored townie. */
  crowdForWorldReview(): { lodReady: boolean; assigned: number[] } {
    return { lodReady: !!this.lod, assigned: this.lod ? this.lod.assignedIndices() : [] };
  }

  dispose(): void {
    this.disposed = true;
    this.nodeBodyMaterial?.dispose();
    this.bodies.geometry.dispose();
    this.heads.geometry.dispose();
    this.bodyMaterial.dispose();
    this.bodies.customDepthMaterial?.dispose();
    this.skinMaterial.dispose();
    this.lod?.dispose();
    this.root.clear();
  }

  /** Desired sidestep for people (and the player) close ahead on the same line. */
  private avoidance(index: number, walker: AmbientWalker, playerPosition: THREE.Vector3): number {
    const forwardX = -Math.sin(walker.yaw), forwardZ = -Math.cos(walker.yaw);
    let push = 0;
    const consider = (x: number, z: number, weight: number) => {
      const dx = x - walker.position.x, dz = z - walker.position.z;
      const ahead = dx * forwardX + dz * forwardZ;
      if (ahead <= 0 || ahead > AVOID_LOOKAHEAD) return;
      const lateral = dx * -forwardZ + dz * forwardX;
      if (Math.abs(lateral) > AVOID_WIDTH) return;
      // Step to the side away from them, more firmly the closer they are.
      push += (lateral >= 0 ? -1 : 1) * (1 - ahead / AVOID_LOOKAHEAD) * 0.55 * weight;
    };
    for (let other = 0; other < this.walkers.length; other += 1) {
      if (other === index) continue;
      const neighbour = this.walkers[other]!;
      consider(neighbour.position.x, neighbour.position.z, 1);
    }
    consider(playerPosition.x, playerPosition.z, 1.4);
    return push;
  }

  private writeWalkerMatrices(index: number, walker: AmbientWalker, visible: boolean, now: number): void {
    this.headingQuaternion.setFromAxisAngle(this.yAxis, walker.yaw);
    // Side-to-side sway and a small double-step bob follow the stride; standing people breathe gently.
    const sway = Math.sin(walker.stride) * walker.swing * 0.06 + Math.sin(now * 1.3 + walker.phase) * 0.008;
    this.tiltQuaternion.setFromAxisAngle(this.zAxis, sway);
    this.bodyQuaternion.copy(this.headingQuaternion).multiply(this.tiltQuaternion);
    const bob = Math.abs(Math.cos(walker.stride)) * walker.swing * 0.07;

    const sideX = -Math.cos(walker.yaw) * walker.dodge, sideZ = Math.sin(walker.yaw) * walker.dodge;
    this.bodyPosition.set(walker.position.x + sideX, walker.position.y + BODY_HEIGHT + bob, walker.position.z + sideZ);
    this.headPosition.set(walker.position.x + sideX, walker.position.y + HEAD_HEIGHT + bob, walker.position.z + sideZ);
    const scale = visible ? this.visibleScale : this.hiddenScale;

    this.bodyMatrix.compose(this.bodyPosition, this.bodyQuaternion, scale);
    this.headMatrix.compose(this.headPosition, this.headingQuaternion, scale);
    this.bodies.setMatrixAt(index, this.bodyMatrix);
    this.heads.setMatrixAt(index, this.headMatrix);
  }
}

/** Swings each limb about its hip or shoulder pivot from the per-instance gait (stride phase, amplitude). */
function injectLimbSwing(shader: { vertexShader: string }): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
      attribute float limb;
      attribute vec2 gait;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
          float swing = sin(gait.x) * gait.y;
          float angle = 0.0, pivot = 0.0;
          if (limb > 0.5 && limb < 1.5) { angle = swing; pivot = ${HIP_PIVOT.toFixed(2)}; }
          else if (limb > 1.5 && limb < 2.5) { angle = -swing; pivot = ${HIP_PIVOT.toFixed(2)}; }
          else if (limb > 2.5 && limb < 3.5) { angle = -swing * 0.8; pivot = ${SHOULDER_PIVOT.toFixed(2)}; }
          else if (limb > 3.5) { angle = swing * 0.8; pivot = ${SHOULDER_PIVOT.toFixed(2)}; }
          float lift = transformed.y - pivot;
          transformed.y = pivot + lift * cos(angle) - transformed.z * sin(angle);
          transformed.z = lift * sin(angle) + transformed.z * cos(angle);`);
}

/** Merges parts into one geometry, painting each with a vertex colour that multiplies the instance tint. */
function paintedMerge(parts: Array<[THREE.BufferGeometry, number, number?]>): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], limbs: number[] = [], indices: number[] = [];
  for (const [part, shade, limb = LIMB.torso] of parts) {
    const geometry = part.index ? part : part.toNonIndexed();
    const base = positions.length / 3;
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i += 1) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      colors.push(shade, shade, shade);
      limbs.push(limb);
    }
    const index = geometry.index;
    if (index) for (let i = 0; i < index.count; i += 1) indices.push(base + index.getX(i));
    else for (let i = 0; i < position.count; i += 1) indices.push(base + i);
    part.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  merged.setAttribute('limb', new THREE.Float32BufferAttribute(limbs, 1));
  merged.setIndex(indices);
  return merged;
}

/** Torso, arms and darker legs around the body centre at BODY_HEIGHT; one instanced draw. */
function createWalkerBodyGeometry(): THREE.BufferGeometry {
  const parts: Array<[THREE.BufferGeometry, number, number]> = [
    [new THREE.CapsuleGeometry(0.19, 0.4, 6, 12).scale(1.1, 1, 0.75).translate(0, 0.12, 0), 1, LIMB.torso],
    [new THREE.CapsuleGeometry(0.075, 0.62, 4, 10).translate(-0.1, -0.62, 0), 0.42, LIMB.leftLeg],
    [new THREE.CapsuleGeometry(0.075, 0.62, 4, 10).translate(0.1, -0.62, 0), 0.42, LIMB.rightLeg],
    [new THREE.CapsuleGeometry(0.058, 0.48, 4, 10).rotateZ(0.08).translate(-0.27, 0.06, 0), 0.94, LIMB.leftArm],
    [new THREE.CapsuleGeometry(0.058, 0.48, 4, 10).rotateZ(-0.08).translate(0.27, 0.06, 0), 0.94, LIMB.rightArm],
  ];
  return paintedMerge(parts);
}

/** A head with a darker hair cap; the instance colour sets the skin tone. */
function createWalkerHeadGeometry(): THREE.BufferGeometry {
  return paintedMerge([
    [new THREE.SphereGeometry(0.13, 16, 12), 1],
    [new THREE.SphereGeometry(0.138, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.012, 0.01), 0.18],
  ]);
}


/** Crowd anchors: about a third of walkers on the bay promenade and a fifth on Lantern Street. */
function crowdFocus(index: number, count: number, random: () => number): { x: number; z: number } | null {
  const promenade = Math.round(count * 0.34), lantern = Math.round(count * 0.2);
  if (index < promenade) return { x: -40 + random() * 210, z: -262 - random() * 12 };
  if (index < promenade + lantern) return { x: -30 + (random() - 0.5) * 10, z: 22 + random() * 105 };
  return null;
}
