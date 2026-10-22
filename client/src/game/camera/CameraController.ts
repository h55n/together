import * as THREE from 'three';
import {
  clampPitch,
  DEFAULT_FIRST_PERSON_FOV,
  firstPersonEyeOffset,
  safeThirdPersonDistance,
  thirdPersonDesiredOffset,
} from './cameraMath';
import type { PlayerAvatar } from '../player/PlayerAvatar';

export type CameraMode = 'first_person' | 'third_person';

const THIRD_PERSON_DISTANCE = 4;
const CAMERA_COLLISION_RADIUS = 0.18;
const CAMERA_COLLISION_PADDING = 0.2;
const CAMERA_AVATAR_HIDE_DISTANCE = 0.65;
const FIRST_PERSON_WALL_CLEARANCE = 0.16;

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'first_person';
  yaw = Math.PI;
  pitch = 0;
  sensitivity = 0.0022;
  headBobAmount = 0.018;

  private bobTime = 0;
  private bobOffset = 0;
  private readonly targetPosition = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly collisionMeshes: THREE.Object3D[] = [];
  private readonly rayDirection = new THREE.Vector3();
  private readonly probeOrigin = new THREE.Vector3();
  private readonly probeRight = new THREE.Vector3();
  private readonly probeUp = new THREE.Vector3(0, 1, 0);
  private permanentEnvironmentRegistered = false;
  private staticRay: ((origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => number | null) | null = null;

  constructor(private readonly avatar: PlayerAvatar, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(DEFAULT_FIRST_PERSON_FOV, aspect, 0.04, 700);
    this.camera.rotation.order = 'YXZ';
    avatar.setFirstPerson(true);
    this.ensurePermanentEnvironmentCollision();
  }

  /**
   * Prefer physics colliders for camera probes: merged render batches have no spatial index,
   * so mesh raycasts against streamed chunks cost tens of milliseconds per frame.
   */
  usePhysicsRaycast(cast: (origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => number | null): void { this.staticRay = cast; }

  private castProbe(origin: THREE.Vector3, direction: THREE.Vector3, near: number, far: number): number | null {
    if (this.staticRay) {
      const distance = this.staticRay(origin, direction, far);
      return distance !== null && distance >= near ? distance : null;
    }
    this.raycaster.set(origin, direction);
    this.raycaster.near = near;
    this.raycaster.far = far;
    return this.raycaster.intersectObjects(this.collisionMeshes, true)[0]?.distance ?? null;
  }

  addCollisionRoot(root: THREE.Object3D): void {
    if (this.collisionMeshes.includes(root)) return;
    this.collisionMeshes.push(root);
  }

  toggle(): void {
    this.bobOffset = 0;
    this.mode = this.mode === 'first_person' ? 'third_person' : 'first_person';
    this.avatar.setFirstPerson(this.mode === 'first_person');
  }

  applyLook(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * this.sensitivity;
    this.pitch = clampPitch(this.pitch - deltaY * this.sensitivity);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  update(deltaSeconds: number, moving: boolean, jogging: boolean): void {
    this.ensurePermanentEnvironmentCollision();
    const root = this.avatar.root.position;
    if (this.mode === 'first_person') {
      this.bobTime += moving ? deltaSeconds * (jogging ? 9 : 6.2) : deltaSeconds * 1.5;
      const targetBob = moving ? Math.sin(this.bobTime) * this.headBobAmount * (jogging ? 1.3 : 1) : 0;
      this.bobOffset = this.headBobAmount <= 0 ? 0 : this.bobOffset + (targetBob - this.bobOffset) * (1 - Math.exp(-Math.max(0, deltaSeconds) * 16));
      const eyeOffset = firstPersonEyeOffset(this.yaw);
      this.camera.position.set(root.x + eyeOffset.x, root.y + this.avatar.eyeHeight + this.bobOffset, root.z + eyeOffset.z);
      this.keepEyeClearOfWalls(root.y + this.avatar.eyeHeight + this.bobOffset);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }

    const desiredOffset = thirdPersonDesiredOffset(this.yaw, THIRD_PERSON_DISTANCE, this.pitch);
    this.lookTarget.set(root.x, root.y + 1.35, root.z);
    this.targetPosition.set(root.x + desiredOffset.x, root.y + desiredOffset.y, root.z + desiredOffset.z);

    this.rayDirection.copy(this.targetPosition).sub(this.lookTarget);
    const desiredDistance = this.rayDirection.length();
    this.rayDirection.normalize();

    const hitDistances = this.collectProbeHitDistances(desiredDistance);
    const safeDistance = safeThirdPersonDistance(
      desiredDistance,
      hitDistances,
      CAMERA_COLLISION_PADDING,
    );
    this.targetPosition.copy(this.lookTarget).addScaledVector(this.rayDirection, safeDistance);

    const currentDistance = this.camera.position.distanceTo(this.lookTarget);
    if (safeDistance + 0.06 < currentDistance) {
      // Never ease a camera through a newly detected wall. Obstruction recovery must be immediate.
      this.camera.position.copy(this.targetPosition);
    } else {
      const damping = 1 - Math.exp(-deltaSeconds * 12);
      this.camera.position.lerp(this.targetPosition, damping);
    }

    this.avatar.setFirstPerson(safeDistance < CAMERA_AVATAR_HIDE_DISTANCE);
    if (safeDistance < 0.04) this.camera.rotation.set(this.pitch, this.yaw, 0);
    else this.camera.lookAt(this.lookTarget);
  }

  private collectProbeHitDistances(desiredDistance: number): number[] {
    if (this.collisionMeshes.length === 0 && !this.staticRay) return [];

    this.probeRight.crossVectors(this.rayDirection, this.probeUp);
    if (this.probeRight.lengthSq() < 1e-6) this.probeRight.set(1, 0, 0);
    else this.probeRight.normalize();

    const offsets: readonly [number, number][] = [
      [0, 0],
      [CAMERA_COLLISION_RADIUS, 0],
      [-CAMERA_COLLISION_RADIUS, 0],
      [0, CAMERA_COLLISION_RADIUS],
      [0, -CAMERA_COLLISION_RADIUS * 0.7],
    ];
    const distances: number[] = [];

    for (const [rightOffset, upOffset] of offsets) {
      this.probeOrigin.copy(this.lookTarget)
        .addScaledVector(this.probeRight, rightOffset)
        .addScaledVector(this.probeUp, upOffset);
      const hit = this.castProbe(this.probeOrigin, this.rayDirection, 0.02, desiredDistance);
      if (hit !== null) distances.push(hit);
    }

    return distances;
  }

  /**
   * The near plane's corners reach past the eye; against a wall that slices the frame black.
   * Probe forward and sideways from the head and step the eye back from any close surface.
   */
  private keepEyeClearOfWalls(eyeY: number): void {
    if (this.collisionMeshes.length === 0 && !this.staticRay) return;
    const root = this.avatar.root.position;
    this.probeOrigin.set(root.x, eyeY, root.z);
    const forwardX = -Math.sin(this.yaw), forwardZ = -Math.cos(this.yaw);
    for (const [dx, dz] of [[forwardX, forwardZ], [-forwardZ, forwardX], [forwardZ, -forwardX]] as const) {
      this.rayDirection.set(dx, 0, dz);
      // Reach covers the forward eye offset plus the near plane's half-width at this field of view.
      const reach = FIRST_PERSON_WALL_CLEARANCE + Math.max(0, (this.camera.position.x - root.x) * dx + (this.camera.position.z - root.z) * dz);
      const hit = this.castProbe(this.probeOrigin, this.rayDirection, 0, reach);
      if (hit !== null) this.camera.position.addScaledVector(this.rayDirection, hit - reach);
    }
  }

  private ensurePermanentEnvironmentCollision(): void {
    if (this.permanentEnvironmentRegistered) return;
    const environment = this.avatar.root.parent?.getObjectByName('amaya-bay-authored-environment');
    if (!environment) return;
    this.addCollisionRoot(environment);
    this.permanentEnvironmentRegistered = true;
  }
}
