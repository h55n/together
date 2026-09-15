import * as THREE from 'three';
import { clampPitch, DEFAULT_FIRST_PERSON_FOV, thirdPersonDesiredOffset } from './cameraMath';
import type { PlayerAvatar } from '../player/PlayerAvatar';

export type CameraMode = 'first_person' | 'third_person';

export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'first_person';
  yaw = Math.PI;
  pitch = 0;
  sensitivity = 0.0022;
  headBobAmount = 0.018;

  private bobTime = 0;
  private readonly targetPosition = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly collisionMeshes: THREE.Object3D[] = [];

  constructor(private readonly avatar: PlayerAvatar, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(DEFAULT_FIRST_PERSON_FOV, aspect, 0.04, 700);
    this.camera.rotation.order = 'YXZ';
    avatar.setFirstPerson(true);
  }

  addCollisionRoot(root: THREE.Object3D): void {
    this.collisionMeshes.push(root);
  }

  toggle(): void {
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
    const root = this.avatar.root.position;
    if (this.mode === 'first_person') {
      this.bobTime += moving ? deltaSeconds * (jogging ? 9 : 6.2) : deltaSeconds * 1.5;
      const bob = moving ? Math.sin(this.bobTime) * this.headBobAmount * (jogging ? 1.3 : 1) : 0;
      this.camera.position.set(root.x, root.y + this.avatar.eyeHeight + bob, root.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }

    const desiredOffset = thirdPersonDesiredOffset(this.yaw, 4);
    this.lookTarget.set(root.x, root.y + 1.35, root.z);
    this.targetPosition.set(root.x + desiredOffset.x, root.y + desiredOffset.y, root.z + desiredOffset.z);

    const rayDirection = this.targetPosition.clone().sub(this.lookTarget);
    const desiredDistance = rayDirection.length();
    rayDirection.normalize();
    this.raycaster.set(this.lookTarget, rayDirection);
    this.raycaster.far = desiredDistance;
    const hit = this.raycaster.intersectObjects(this.collisionMeshes, true)[0];
    if (hit) this.targetPosition.copy(this.lookTarget).addScaledVector(rayDirection, Math.max(0.7, hit.distance - 0.18));

    const damping = 1 - Math.exp(-deltaSeconds * 12);
    this.camera.position.lerp(this.targetPosition, damping);
    this.camera.lookAt(this.lookTarget.x, this.lookTarget.y + Math.sin(this.pitch) * 1.6, this.lookTarget.z);
  }
}
