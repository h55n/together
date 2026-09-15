const HALF_CITY = 450;

export function isInsideAmayaBay(x: number, z: number): boolean {
  return Math.abs(x) <= HALF_CITY && Math.abs(z) <= HALF_CITY;
}

/** Deterministic authored-height approximation used by runtime chunks and debug tools. */
export function cityHeightAt(x: number, z: number): number {
  if (!isInsideAmayaBay(x, z)) return -2;

  const urbanUndulation = 0.38 + Math.sin(x * 0.009) * 0.12 + Math.cos(z * 0.011) * 0.1;
  const hillDistanceSq = ((x - 265) ** 2) / (175 ** 2) + ((z - 275) ** 2) / (160 ** 2);
  const hill = 25 * Math.exp(-hillDistanceSq * 2.1);

  const waterfrontFactor = smoothstep(-205, -385, z);
  const waterfront = -urbanUndulation * waterfrontFactor * 0.92;
  const rainTreeRise = 1.4 * Math.exp(-(((x + 210) / 145) ** 2 + ((z + 95) / 125) ** 2) * 1.7);

  return Math.max(0.2, urbanUndulation + hill + waterfront + rainTreeRise);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
