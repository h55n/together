export const WALK_SPEED_METRES_PER_SECOND = 1.6;
export const JOG_SPEED_METRES_PER_SECOND = 3.2;

export type MovementInput = { moveX: number; moveZ: number; jog: boolean };
export type HorizontalVector = { x: number; z: number };
export type LocomotionSample = { speed: number; directionX: number; directionZ: number };

/** Actual displacement, expressed in the body frame; teleports are not steps. */
export function displacementLocomotion(previous: HorizontalVector, current: HorizontalVector, deltaSeconds: number, yaw: number): LocomotionSample {
  const dx = current.x - previous.x;
  const dz = current.z - previous.z;
  const distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance) || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || distance > Math.max(0.25, deltaSeconds * 7)) {
    return { speed: 0, directionX: 0, directionZ: 0 };
  }
  const speed = distance / deltaSeconds;
  if (speed < 0.03) return { speed: 0, directionX: 0, directionZ: 0 };
  return {
    speed: Math.min(3.2, speed),
    directionX: (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / distance,
    directionZ: (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / distance,
  };
}

export function movementVector(input: MovementInput, cameraYawRadians: number, speedOverride?: number): HorizontalVector {
  const length = Math.hypot(input.moveX, input.moveZ);
  if (length < 1e-8) return { x: 0, z: 0 };

  const localX = input.moveX / Math.max(1, length);
  const localForward = input.moveZ / Math.max(1, length);
  const speed = speedOverride ?? (input.jog ? JOG_SPEED_METRES_PER_SECOND : WALK_SPEED_METRES_PER_SECOND);

  // Three.js forward is -Z. Rotate local right/forward by camera yaw.
  const sin = Math.sin(cameraYawRadians);
  const cos = Math.cos(cameraYawRadians);
  return {
    x: (localX * cos - localForward * sin) * speed,
    z: (-localX * sin - localForward * cos) * speed,
  };
}
