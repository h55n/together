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
const LANTERN_HERO_BASE_Y = cityHeightAt(-30, 75);

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
    for (const point of route.points) {
      if (pointBelongsToChunk(point.x, point.z, chunkX, chunkZ)) addRouteCapLayers(root, route, point, materials);
    }
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
    const sidewalkOffset = route.width / 2 + 1.15;
    const gutterOffset = route.width / 2 + 0.22;
    addRibbon(root, start, end, route.width + 4.4, SURFACE_ELEVATION - 0.012, 'soil', materials, false);
    addOffsetRibbon(root, start, end, 1.55, sidewalkOffset, SURFACE_ELEVATION + 0.052, 'concrete', materials, false);
    addOffsetRibbon(root, start, end, 1.55, -sidewalkOffset, SURFACE_ELEVATION + 0.052, 'concrete', materials, false);
    addOffsetRibbon(root, start, end, 0.42, gutterOffset, SURFACE_ELEVATION + 0.018, 'asphaltPatch', materials, true);
    addOffsetRibbon(root, start, end, 0.42, -gutterOffset, SURFACE_ELEVATION + 0.018, 'asphaltPatch', materials, true);
    addRibbon(root, start, end, route.width, SURFACE_ELEVATION + 0.028, 'asphalt', materials, true);
    return;
  }

  if (route.kind === 'promenade') {
    addRibbon(root, start, end, route.width + 1.6, SURFACE_ELEVATION - 0.008, 'soil', materials, false);
    addRibbon(root, start, end, route.width, SURFACE_ELEVATION, 'concrete', materials, false);
    addOffsetRibbon(root, start, end, 0.38, route.width / 2 - 0.28, SURFACE_ELEVATION + 0.026, 'stone', materials, false);
    addOffsetRibbon(root, start, end, 0.38, -(route.width / 2 - 0.28), SURFACE_ELEVATION + 0.026, 'stone', materials, false);
    addRibbon(root, start, end, Math.max(3.2, route.width * 0.34), SURFACE_ELEVATION + 0.032, 'stone', materials, false);
    return;
  }

  addRibbon(root, start, end, route.width + 1.1, SURFACE_ELEVATION, 'soil', materials, false);
  addRibbon(root, start, end, route.width, SURFACE_ELEVATION + 0.018, 'stone', materials, false);
}

function addRouteCapLayers(
  root: THREE.Group,
  route: CitySurfaceRoute,
  point: SurfacePoint,
  materials: MaterialLibrary,
): void {
  if (route.kind === 'road') {
    addCap(root, point, (route.width + 3.4) / 2, SURFACE_ELEVATION, 'concrete', materials, false);
    addCap(root, point, route.width / 2, SURFACE_ELEVATION + 0.022, 'asphalt', materials, true);
    return;
  }
  if (route.kind === 'promenade') {
    addCap(root, point, route.width / 2, SURFACE_ELEVATION, 'concrete', materials, false);
    addCap(root, point, Math.max(3.2, route.width * 0.34) / 2, SURFACE_ELEVATION + 0.02, 'stone', materials, false);
    return;
  }
  addCap(root, point, (route.width + 1.1) / 2, SURFACE_ELEVATION, 'soil', materials, false);
  addCap(root, point, route.width / 2, SURFACE_ELEVATION + 0.018, 'stone', materials, false);
}

function addCap(
  root: THREE.Group,
  point: SurfacePoint,
  radius: number,
  yOffset: number,
  materialKey: WorldMaterialKey,
  materials: MaterialLibrary,
  receiveShadow: boolean,
): void {
  const segments = 12;
  const positions: number[] = [...surfaceVertex(point.x, point.z, yOffset)];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    positions.push(...surfaceVertex(point.x + Math.cos(angle) * radius, point.z + Math.sin(angle) * radius, yOffset));
  }
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const current = 1 + index;
    const next = 1 + ((index + 1) % segments);
    indices.push(0, next, current);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, materials.get(materialKey));
  mesh.receiveShadow = receiveShadow;
  root.add(mesh);
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

function addOffsetRibbon(
  root: THREE.Group,
  start: SurfacePoint,
  end: SurfacePoint,
  width: number,
  offset: number,
  yOffset: number,
  materialKey: WorldMaterialKey,
  materials: MaterialLibrary,
  receiveShadow: boolean,
): void {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length <= 1e-6) return;
  const normalX = -dz / length;
  const normalZ = dx / length;
  addRibbon(
    root,
    { x: start.x + normalX * offset, z: start.z + normalZ * offset },
    { x: end.x + normalX * offset, z: end.z + normalZ * offset },
    width,
    yOffset,
    materialKey,
    materials,
    receiveShadow,
  );
}

function surfaceVertex(x: number, z: number, yOffset: number): [number, number, number] {
  const terrainY = cityHeightAt(x, z);
  if (insideLanternHeroSurface(x, z)) {
    return [x, Math.min(terrainY + yOffset, LANTERN_HERO_BASE_Y - 0.15), z];
  }
  return [x, terrainY + yOffset, z];
}

function insideLanternHeroSurface(x: number, z: number): boolean {
  return Math.abs(x + 30) <= 12.25 && Math.abs(z - 75) <= 59.5;
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
