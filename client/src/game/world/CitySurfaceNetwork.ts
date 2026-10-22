import * as THREE from 'three';
import {
  AMAYA_BAY_SURFACE_ROUTES,
  CHUNK_SIZE_METRES,
  cityHeightAt,
  type CitySurfaceRoute,
  type SurfacePoint,
} from '@together/shared';
import { prepareStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';

const MAX_PIECE_LENGTH = 10;
const SURFACE_ELEVATION = 0.055;
const LANTERN_HERO_BASE_Y = cityHeightAt(-30, 75);
const POLE_EVERY_PIECES = 3;

export function createChunkSurfaceNetwork(
  chunkX: number,
  chunkZ: number,
  materials: MaterialLibrary,
): THREE.Group {
  const iterator = prepareChunkSurfaceNetwork(chunkX, chunkZ, materials);
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}

export function* prepareChunkSurfaceNetwork(
  chunkX: number, chunkZ: number, materials: MaterialLibrary,
): Generator<void, THREE.Group, void> {
  const root = new THREE.Group();
  root.name = 'chunk-surface-network';
  const sourceGeometry = new Set<THREE.BufferGeometry>();
  let capturedChildren = 0;
  let finished = false;
  const captureSources = () => {
    while (capturedChildren < root.children.length) {
      const mesh = root.children[capturedChildren++]! as THREE.Mesh;
      sourceGeometry.add(mesh.geometry);
    }
  };
  try {
  for (const route of AMAYA_BAY_SURFACE_ROUTES) {
    for (const [start, end] of routePieces(route)) {
      const midpointX = (start.x + end.x) / 2;
      const midpointZ = (start.z + end.z) / 2;
      if (!pointBelongsToChunk(midpointX, midpointZ, chunkX, chunkZ)) continue;
      addRouteLayers(root, route, start, end, materials);
      captureSources();
      yield;
    }
    for (const point of route.points) {
      if (!pointBelongsToChunk(point.x, point.z, chunkX, chunkZ)) continue;
      addRouteCapLayers(root, route, point, materials);
      captureSources();
      yield;
    }
    yield;
  }
  yield* prepareStaticMeshesByMaterial(root);
  finished = true;
  return root;
  } finally {
    // Sources belong to this builder; the compiler itself also serves borrowed asset geometry.
    const remaining = new Set<THREE.BufferGeometry>();
    root.traverse(object => { if (object instanceof THREE.Mesh) remaining.add(object.geometry); });
    if (finished) {
      for (const geometry of sourceGeometry) if (!remaining.has(geometry)) geometry.dispose();
    } else {
      for (const geometry of new Set([...sourceGeometry, ...remaining])) geometry.dispose();
      root.clear();
    }
  }
}

/** Lane paint, utility poles and overhead wires for road routes; batched separately from the road surface. */
export function* prepareChunkRoadDressing(
  chunkX: number, chunkZ: number, materials: MaterialLibrary,
): Generator<void, THREE.Group, void> {
  const root = new THREE.Group();
  root.name = 'chunk-road-dressing';
  const sources = new Set<THREE.BufferGeometry>();
  let finished = false;
  try {
    for (const route of AMAYA_BAY_SURFACE_ROUTES) {
      if (route.kind !== 'road') continue;
      const pieces = [...routePieces(route)];
      for (const [index, [start, end]] of pieces.entries()) {
        const midpointX = (start.x + end.x) / 2, midpointZ = (start.z + end.z) / 2;
        // The Lantern hero street authors its own markings, poles and cables.
        if (!pointBelongsToChunk(midpointX, midpointZ, chunkX, chunkZ) || insideLanternHeroSurface(midpointX, midpointZ)) continue;
        addRoadPaint(root, route, start, end, materials);
        if (index % POLE_EVERY_PIECES === 0) addUtilityPole(root, route, start, end, pieces[index + POLE_EVERY_PIECES]?.[0], chunkX, chunkZ, materials);
        yield;
      }
    }
    root.traverse(object => { if (object instanceof THREE.Mesh) sources.add(object.geometry); });
    yield* prepareStaticMeshesByMaterial(root);
    finished = true;
    return root;
  } finally {
    // Merged sources belong to this builder; dispose whatever the compiled group no longer uses.
    const remaining = new Set<THREE.BufferGeometry>();
    root.traverse(object => { if (object instanceof THREE.Mesh) remaining.add(object.geometry); });
    if (finished) for (const geometry of sources) { if (!remaining.has(geometry)) geometry.dispose(); }
    else { for (const geometry of new Set([...sources, ...remaining])) geometry.dispose(); root.clear(); }
  }
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
  setWorldSurfaceUVs(geometry);
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
  setWorldSurfaceUVs(geometry);
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

function setWorldSurfaceUVs(geometry: THREE.BufferGeometry): void {
  const positions = geometry.getAttribute('position');
  const uv = new Float32Array(positions.count * 2);
  // Surface maps repeat eight times, giving a two-metre tile and human-scale paving joints.
  for (let index = 0; index < positions.count; index++) {
    uv[index * 2] = positions.getX(index) / 16;
    uv[index * 2 + 1] = positions.getZ(index) / 16;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
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

function* routePieces(route: CitySurfaceRoute): Generator<readonly [SurfacePoint, SurfacePoint]> {
  for (let index = 1; index < route.points.length; index += 1) {
    const segmentStart = route.points[index - 1]!;
    const segmentEnd = route.points[index]!;
    const length = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.z - segmentStart.z);
    const pieces = Math.max(1, Math.ceil(length / MAX_PIECE_LENGTH));
    for (let piece = 0; piece < pieces; piece += 1) {
      const startT = piece / pieces;
      const endT = (piece + 1) / pieces;
      yield [interpolate(segmentStart, segmentEnd, startT), interpolate(segmentStart, segmentEnd, endT)];
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

/** Painted anime-street markings: a dashed warm centre line and continuous white edge lines. */
function addRoadPaint(root: THREE.Group, route: CitySurfaceRoute, start: SurfacePoint, end: SurfacePoint, materials: MaterialLibrary): void {
  const dashEnd = { x: start.x + (end.x - start.x) * 0.45, z: start.z + (end.z - start.z) * 0.45 };
  addRibbon(root, start, dashEnd, 0.14, SURFACE_ELEVATION + 0.034, 'roadPaint', materials, true);
  for (const side of [-1, 1]) addOffsetRibbon(root, start, end, 0.12, side * (route.width / 2 - 0.3), SURFACE_ELEVATION + 0.034, 'roadLine', materials, true);
}

/**
 * A wooden utility pole on the verge with three sagging wires to the next pole.
 * Purely visual and placed outside the sidewalk; wires are clipped to the owning chunk.
 */
function addUtilityPole(
  root: THREE.Group, route: CitySurfaceRoute, start: SurfacePoint, end: SurfacePoint,
  nextStart: SurfacePoint | undefined, chunkX: number, chunkZ: number, materials: MaterialLibrary,
): void {
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  if (length <= 1e-6) return;
  const nx = -dz / length, nz = dx / length, offset = route.width / 2 + 2.05;
  const pole = { x: start.x + nx * offset, z: start.z + nz * offset };
  const minX = chunkX * CHUNK_SIZE_METRES, minZ = chunkZ * CHUNK_SIZE_METRES;
  // Keep the crossarm inside this chunk so chunk geometry never spills into a neighbour.
  if (pole.x < minX + 1 || pole.x > minX + CHUNK_SIZE_METRES - 1 || pole.z < minZ + 1 || pole.z > minZ + CHUNK_SIZE_METRES - 1) return;
  const baseY = cityHeightAt(pole.x, pole.z), yaw = Math.atan2(nx, nz);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 7), materials.get('wood'));
  post.position.set(pole.x, baseY + 3.75, pole.z);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.7), materials.get('wood'));
  arm.position.set(pole.x, baseY + 7.05, pole.z);
  arm.rotation.y = yaw;
  for (const mesh of [post, arm]) { mesh.castShadow = true; mesh.updateMatrix(); mesh.geometry.applyMatrix4(mesh.matrix); mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); root.add(mesh); }
  if (!nextStart) return;
  const next = { x: nextStart.x + nx * offset, z: nextStart.z + nz * offset };
  const nextY = cityHeightAt(next.x, next.z);
  for (const across of [-0.7, 0, 0.7]) {
    const from = new THREE.Vector3(pole.x + nx * across, baseY + 7.15, pole.z + nz * across);
    const to = new THREE.Vector3(next.x + nx * across, nextY + 7.15, next.z + nz * across);
    const middle = from.clone().lerp(to, 0.5);
    middle.y -= 0.45;
    addWire(root, from, middle, minX, minZ, materials);
    addWire(root, middle, to, minX, minZ, materials);
  }
}

function addWire(root: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, minX: number, minZ: number, materials: MaterialLibrary): void {
  // Liang-Barsky clip in plan: each chunk owns only its own span of cable.
  let t0 = 0, t1 = 1;
  const dx = end.x - start.x, dz = end.z - start.z;
  for (const [p, q] of [[-dx, start.x - minX], [dx, minX + CHUNK_SIZE_METRES - start.x], [-dz, start.z - minZ], [dz, minZ + CHUNK_SIZE_METRES - start.z]] as const) {
    if (p === 0) { if (q < 0) return; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  if (t0 >= t1) return;
  const from = start.clone().lerp(end, t0), to = start.clone().lerp(end, t1), lift = new THREE.Vector3(0, 0.025, 0);
  const corners = [from.clone().sub(lift), to.clone().sub(lift), to.clone().add(lift), from.clone().add(lift)];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(point => [point.x, point.y, point.z]), 3));
  // Both windings so the thin cable ribbon shows from either side of the street.
  geometry.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  // Opposite windings share vertices, so computed normals would cancel; light the cable from above.
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  root.add(new THREE.Mesh(geometry, materials.get('metalDark')));
}
