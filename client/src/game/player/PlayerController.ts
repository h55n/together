import { advanceTransportHeading, advanceTransportSpeed, type AvatarAction, type TransportMode } from '@together/shared';
import type { InputSnapshot } from '../core/InputManager';
import type { PhysicsWorld, PlayerPhysicsHandle } from '../physics/PhysicsWorld';
import type { PlayerAvatar } from './PlayerAvatar';
import { movementVector } from './movementMath';

export class PlayerController {
  readonly physicsHandle: PlayerPhysicsHandle;
  private lastInput: InputSnapshot | null = null;
  private moving = false;
  private jogging = false;
  private microAction: AvatarAction | null = null;
  private microActionRemaining = 0;
  private microActionCompletion: { promise: Promise<void>; resolve: () => void } | null = null;
  private transportMode: TransportMode = 'on_foot';
  private transportSpeed = 0;
  private transportYaw = 0;
  private transportHeadingInitialized = false;
  private interactionLocked = false;

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly avatar: PlayerAvatar,
    spawn: { x: number; y: number; z: number },
  ) {
    this.physicsHandle = physics.createPlayer(spawn);
  }

  setInput(input: InputSnapshot): void {
    this.lastInput = input;
    this.moving = !this.interactionLocked && this.microAction === null && (this.transportMode === 'on_foot' ? Math.abs(input.moveX) + Math.abs(input.moveZ) > 0.01 : this.transportSpeed > 0.08 || input.moveZ > 0);
    this.jogging = this.transportMode === 'on_foot' && this.moving && input.jog;
  }

  beginMicroAction(action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>, durationSeconds = 1.25, allowWhileLocked = false): void {
    if (this.transportMode !== 'on_foot' || (this.interactionLocked && !allowWhileLocked)) return;
    this.finishMicroAction();
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => { resolve = complete; });
    this.microActionCompletion = { promise, resolve };
    this.microAction = action;
    this.microActionRemaining = Math.max(0.25, durationSeconds);
    this.moving = false;
    this.jogging = false;
  }

  waitForMicroActionCompletion(): Promise<void> {
    return this.microActionCompletion?.promise ?? Promise.resolve();
  }

  fixedUpdate(deltaSeconds: number, cameraYaw: number): void {
    const input = this.lastInput;
    if (!input || this.microAction || this.interactionLocked) return;
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
      movement = movementVector(input, cameraYaw);
    }
    this.physics.moveCharacter(this.physicsHandle, {
      x: movement.x * deltaSeconds,
      y: -4.5 * deltaSeconds,
      z: movement.z * deltaSeconds,
    });
  }

  syncVisual(yaw: number, deltaSeconds: number): void {
    const position = this.physicsHandle.body.translation();
    if (this.transportMode !== 'on_foot' && !this.transportHeadingInitialized) {
      this.transportYaw = yaw;
      this.transportHeadingInitialized = true;
    }
    this.avatar.setTransform(position, this.presentationYaw(yaw));
    if (this.microAction) {
      this.microActionRemaining -= deltaSeconds;
      if (this.microActionRemaining <= 0) this.finishMicroAction();
    }
    this.avatar.updateMotion(deltaSeconds, this.animationTag());
  }

  setInteractionLock(locked: boolean): void {
    this.interactionLocked = locked;
    if (locked) { this.moving = false; this.jogging = false; }
  }

  setTransportMode(mode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw'): void {
    this.transportMode = mode;
    this.transportSpeed = 0;
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
    this.finishMicroAction();
    this.physics.disposePlayer(this.physicsHandle);
  }

  private finishMicroAction(): void {
    this.microAction = null;
    this.microActionRemaining = 0;
    const completion = this.microActionCompletion;
    this.microActionCompletion = null;
    completion?.resolve();
  }
}
