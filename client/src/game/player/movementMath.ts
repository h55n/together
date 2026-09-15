export const WALK_SPEED_METRES_PER_SECOND = 1.6;
export const JOG_SPEED_METRES_PER_SECOND = 3.2;

export type MovementInput = { moveX: number; moveZ: number; jog: boolean };
export type HorizontalVector = { x: number; z: number };

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
    z: (localX * sin - localForward * cos) * speed,
  };
}
