import { advanceTransportSpeed, type AvatarAction, type TransportMode } from '@together/shared';
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
  private transportMode: TransportMode = 'on_foot';
  private transportSpeed = 0;
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
    this.microAction = action;
    this.microActionRemaining = Math.max(0.25, durationSeconds);
    this.moving = false;
    this.jogging = false;
  }

  fixedUpdate(deltaSeconds: number, cameraYaw: number): void {
    const input = this.lastInput;
    if (!input || this.microAction || this.interactionLocked) return;
    let movement;
    if (this.transportMode === 'bicycle' || this.transportMode === 'scooter' || this.transportMode === 'kayak') {
      const throttle = Math.max(0, input.moveZ);
      this.transportSpeed = advanceTransportSpeed(this.transportMode, this.transportSpeed, throttle, input.moveZ < -0.05, deltaSeconds);
      const steer = Math.max(-0.65, Math.min(0.65, input.moveX * 0.65));
      movement = movementVector({ moveX: steer, moveZ: 1, jog: false }, cameraYaw, this.transportSpeed);
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
    this.avatar.setTransform(position, yaw);
    if (this.microAction) {
      this.microActionRemaining -= deltaSeconds;
      if (this.microActionRemaining <= 0) {
        this.microAction = null;
        this.microActionRemaining = 0;
      }
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
    this.microAction = null;
    this.avatar.setTransportMode(mode);
  }

  getTransportMode(): 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw' {
    return this.transportMode as 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw';
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
    this.physics.disposePlayer(this.physicsHandle);
  }
}
