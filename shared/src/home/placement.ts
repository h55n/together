export type RoomBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type PlacementFootprint = { width: number; depth: number; clearance?: number };
export type Placement2D = { x: number; z: number; rotationY: number };
export type ExistingPlacement = { id: string; footprint: PlacementFootprint; placement: Placement2D };
export type PlacementValidation = { valid: true } | { valid: false; reason: 'outside_room' | 'overlap' | 'invalid_geometry' };

type Vec2 = { x: number; z: number };

export function validateFurniturePlacement(
  room: RoomBounds,
  footprint: PlacementFootprint,
  placement: Placement2D,
  existing: readonly ExistingPlacement[],
): PlacementValidation {
  if (!validFinite(room.minX, room.maxX, room.minZ, room.maxZ, footprint.width, footprint.depth, placement.x, placement.z, placement.rotationY)
    || room.maxX <= room.minX || room.maxZ <= room.minZ || footprint.width <= 0 || footprint.depth <= 0) {
    return { valid: false, reason: 'invalid_geometry' };
  }
  const polygon = footprintCorners(footprint, placement);
  if (polygon.some((point) => point.x < room.minX || point.x > room.maxX || point.z < room.minZ || point.z > room.maxZ)) {
    return { valid: false, reason: 'outside_room' };
  }
  for (const object of existing) {
    if (obbOverlap(polygon, footprintCorners(object.footprint, object.placement))) return { valid: false, reason: 'overlap' };
  }
  return { valid: true };
}

function footprintCorners(footprint: PlacementFootprint, placement: Placement2D): Vec2[] {
  const extra = Math.max(0, footprint.clearance ?? 0);
  const halfW = footprint.width / 2 + extra;
  const halfD = footprint.depth / 2 + extra;
  const cos = Math.cos(placement.rotationY);
  const sin = Math.sin(placement.rotationY);
  return [
    rotateTranslate(-halfW, -halfD, cos, sin, placement),
    rotateTranslate(halfW, -halfD, cos, sin, placement),
    rotateTranslate(halfW, halfD, cos, sin, placement),
    rotateTranslate(-halfW, halfD, cos, sin, placement),
  ];
}

function rotateTranslate(x: number, z: number, cos: number, sin: number, placement: Placement2D): Vec2 {
  return { x: placement.x + x * cos - z * sin, z: placement.z + x * sin + z * cos };
}

function obbOverlap(a: Vec2[], b: Vec2[]): boolean {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i += 1) {
      const p = polygon[i]!;
      const q = polygon[(i + 1) % polygon.length]!;
      const axis = { x: -(q.z - p.z), z: q.x - p.x };
      const aProjection = project(a, axis);
      const bProjection = project(b, axis);
      if (aProjection.max <= bProjection.min || bProjection.max <= aProjection.min) return false;
    }
  }
  return true;
}

function project(points: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const value = point.x * axis.x + point.z * axis.z;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function validFinite(...values: number[]): boolean {
  return values.every(Number.isFinite);
}
