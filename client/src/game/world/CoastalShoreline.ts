/** The stepped public lookout reaches the water sooner; the kayak cove keeps its deeper shore. */
export function shorelineZAt(x: number): number {
  const smooth = (t: number): number => {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  };
  const approach = smooth((x - 5) / 25);
  const departure = 1 - smooth((x - 105) / 25);
  return -335 + 23 * approach * departure;
}

/** Carve a walkable foreshore below the sea plane without lowering inland venues. */
export function coastalTerrainLowering(x: number, z: number): number {
  const shore = shorelineZAt(x);
  const progress = Math.max(0, Math.min(1, (shore + 10 - z) / 10));
  const foreshore = 1.6 * progress * progress * (3 - 2 * progress);
  // The public stair flight needs the terrain beneath its treads carved from
  // the promenade edge onward; otherwise later steps are buried by the chunk.
  const central = Math.max(0, Math.min(1, (x - 20) / 15)) * Math.max(0, Math.min(1, (115 - x) / 15));
  const stairRun = Math.max(0, Math.min(1, (-291 - z) / 21));
  return Math.max(foreshore, central * 1.6 * stairRun);
}
