export type TransportMode = 'on_foot' | 'bicycle' | 'scooter' | 'auto_rickshaw' | 'kayak';

export type TransportProfile = {
  maxSpeed: number;
  acceleration: number;
  coastDeceleration: number;
  brakeDeceleration: number;
  supportsFreeSteering: boolean;
  turnRateRadiansPerSecond: number;
};

export const TRANSPORT_PROFILES: Record<Exclude<TransportMode, 'on_foot'>, TransportProfile> = {
  bicycle: { maxSpeed: 5.4, acceleration: 2.3, coastDeceleration: 0.8, brakeDeceleration: 5.2, supportsFreeSteering: true, turnRateRadiansPerSecond: 1.75 },
  scooter: { maxSpeed: 8.4, acceleration: 3.8, coastDeceleration: 1.25, brakeDeceleration: 7.2, supportsFreeSteering: true, turnRateRadiansPerSecond: 1.35 },
  auto_rickshaw: { maxSpeed: 9.2, acceleration: 2.4, coastDeceleration: 1.4, brakeDeceleration: 7.5, supportsFreeSteering: false, turnRateRadiansPerSecond: 0 },
  kayak: { maxSpeed: 2.4, acceleration: 1.15, coastDeceleration: 0.48, brakeDeceleration: 1.6, supportsFreeSteering: true, turnRateRadiansPerSecond: 1.05 },
};

export function advanceTransportSpeed(
  mode: Exclude<TransportMode, 'on_foot'>,
  currentSpeed: number,
  throttle: number,
  braking: boolean,
  deltaSeconds: number,
): number {
  const profile = TRANSPORT_PROFILES[mode];
  const dt = Math.max(0, Math.min(deltaSeconds, 0.2));
  const current = Math.max(0, Math.min(profile.maxSpeed, currentSpeed));
  if (braking) return Math.max(0, current - profile.brakeDeceleration * dt);
  const power = Math.max(0, Math.min(1, throttle));
  if (power > 0) return Math.min(profile.maxSpeed, current + profile.acceleration * power * dt);
  return Math.max(0, current - profile.coastDeceleration * dt);
}


export function advanceTransportHeading(
  mode: Exclude<TransportMode, 'on_foot'>,
  currentYaw: number,
  steer: number,
  speed: number,
  deltaSeconds: number,
): number {
  const profile = TRANSPORT_PROFILES[mode];
  if (!profile.supportsFreeSteering) return normalizeRadians(currentYaw);
  const dt = Math.max(0, Math.min(deltaSeconds, 0.2));
  const normalizedSteer = Math.max(-1, Math.min(1, steer));
  const speedRatio = Math.max(0, Math.min(1, speed / Math.max(0.001, profile.maxSpeed)));
  if (speedRatio < 0.015 || Math.abs(normalizedSteer) < 0.001) return normalizeRadians(currentYaw);
  const steeringAuthority = 0.2 + speedRatio * 0.8;
  return normalizeRadians(currentYaw - normalizedSteer * profile.turnRateRadiansPerSecond * steeringAuthority * dt);
}

function normalizeRadians(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
