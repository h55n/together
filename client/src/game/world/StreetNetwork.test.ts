import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';
import { AUTHORED_STREETS, buildStreetChunk, streetClearanceAt, streetFrontageLotsForChunk } from './StreetNetwork';

describe('authored street network', () => {
  it('places deterministic street-facing buildings outside the carriageway and leaves coastal and park districts open', () => {
    const first = streetFrontageLotsForChunk(-2, -1);
    expect(first.length).toBeGreaterThan(0);
    expect(first).toEqual(streetFrontageLotsForChunk(-2, -1));
    for (const lot of first) {
      const x = -256 + lot.x, z = -128 + lot.z;
      expect(streetClearanceAt(x, z)).toBeGreaterThan(Math.hypot(lot.width, lot.depth) / 2);
      expect(lot.x).toBeGreaterThanOrEqual(0); expect(lot.x).toBeLessThan(128);
      expect(lot.z).toBeGreaterThanOrEqual(0); expect(lot.z).toBeLessThan(128);
      expect(lot.id).toContain('street-frontage:');
    }
  });
  it('matches the complete authored corridor when finding the nearest street', () => {
    const points = AUTHORED_STREETS.flatMap(road => {
      const curve = new THREE.CatmullRomCurve3(road.points.map(([x,z]) => new THREE.Vector3(x,0,z)), false, 'centripetal');
      const count = Math.ceil(curve.getLength() / 3);
      return Array.from({ length: count + 1 }, (_, i) => ({ position: curve.getPoint(i / count), margin: road.width / 2 + 3.2 }));
    });
    for (let i = 0; i < 100; i += 1) {
      const x = -440 + (i * 179 % 880), z = -440 + (i * 317 % 880);
      const expected = Math.min(...points.map(point => Math.hypot(point.position.x - x, point.position.z - z) - point.margin));
      expect(streetClearanceAt(x, z)).toBeCloseTo(expected, 8);
    }
  });
  it('reserves the Lantern approach so buildings cannot block its carriageway', () => {
    expect(streetClearanceAt(-30, -15)).toBeLessThan(0);
    expect(streetClearanceAt(-440, 420)).toBeGreaterThan(20);
  });
  it('builds finite terrain-following surfaces only in the requested chunk', () => {
    const group = buildStreetChunk(-1, -1, 'active', new MaterialLibrary());
    const bounds = new THREE.Box3().setFromObject(group);
    expect(group.children.length).toBeGreaterThan(0);
    expect(bounds.min.x).toBeGreaterThanOrEqual(-129);
    expect(bounds.max.x).toBeLessThanOrEqual(1);
    expect(bounds.min.z).toBeGreaterThanOrEqual(-129);
    expect(bounds.max.z).toBeLessThanOrEqual(1);
    expect(Number.isFinite(bounds.max.y)).toBe(true);
  });
});
