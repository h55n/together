export type InteractionView = { x: number; z: number; yaw: number };
export type InteractionCandidate = { id: string; x: number; z: number; radius: number; priority: number };

export function selectInteraction<T extends InteractionCandidate>(view: InteractionView, candidates: readonly T[]): T | undefined {
  const forwardX = -Math.sin(view.yaw);
  const forwardZ = -Math.cos(view.yaw);
  let best: T | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    const dx = candidate.x - view.x;
    const dz = candidate.z - view.z;
    const distance = Math.hypot(dx, dz);
    if (distance > candidate.radius || distance < 1e-6) continue;
    const alignment = (dx / distance) * forwardX + (dz / distance) * forwardZ;
    if (alignment < 0.5) continue;
    const score = candidate.priority * 10 + alignment * 2 - distance;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
