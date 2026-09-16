export const DEFAULT_FIRST_PERSON_FOV = 78;
export const MIN_FIRST_PERSON_FOV = 70;
export const MAX_FIRST_PERSON_FOV = 95;
export const MAX_PITCH_RADIANS = Math.PI * 0.485;

export function clampPitch(pitch: number): number {
  return Math.max(-MAX_PITCH_RADIANS, Math.min(MAX_PITCH_RADIANS, pitch));
}

export function firstPersonEyeOffset(yaw: number, distance = 0.11): { x: number; z: number } {
  return {
    x: -Math.sin(yaw) * distance,
    z: -Math.cos(yaw) * distance,
  };
}

export function thirdPersonDesiredOffset(yaw: number, distance = 4): { x: number; y: number; z: number } {
  return {
    x: Math.sin(yaw) * distance,
    y: 1.85,
    z: Math.cos(yaw) * distance,
  };
}

export function safeThirdPersonDistance(
  desiredDistance: number,
  hitDistances: readonly number[],
  padding = 0.2,
  minimumDistance = 0.65,
): number {
  const nearest = hitDistances
    .filter((distance) => Number.isFinite(distance) && distance >= 0 && distance <= desiredDistance)
    .reduce((best, distance) => Math.min(best, distance), Number.POSITIVE_INFINITY);

  if (!Number.isFinite(nearest)) return desiredDistance;
  return Math.min(desiredDistance, Math.max(minimumDistance, nearest - padding));
}
