import * as THREE from 'three';
import {
  AMAYA_BAY_SURFACE_ROUTES,
  CHUNK_SIZE_METRES,
  cityHeightAt,
  type CitySurfaceRoute,
  type SurfacePoint,
} from '@together/shared';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';

const MAX_PIECE_LENGTH = 10;
const SURFACE_ELEVATION = 0.055;

export function createChunkSurfaceNetwork(
  chunkX: number,
  chunkZ: number,
  materials: MaterialLibrary,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'chunk-surface-network';

  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    forEachRoutePiece(route, (start, end) => {
      const midpointX = (start.x + end.x) / 2;
      const midpointZ = (start.z + end.z) / 2;
      if (!pointBelongsToChunk(midpointX, midpointZ, chunkX, chunkZ)) return;
      addRouteLayers(root, route, start, end, materials);
    });
  }

  compileStaticMeshesByMaterial(root);
  return root;
}

function addRouteLayers(
  root: THREE.Group,
  route: CitySurfaceRoute,
  start: SurfacePoint,
  end: SurfacePoint,
  materials: MaterialLibrary,
): void {
  if (route.kind === 'road') {
    addRibbon(root, start, end, route.width + 3.4, SURFACE_ELEVATION, 'concrete', materials, false);
    addRibbon(root, start, end, route.width, SURFACE_ELEVATION + 0.022, 'asphalt', materials, true);
    addRibbon(root, start, end, 0.16, SURFACE_ELEVATION + 0.03, 'asphaltPatch', materials, false);
    return;
  }

  if (route.kind === 'promenade') {
    addRibbon(root, start, end, route.width, SURFACE_ELEVATION, 'concrete', materials, false);
    addRibbon(root, start, end, Math.max(3.2, route.width * 0.34), SURFACE_ELEVATION + 0.02, 'stone', materials, false);
    return;
  }

  addRibbon(root, start, end, route.width + 1.1, SURFACE_ELEVATION, 'soil', materials, false);
  addRibbon(root, start, end, route.width, SURFACE_ELEVATION + 0.018, 'stone', materials, false);
}

function addRibbon(
  root: THREE.Group,
  start: SurfacePoint,
  end: SurfacePoint,
  width: number,
  yOffset: number,
  materialKey: WorldMaterialKey,
  materials: MaterialLibrary,
  receiveShadow: boolean,
): void {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-6) return;

  const halfWidth = width / 2;
  const normalX = -dz / length;
  const normalZ = dx / length;
  const vertices = [
    surfaceVertex(start.x + normalX * halfWidth, start.z + normalZ * halfWidth, yOffset),
    surfaceVertex(start.x - normalX * halfWidth, start.z - normalZ * halfWidth, yOffset),
    surfaceVertex(end.x + normalX * halfWidth, end.z + normalZ * halfWidth, yOffset),
    surfaceVertex(end.x - normalX * halfWidth, end.z - normalZ * halfWidth, yOffset),
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setIndex([0, 2, 1, 2, 3, 1]);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, materials.get(materialKey));
  mesh.receiveShadow = receiveShadow;
  root.add(mesh);
}

function surfaceVertex(x: number, z: number, yOffset: number): [number, number, number] {
  return [x, cityHeightAt(x, z) + yOffset, z];
}

function forEachRoutePiece(route: CitySurfaceRoute, visit: (start: SurfacePoint, end: SurfacePoint) => void): void {
  for (let index = 1; index < route.points.length; index += 1) {
    const segmentStart = route.points[index - 1]!;
    const segmentEnd = route.points[index]!;
    const length = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.z - segmentStart.z);
    const pieces = Math.max(1, Math.ceil(length / MAX_PIECE_LENGTH));
    for (let piece = 0; piece < pieces; piece += 1) {
      const startT = piece / pieces;
      const endT = (piece + 1) / pieces;
      visit(interpolate(segmentStart, segmentEnd, startT), interpolate(segmentStart, segmentEnd, endT));
    }
  }
}

function interpolate(start: SurfacePoint, end: SurfacePoint, t: number): SurfacePoint {
  return {
    x: start.x + (end.x - start.x) * t,
    z: start.z + (end.z - start.z) * t,
  };
}

function pointBelongsToChunk(x: number, z: number, chunkX: number, chunkZ: number): boolean {
  const minX = chunkX * CHUNK_SIZE_METRES;
  const minZ = chunkZ * CHUNK_SIZE_METRES;
  return x >= minX && x < minX + CHUNK_SIZE_METRES && z >= minZ && z < minZ + CHUNK_SIZE_METRES;
}
