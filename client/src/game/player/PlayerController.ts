import { advanceTransportHeading, advanceTransportSpeed, constrainKayakMovement, KAYAK_PLAYER_SUPPORT_Y, type AvatarAction, type TransportMode } from '@together/shared';
import type { InputSnapshot } from '../core/InputManager';
import type { PhysicsWorld, PlayerPhysicsHandle } from '../physics/PhysicsWorld';
import type { PlayerAvatar } from './PlayerAvatar';
import { displacementLocomotion, movementVector } from './movementMath';

export class PlayerController {
  readonly physicsHandle: PlayerPhysicsHandle;
  private lastInput: InputSnapshot | null = null;
  private moving = false;
  private jogging = false;
  private microAction: AvatarAction | null = null;
  private microActionRemaining = 0;
  private microActionCompletion: { promise: Promise<boolean>; resolve: (completed: boolean) => void } | null = null;
  private transportMode: TransportMode = 'on_foot';
  private transportSpeed = 0;
  private transportYaw = 0;
  private transportHeadingInitialized = false;
  private interactionLocked = false;
  private previousVisualPosition: { x: number; z: number };
  private footfallListener: ((speed: number) => void) | undefined;
  private readonly footVelocity = { x: 0, z: 0 };
  private lastFootfallSerial = 0;

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly avatar: PlayerAvatar,
    spawn: { x: number; y: number; z: number },
  ) {
    this.physicsHandle = physics.createPlayer(spawn);
    this.previousVisualPosition = { x: spawn.x, z: spawn.z };
  }

  setInput(input: InputSnapshot): void {
    this.lastInput = input;
  }

  setFootfallListener(listener: (speed: number) => void): void {
    this.footfallListener = listener;
    this.lastFootfallSerial = this.avatar.getFootfallSerial();
  }

  beginMicroAction(action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>, durationSeconds = 1.25, allowWhileLocked = false): boolean {
    if (this.transportMode !== 'on_foot' || (this.interactionLocked && !allowWhileLocked)) return false;
    this.finishMicroAction();
    let resolve!: (completed: boolean) => void;
    const promise = new Promise<boolean>((complete) => { resolve = complete; });
    this.microActionCompletion = { promise, resolve };
    this.microAction = action;
    this.microActionRemaining = Math.max(0.25, durationSeconds);
    this.moving = false;
    this.jogging = false;
    return true;
  }

  waitForMicroActionCompletion(): Promise<boolean> {
    return this.microActionCompletion?.promise ?? Promise.resolve(false);
  }

  cancelMicroAction(): void { this.finishMicroAction(); }

  fixedUpdate(deltaSeconds: number, cameraYaw: number): void {
    const input = this.lastInput;
    if (!input || this.microAction || this.interactionLocked) { this.footVelocity.x = 0; this.footVelocity.z = 0; return; }
    let movement;
    if (this.transportMode === 'bicycle' || this.transportMode === 'scooter' || this.transportMode === 'kayak') {
      const throttle = Math.max(0, input.moveZ);
      this.transportSpeed = advanceTransportSpeed(this.transportMode, this.transportSpeed, throttle, input.moveZ < -0.05, deltaSeconds);
      if (!this.transportHeadingInitialized) {
        this.transportYaw = cameraYaw;
        this.transportHeadingInitialized = true;
      }
      const steer = Math.max(-1, Math.min(1, input.moveX));
      this.transportYaw = advanceTransportHeading(this.transportMode, this.transportYaw, steer, this.transportSpeed, deltaSeconds);
      movement = movementVector({ moveX: 0, moveZ: 1, jog: false }, this.transportYaw, this.transportSpeed);
      this.moving = this.transportSpeed > 0.08;
    } else {
      // Ease into and out of a walk instead of snapping to full speed: quick enough to stay responsive.
      const target = movementVector(input, cameraYaw);
      const accelerating = Math.hypot(target.x, target.z) >= Math.hypot(this.footVelocity.x, this.footVelocity.z);
      const blend = 1 - Math.exp(-deltaSeconds * (accelerating ? 15 : 14));
      this.footVelocity.x += (target.x - this.footVelocity.x) * blend;
      this.footVelocity.z += (target.z - this.footVelocity.z) * blend;
      if (Math.hypot(this.footVelocity.x, this.footVelocity.z) < 0.03 && target.x === 0 && target.z === 0) { this.footVelocity.x = 0; this.footVelocity.z = 0; }
      movement = this.footVelocity;
    }
    const intended = { x: movement.x * deltaSeconds, z: movement.z * deltaSeconds };
    const kayakPosition = this.transportMode === 'kayak' ? this.getPosition() : undefined;
    const horizontal = kayakPosition
      ? constrainKayakMovement(kayakPosition, intended)
      : intended;
    // Rapier still resolves shore/obstacle collision, but a floating hull must
    // seek the waterline rather than continually walking down to the seabed.
    // Bound correction so old saved/launch heights converge without a snap.
    const vertical = kayakPosition
      ? Math.max(-4.5 * deltaSeconds, Math.min(4.5 * deltaSeconds, KAYAK_PLAYER_SUPPORT_Y - kayakPosition.y))
      : -4.5 * deltaSeconds;
    this.physics.moveCharacter(this.physicsHandle, {
      x: horizontal.x,
      y: vertical,
      z: horizontal.z,
    });
  }

  syncVisual(yaw: number, deltaSeconds: number): void {
    const position = this.physicsHandle.body.translation();
    if (this.transportMode !== 'on_foot' && !this.transportHeadingInitialized) {
      this.transportYaw = yaw;
      this.transportHeadingInitialized = true;
    }
    this.avatar.setTransform(position, this.presentationYaw(yaw), deltaSeconds);
    const locomotion = displacementLocomotion(this.previousVisualPosition, position, deltaSeconds, this.avatar.root.rotation.y);
    this.previousVisualPosition = { x: position.x, z: position.z };
    this.moving = !this.interactionLocked && !this.microAction && (this.transportMode === 'on_foot' ? locomotion.speed > 0 : this.transportSpeed > 0.08);
    this.jogging = this.transportMode === 'on_foot' && this.moving && Boolean(this.lastInput?.jog) && locomotion.speed > 1.8;
    if (this.microAction) {
      this.microActionRemaining -= deltaSeconds;
      if (this.microActionRemaining <= 0) this.finishMicroAction(true);
    }
    this.avatar.updateMotion(deltaSeconds, this.animationTag(), locomotion);
    const serial = this.avatar.getFootfallSerial();
    if (serial > this.lastFootfallSerial && this.footfallListener && this.moving && this.transportMode === 'on_foot' && this.physicsHandle.controller.computedGrounded()) {
      this.footfallListener(locomotion.speed);
    }
    this.lastFootfallSerial = serial;
  }

  setInteractionLock(locked: boolean): void {
    this.interactionLocked = locked;
    if (locked) { this.moving = false; this.jogging = false; this.footVelocity.x = 0; this.footVelocity.z = 0; }
  }

  setTransportMode(mode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw'): void {
    this.transportMode = mode;
    this.transportSpeed = 0;
    this.footVelocity.x = 0; this.footVelocity.z = 0;
    this.transportHeadingInitialized = mode === 'on_foot' || mode === 'auto_rickshaw' ? false : this.transportHeadingInitialized;
    this.finishMicroAction();
    this.avatar.setTransportMode(mode);
  }

  getTransportMode(): 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw' {
    return this.transportMode as 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw';
  }

  presentationYaw(cameraYaw: number): number {
    return this.transportMode === 'bicycle' || this.transportMode === 'scooter' || this.transportMode === 'kayak'
      ? this.transportYaw
      : cameraYaw;
  }

  setWorldPosition(position: { x: number; y: number; z: number }): void {
    this.physicsHandle.body.setTranslation(position, true);
    this.physicsHandle.body.setNextKinematicTranslation(position);
    this.previousVisualPosition = { x: position.x, z: position.z };
    this.moving = false; this.jogging = false;
  }

  getPosition(): { x: number; y: number; z: number } {
    const position = this.physicsHandle.body.translation();
    return { x: position.x, y: position.y, z: position.z };
  }

  animationTag(): AvatarAction {
    if (this.microAction) return this.microAction;
    if (this.transportMode === 'bicycle') return 'cycle';
    if (this.transportMode === 'scooter') return 'scooter';
    if (this.transportMode === 'kayak') return 'kayak';
    if (this.transportMode === 'auto_rickshaw') return 'sit';
    if (!this.moving) return 'idle';
    return this.jogging ? 'jog' : 'walk';
  }

  isMoving(): boolean {
    return this.moving;
  }

  isJogging(): boolean {
    return this.jogging;
  }

  dispose(): void {
    this.footfallListener = undefined;
    this.finishMicroAction();
    this.physics.disposePlayer(this.physicsHandle);
  }

  private finishMicroAction(completed = false): void {
    this.microAction = null;
    this.microActionRemaining = 0;
    const completion = this.microActionCompletion;
    this.microActionCompletion = null;
    completion?.resolve(completed);
  }
}
