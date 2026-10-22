import RAPIER from '@dimforge/rapier3d-compat';
import { cityHeightAt, type SurfacePoint } from '@together/shared';
import { awaitPreparation } from '../core/preparation';

export type PlayerPhysicsHandle = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
};

// Rapier owns one WASM module; concurrent React startup must share initialization.
let initialization: Promise<void> | undefined;

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private disposed = false;

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  static async create(signal = new AbortController().signal): Promise<PhysicsWorld> {
    initialization ??= RAPIER.init().catch((error: unknown) => { initialization = undefined; throw error; });
    await awaitPreparation(initialization, signal, 'Physics initialization');
    signal.throwIfAborted();
    return new PhysicsWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  createPlayer(position = { x: 0, y: 1.2, z: 0 }): PlayerPhysicsHandle {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, position.y, position.z),
    );
    const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.32), body);
    const controller = this.world.createCharacterController(0.01);
    controller.enableAutostep(0.35, 0.2, true);
    controller.enableSnapToGround(0.2);
    controller.setSlideEnabled(true);
    return { body, collider, controller };
  }

  moveCharacter(handle: PlayerPhysicsHandle, desired: { x: number; y: number; z: number }): void {
    handle.controller.computeColliderMovement(handle.collider, desired);
    const movement = handle.controller.computedMovement();
    const current = handle.body.translation();
    handle.body.setNextKinematicTranslation({
      x: current.x + movement.x,
      y: current.y + movement.y,
      z: current.z + movement.z,
    });
  }

  createFixedCuboid(position: { x: number; y: number; z: number }, halfExtents: { x: number; y: number; z: number }, yaw = 0): RAPIER.Collider {
    const descriptor = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setTranslation(position.x, position.y, position.z);
    if (yaw !== 0) descriptor.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    return this.world.createCollider(descriptor);
  }

  createFixedTrimesh(vertices: Float32Array, indices: Uint32Array): RAPIER.Collider {
    return this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices));
  }

  removeCollider(collider: RAPIER.Collider): void {
    this.world.removeCollider(collider, false);
  }

  getActiveColliderCount(): number { return this.world.colliders.len(); }

  canTraversePedestrian(from: SurfacePoint, to: SurfacePoint): boolean {
    if (this.disposed || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return false;
    const fromY = cityHeightAt(from.x, from.z), toY = cityHeightAt(to.x, to.z);
    // Ground clearance allows sidewalk lips while the torso sweeps real obstacles.
    const hit = this.world.castShape({ x: from.x, y: fromY + 1.05, z: from.z }, { x: 0, y: 0, z: 0, w: 1 },
      { x: to.x - from.x, y: toY - fromY, z: to.z - from.z }, new RAPIER.Capsule(.5, .28),
      .01, 1, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
    return hit === null;
  }

  /** Distance to the first fixed collider along a unit direction, or null. Ignores the player and dynamic bodies. */
  castStaticRay(origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, maxDistance: number): number | null {
    if (this.disposed) return null;
    const hit = this.world.castRay(new RAPIER.Ray(origin, direction), maxDistance, true,
      RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
    return hit ? hit.timeOfImpact : null;
  }

  step(): void {
    this.world.step();
  }

  disposePlayer(handle: PlayerPhysicsHandle): void {
    this.world.removeCharacterController(handle.controller);
    this.world.removeRigidBody(handle.body);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.free();
  }
}
