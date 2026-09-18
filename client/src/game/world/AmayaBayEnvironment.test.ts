import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { nearestAmayaBaySurfaceRoute } from '@together/shared';
import { MaterialLibrary } from './MaterialLibrary';
import { AmayaBayEnvironment } from './AmayaBayEnvironment';
import { PROPERTY_WORLD_PLACEMENTS } from './PropertyLocations';

describe('AmayaBayEnvironment', () => {
  it('keeps water and named hero landmarks permanent, but not streamed route geometry', () => {
    const environment = new AmayaBayEnvironment(new MaterialLibrary());
    const names = environment.root.children.map((child) => child.name);

    expect(names).not.toContain('amaya-road-network');
    expect(names).toContain('landmark:bay-steps');
    expect(names).toContain('landmark:mogra-park');
  });

  it('keeps the shared street network outside starter property reservations', () => {
    for (const [propertyId, placement] of Object.entries(PROPERTY_WORLD_PLACEMENTS)) {
      const nearest = nearestAmayaBaySurfaceRoute(placement.center.x, placement.center.z);
      expect(nearest, `${propertyId} should resolve a nearby route`).toBeTruthy();
      expect(
        nearest!.distance,
        `${nearest!.route.id} intrudes into the ${propertyId} reservation`,
      ).toBeGreaterThan(placement.reserveRadius + nearest!.route.width / 2 + 2);
    }
  });

  it('keeps permanent Mogra Court geometry outside every starter property reservation', () => {
    const environment = new AmayaBayEnvironment(new MaterialLibrary());
    const mograCourt = environment.root.getObjectByName('landmark:mogra-court');

    expect(mograCourt).toBeDefined();
    mograCourt!.updateMatrixWorld(true);

    for (const [propertyId, placement] of Object.entries(PROPERTY_WORLD_PLACEMENTS)) {
      let touchesReservation = false;
      mograCourt!.traverse((object) => {
        if (touchesReservation || !(object instanceof THREE.Mesh)) return;
        touchesReservation = meshTouchesReservation(object, placement.center, placement.reserveRadius);
      });

      expect(touchesReservation, `Mogra Court overlaps the ${propertyId} reservation`).toBe(false);
    }
  });
});

function meshTouchesReservation(
  mesh: THREE.Mesh,
  center: { x: number; z: number },
  radius: number,
): boolean {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const positions = geometry.getAttribute('position');
  if (!positions) return false;

  const index = geometry.index;
  const triangleCount = Math.floor((index?.count ?? positions.count) / 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const radiusSquared = radius * radius;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const ia = index ? index.getX(offset) : offset;
    const ib = index ? index.getX(offset + 1) : offset + 1;
    const ic = index ? index.getX(offset + 2) : offset + 2;

    a.fromBufferAttribute(positions, ia).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(positions, ib).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(positions, ic).applyMatrix4(mesh.matrixWorld);

    if (distanceSquaredToProjectedTriangle(center, a, b, c) <= radiusSquared) return true;
  }

  return false;
}

function distanceSquaredToProjectedTriangle(
  point: { x: number; z: number },
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): number {
  const crossAB = cross2d(a, b, point);
  const crossBC = cross2d(b, c, point);
  const crossCA = cross2d(c, a, point);
  const hasNegative = crossAB < -1e-6 || crossBC < -1e-6 || crossCA < -1e-6;
  const hasPositive = crossAB > 1e-6 || crossBC > 1e-6 || crossCA > 1e-6;
  const area = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));

  if (area > 1e-6 && !(hasNegative && hasPositive)) return 0;

  return Math.min(
    distanceSquaredToSegment(point, a, b),
    distanceSquaredToSegment(point, b, c),
    distanceSquaredToSegment(point, c, a),
  );
}

function cross2d(a: THREE.Vector3, b: THREE.Vector3, point: { x: number; z: number }): number {
  return (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
}

function distanceSquaredToSegment(
  point: { x: number; z: number },
  a: THREE.Vector3,
  b: THREE.Vector3,
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-12) {
    const px = point.x - a.x;
    const pz = point.z - a.z;
    return px * px + pz * pz;
  }

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared));
  const nearestX = a.x + t * dx;
  const nearestZ = a.z + t * dz;
  const px = point.x - nearestX;
  const pz = point.z - nearestZ;
  return px * px + pz * pz;
}
