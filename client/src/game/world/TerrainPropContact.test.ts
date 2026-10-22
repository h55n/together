import * as THREE from 'three';
import { expect, it } from 'vitest';
import { AMAYA_BAY_SURFACE_ROUTES, CHUNK_SIZE_METRES, cityHeightAt, generateChunkDressing, nearestAmayaBaySurfaceRoute, pointClearsSurfaceRoutes } from '@together/shared';
import { coastalTerrainLowering } from './CoastalShoreline';
import { addChunkDressing } from './NeighborhoodDressing';
import { MaterialLibrary } from './MaterialLibrary';
import { disposeGroup } from './WorldStreamer';
import { createAmayaBayChunkFactory } from './AmayaBayChunkFactory';

it('places actual generated land bench feet at the rendered terrain height', () => {
  const materials = new MaterialLibrary();
  let benchesChecked = 0;
  try {
    for (const [chunkX, chunkZ] of [[-3, 1], [-2, 1], [-4, 2]] as const) {
      const dressing = generateChunkDressing(chunkX, chunkZ, 'mogra_court');
      const root = new THREE.Group();
      try {
        addChunkDressing(root, { buildings: [], props: dressing.props }, chunkX * CHUNK_SIZE_METRES, chunkZ * CHUNK_SIZE_METRES, 'active', materials);
        for (const prop of dressing.props) {
          const x = chunkX * CHUNK_SIZE_METRES + prop.x, z = chunkZ * CHUNK_SIZE_METRES + prop.z;
          expect(pointClearsSurfaceRoutes(x, z)).toBe(true);
          const nearest = nearestAmayaBaySurfaceRoute(x, z);
          const edge = nearest?.route.kind === 'road' ? 1.7 : nearest?.route.kind === 'promenade' ? 0.8 : 0.55;
          if (prop.kind !== 'bench' || (nearest && nearest.distance <= nearest.route.width / 2 + edge + 1.2 * prop.scale)) continue;
          const bench = root.getObjectByName(`prop:bench:${prop.id}`)!;
          const bounds = new THREE.Box3().setFromObject(bench);
          const groundY = cityHeightAt(x, z) - 0.16 - coastalTerrainLowering(x, z);
          expect(Math.abs(bounds.min.y - groundY)).toBeLessThan(0.001);
          benchesChecked++;
        }
      } finally { disposeGroup(root); }
    }
    expect(benchesChecked).toBeGreaterThan(0);
  } finally { materials.dispose(); }
});

it('preserves existing loose-prop height when its footprint occupies pavement', () => {
  const materials = new MaterialLibrary(), root = new THREE.Group();
  const route = AMAYA_BAY_SURFACE_ROUTES[0]!, point = route.points[0]!;
  try {
    addChunkDressing(root, { buildings: [], props: [{ id: 'paved', kind: 'bench', x: point.x, z: point.z, rotationY: 0, scale: 1 }] }, 0, 0, 'active', materials);
    expect(root.getObjectByName('prop:bench:paved')?.position.y).toBe(cityHeightAt(point.x, point.z));
  } finally { disposeGroup(root); materials.dispose(); }
});

it('retains the exact authored terrain position, normal and index buffers across rings', () => {
  const materials = new MaterialLibrary(), factory = createAmayaBayChunkFactory(materials);
  try {
    for (const ring of ['active', 'visual', 'horizon'] as const) {
      for (const [chunkX, chunkZ] of [[-3, 1], [0, -3], [1, -3]] as const) {
        const root = factory(chunkX, chunkZ, ring, 'far');
        const reference = new THREE.PlaneGeometry(CHUNK_SIZE_METRES, CHUNK_SIZE_METRES, ring === 'active' ? 10 : ring === 'visual' ? 5 : 1, ring === 'active' ? 10 : ring === 'visual' ? 5 : 1);
        try {
          reference.rotateX(-Math.PI / 2);
          const positions = reference.getAttribute('position');
          const centerX = (chunkX + 0.5) * CHUNK_SIZE_METRES, centerZ = (chunkZ + 0.5) * CHUNK_SIZE_METRES;
          for (let i = 0; i < positions.count; i++) {
            const x = centerX + positions.getX(i), z = centerZ + positions.getZ(i);
            positions.setY(i, cityHeightAt(x, z) - 0.16 - coastalTerrainLowering(x, z));
          }
          reference.computeVertexNormals();
          const terrain = root.children[0] as THREE.Mesh;
          for (const attribute of ['position', 'normal']) expect(Array.from(terrain.geometry.getAttribute(attribute).array)).toEqual(Array.from(reference.getAttribute(attribute).array));
          expect(terrain.geometry.index?.array).toEqual(reference.index?.array);
        } finally { reference.dispose(); disposeGroup(root); }
      }
    }
  } finally { materials.dispose(); }
});
