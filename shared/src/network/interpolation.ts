export function interpolationAlpha(responsiveness: number, deltaSeconds: number): number {
  const lambda = Math.max(0, responsiveness);
  const dt = Math.max(0, deltaSeconds);
  return 1 - Math.exp(-lambda * dt);
}

export function lerpAngle(from: number, to: number, alpha: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * Math.max(0, Math.min(1, alpha));
}
