import RAPIER from '@dimforge/rapier3d-compat';

export type PlayerPhysicsHandle = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
};

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private disposed = false;

  private constructor(world: RAPIER.World) {
    this.world = world;
  }

  static async create(): Promise<PhysicsWorld> {
    await RAPIER.init();
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

  createFixedCuboid(position: { x: number; y: number; z: number }, halfExtents: { x: number; y: number; z: number }): RAPIER.Collider {
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
        .setTranslation(position.x, position.y, position.z),
    );
  }

  createFixedTrimesh(vertices: Float32Array, indices: Uint32Array): RAPIER.Collider {
    return this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices));
  }

  removeCollider(collider: RAPIER.Collider): void {
    this.world.removeCollider(collider, false);
  }

  getActiveColliderCount(): number { return this.world.colliders.len(); }

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
