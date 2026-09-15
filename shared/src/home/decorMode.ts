import type { Placement2D, RoomBounds } from './placement.js';

export function defaultPlacementForRoom(room: RoomBounds): Placement2D {
  return { x: (room.minX + room.maxX) / 2, z: (room.minZ + room.maxZ) / 2, rotationY: 0 };
}

export function snapPlacement(placement: Placement2D, gridMetres: number, rotationDegrees: number): Placement2D {
  return {
    x: gridMetres > 0 ? Math.round(placement.x / gridMetres) * gridMetres : placement.x,
    z: gridMetres > 0 ? Math.round(placement.z / gridMetres) * gridMetres : placement.z,
    rotationY: rotationDegrees > 0 ? snapRadians(placement.rotationY, rotationDegrees) : placement.rotationY,
  };
}

export function rotatePlacement(placement: Placement2D, degrees: number): Placement2D {
  return { ...placement, rotationY: normalizeRadians(placement.rotationY + degrees * Math.PI / 180) };
}

function snapRadians(radians: number, degrees: number): number {
  const step = degrees * Math.PI / 180;
  return normalizeRadians(Math.round(radians / step) * step);
}

function normalizeRadians(radians: number): number {
  const turn = Math.PI * 2;
  return ((radians % turn) + turn) % turn;
}
