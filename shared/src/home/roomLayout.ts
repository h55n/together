import type { Placement2D, RoomBounds } from './placement.js';
import type { StarterPropertyDefinition } from './properties.js';

export function layoutRoomZone(
  property: StarterPropertyDefinition,
  roomId: string,
  shellWidth: number,
  shellDepth: number,
): RoomBounds {
  const index = property.rooms.indexOf(roomId);
  if (index < 0) throw new Error(`Unknown room ${roomId}`);
  const count = property.rooms.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = shellWidth / columns;
  const cellDepth = shellDepth / rows;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const padding = Math.min(0.28, Math.min(cellWidth, cellDepth) * 0.08);
  const minX = -shellWidth / 2 + column * cellWidth + padding;
  const maxX = -shellWidth / 2 + (column + 1) * cellWidth - padding;
  const minZ = -shellDepth / 2 + row * cellDepth + padding;
  const maxZ = -shellDepth / 2 + (row + 1) * cellDepth - padding;
  return { minX, maxX, minZ, maxZ };
}

export function mapRoomPlacementToShell(room: RoomBounds, zone: RoomBounds, placement: Placement2D): Placement2D {
  const roomWidth = room.maxX - room.minX;
  const roomDepth = room.maxZ - room.minZ;
  const nx = roomWidth <= 0 ? 0.5 : (placement.x - room.minX) / roomWidth;
  const nz = roomDepth <= 0 ? 0.5 : (placement.z - room.minZ) / roomDepth;
  return {
    x: zone.minX + Math.max(0, Math.min(1, nx)) * (zone.maxX - zone.minX),
    z: zone.minZ + Math.max(0, Math.min(1, nz)) * (zone.maxZ - zone.minZ),
    rotationY: placement.rotationY,
  };
}
