export function interpolationAlpha(responsiveness: number, deltaSeconds: number): number {
  const lambda = Math.max(0, responsiveness);
  const dt = Math.max(0, deltaSeconds);
  return 1 - Math.exp(-lambda * dt);
}

export function lerpAngle(from: number, to: number, alpha: number): number {
  const tau = Math.PI * 2;
  const raw = to - from;
  const delta = ((raw + Math.PI) % tau + tau) % tau - Math.PI;
  return from + delta * Math.max(0, Math.min(1, alpha));
}
