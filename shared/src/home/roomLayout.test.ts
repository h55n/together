import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutRoomZone, mapRoomPlacementToShell } from './roomLayout.js';
import { starterPropertyById } from './properties.js';

test('every starter room receives a deterministic physical zone inside its shell', () => {
  const property = starterPropertyById('pg_house')!;
  for (const roomId of property.rooms) {
    const zone = layoutRoomZone(property, roomId, 18, 13);
    assert.ok(zone.minX >= -9 && zone.maxX <= 9);
    assert.ok(zone.minZ >= -6.5 && zone.maxZ <= 6.5);
    assert.ok(zone.maxX > zone.minX && zone.maxZ > zone.minZ);
  }
});

test('room-local centre maps to the centre of its physical shell zone', () => {
  const property = starterPropertyById('one_bhk')!;
  const room = property.roomBounds.living!;
  const zone = layoutRoomZone(property, 'living', 13.5, 10);
  const world = mapRoomPlacementToShell(room, zone, { x: (room.minX + room.maxX) / 2, z: (room.minZ + room.maxZ) / 2, rotationY: 0.5 });
  assert.ok(Math.abs(world.x - (zone.minX + zone.maxX) / 2) < 1e-9);
  assert.ok(Math.abs(world.z - (zone.minZ + zone.maxZ) / 2) < 1e-9);
  assert.equal(world.rotationY, 0.5);
});
