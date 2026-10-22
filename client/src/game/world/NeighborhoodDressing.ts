import * as THREE from 'three';
import { pointAllowsLandDressing, terrainHeightAt } from './CoastalShoreline';
import { dressFacade, dressSimpleFacades, hipRoofGeometry } from './FacadeDetails';
import { streetClearanceAt } from './StreetNetwork';
import { AMAYA_BAY_VENUES, cityHeightAt, nearestAmayaBaySurfaceRoute, type BuildingLot, type ChunkDressing, type DressingProp, type ResidencyRing } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { PROPERTY_WORLD_RESERVATIONS } from './PropertyLocations';
import { StaticGeometryCache } from '../assets/runtime/StaticGeometryCache';
import { prepareStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';

const STYLE_MATERIALS: Record<BuildingLot['style'], WorldMaterialKey> = {
  mogra_balcony: 'warmPlaster',
  pg_veranda: 'sagePlaster',
  lantern_shopfront: 'terracottaPlaster',
  lantern_mixed_use: 'warmPlaster',
  rain_tree_old_home: 'sagePlaster',
  civic_modern: 'concrete',
  hill_terrace: 'warmPlaster',
  waterfront_hut: 'wood',
  park_pavilion: 'warmPlaster',
};

// Each style keeps its character while neighbouring lots vary like a lived-in anime street.
const STYLE_WALL_VARIANTS: Partial<Record<BuildingLot['style'], readonly WorldMaterialKey[]>> = {
  mogra_balcony: ['pastelYellow', 'pastelBlue', 'creamPlaster', 'pastelPink', 'warmPlaster'],
  pg_veranda: ['mintPlaster', 'pastelBlue', 'creamPlaster', 'pastelYellow'],
  lantern_shopfront: ['terracottaPlaster', 'pastelYellow', 'pastelPink', 'mintPlaster'],
  lantern_mixed_use: ['creamPlaster', 'pastelYellow', 'terracottaPlaster', 'pastelBlue'],
  rain_tree_old_home: ['mintPlaster', 'creamPlaster', 'pastelYellow', 'sagePlaster', 'pastelPink'],
  civic_modern: ['concrete', 'creamPlaster', 'pastelBlue'],
  hill_terrace: ['creamPlaster', 'pastelPink', 'pastelBlue', 'pastelYellow'],
  waterfront_hut: ['wood', 'pastelBlue', 'mintPlaster'],
  park_pavilion: ['creamPlaster', 'warmPlaster'],
};
const PITCHED_STYLES = new Set<BuildingLot['style']>(['rain_tree_old_home', 'pg_veranda', 'hill_terrace', 'park_pavilion', 'waterfront_hut']);
const ROOFS: readonly WorldMaterialKey[] = ['roofTile', 'roofTile', 'roofSlate', 'roofTeal'];
// Building prototypes are authored with these keys only on walls and roofs, then recoloured per lot.
const WALL_STAND_IN: WorldMaterialKey = 'pastelYellow', ROOF_STAND_IN: WorldMaterialKey = 'roofTile';

function lotHash(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function lotFinish(lot: BuildingLot): { wall: WorldMaterialKey; roof: WorldMaterialKey } {
  const hash = lotHash(lot.id), walls = STYLE_WALL_VARIANTS[lot.style] ?? [STYLE_MATERIALS[lot.style]];
  return { wall: walls[hash % walls.length]!, roof: ROOFS[(hash >>> 8) % ROOFS.length]! };
}

const staticGeometries = new StaticGeometryCache();
const buildingPrototypes = new WeakMap<MaterialLibrary, Map<string, THREE.Group>>();

export function addChunkDressing(
  root: THREE.Group,
  dressing: ChunkDressing,
  chunkOriginX: number,
  chunkOriginZ: number,
  ring: Exclude<ResidencyRing, 'unloaded'>,
  materials: MaterialLibrary,
  physics?: PhysicsWorld,
): void {
  const preparation = prepareChunkDressing(root, dressing, chunkOriginX, chunkOriginZ, ring, materials, physics);
  while (!preparation.next().done) { /* Initial synchronous construction. */ }
}

export function* prepareChunkDressing(
  root: THREE.Group, dressing: ChunkDressing, chunkOriginX: number, chunkOriginZ: number,
  ring: Exclude<ResidencyRing, 'unloaded'>, materials: MaterialLibrary, physics?: PhysicsWorld,
  deferCollider?: (activate: () => void) => void,
): Generator<void, void, void> {
  const colliders: unknown[] = [];
  const previousDispose = root.userData.disposeChunk as (() => void) | undefined;
  root.userData.disposeChunk = () => {
    previousDispose?.();
    for (const collider of colliders.splice(0)) physics?.removeCollider(collider as never);
  };
  const buildingLimit = ring === 'horizon' ? Math.min(4, dressing.buildings.length) : dressing.buildings.length;
  for (const lot of dressing.buildings.slice(0, buildingLimit)) {
    const wx = chunkOriginX + lot.x;
    const wz = chunkOriginZ + lot.z;
    if (Math.abs(wx + 30) < 34 && Math.abs(wz - 75) < 78) continue;
    if (PROPERTY_WORLD_RESERVATIONS.some(({ center, reserveRadius }) => Math.hypot(wx - center.x, wz - center.z) < reserveRadius)) continue;
    if (AMAYA_BAY_VENUES.some((venue) => Math.hypot(wx - venue.position.x, wz - venue.position.z) < Math.max(8, venue.frontageMetres * 0.85))) continue;
    if (wz < -325) continue;
    if (streetClearanceAt(wx, wz) < Math.hypot(lot.width, lot.depth) / 2) continue;
    const y = cityHeightAt(wx, wz);
    const building = ring === 'horizon'
      ? createHorizonVolume(lot, materials)
      : yield* prepareLayeredBuilding(lot, materials, ring === 'active');
    building.position.set(wx, y, wz);
    building.rotation.y = lot.rotationY + Math.PI / 2;
    root.add(building);
    if (ring === 'active' && physics) {
      const activate = () => colliders.push(physics.createFixedCuboid(
        { x: wx, y: y + lot.height / 2, z: wz },
        { x: lot.width / 2, y: lot.height / 2, z: lot.depth / 2 },
        lot.rotationY + Math.PI / 2,
      ));
      if (deferCollider) deferCollider(activate); else activate();
    }
    yield;
  }

  if (ring !== 'horizon') {
    for (const prop of dressing.props) { addProp(root, prop, chunkOriginX, chunkOriginZ, materials, ring === 'active'); yield; }
  }
}

function* prepareLayeredBuilding(lot: BuildingLot, materials: MaterialLibrary, detailed: boolean): Generator<void, THREE.Group, void> {
  let prototypes = buildingPrototypes.get(materials);
  if (!prototypes) {
    prototypes = new Map(); buildingPrototypes.set(materials, prototypes);
    const owned = new Set<THREE.BufferGeometry>();
    materials.onDispose(() => { for (const geometry of owned) geometry.dispose(); prototypes!.clear(); buildingPrototypes.delete(materials); });
    // Each new prototype registers its newly compiled buffers once.
    prototypeGeometryOwners.set(prototypes, owned);
  }
  const key = [lot.style, lot.width, lot.depth, lot.height, lot.balconyCount, detailed].join(':');
  let prototype = prototypes.get(key);
  if (!prototype) {
    const authoring = buildLayeredBuilding(lot, materials, detailed);
    const converted = new Set<THREE.BufferGeometry>();
    const meshes: THREE.Mesh[] = [];
    authoring.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    try {
    yield;
    for (const object of meshes) {
      const original = object.geometry;
      const geometry = original.index ? original.toNonIndexed() : original.clone();
      // These are owned conversion buffers, even when cloned from the shared cache.
      delete geometry.userData.togetherShared;
      converted.add(geometry);
      if (!geometry.hasAttribute('uv')) {
        const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
        const uv = new Float32Array(positions.count * 2);
        for (let i = 0; i < positions.count; i += 1) {
          uv[i * 2] = (Math.abs(normals.getX(i)) > 0.5 ? positions.getZ(i) : positions.getX(i)) / 8;
          uv[i * 2 + 1] = (Math.abs(normals.getY(i)) > 0.5 ? positions.getZ(i) : positions.getY(i)) / 8;
        }
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      }
      object.geometry = geometry;
      if (!original.userData.togetherShared) original.dispose();
      yield;
    }
    prototype = yield* prepareStaticMeshesByMaterial(authoring);
    const owned = prototypeGeometryOwners.get(prototypes)!;
    prototype.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!object.geometry.userData.togetherShared) owned.add(object.geometry);
      object.geometry.userData.togetherShared = true;
    });
    prototypes.set(key, prototype);
    } finally {
      authoring.traverse(object => { if (object instanceof THREE.Mesh && !object.geometry.userData.togetherShared) converted.add(object.geometry); });
      for (const geometry of converted) if (!geometry.userData.togetherShared) geometry.dispose();
    }
  }
  const placement = prototype.clone(true);
  placement.name = `building:${lot.id}:${lot.style}`;
  // Prototypes share geometry; each placement swaps the stand-in wall/roof colours for its own finish.
  const finish = lotFinish(lot), wallStandIn = materials.get(WALL_STAND_IN), roofStandIn = materials.get(ROOF_STAND_IN);
  placement.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.material === wallStandIn) object.material = materials.get(finish.wall);
    else if (object.material === roofStandIn) object.material = materials.get(finish.roof);
  });
  return placement;
}

const prototypeGeometryOwners = new WeakMap<Map<string, THREE.Group>, Set<THREE.BufferGeometry>>();

function buildLayeredBuilding(lot: BuildingLot, materials: MaterialLibrary, detailed: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = `building:${lot.id}:${lot.style}`;

  const pitched = PITCHED_STYLES.has(lot.style);
  const wallMaterial = materials.get(WALL_STAND_IN);
  const body = box(lot.width, lot.height, lot.depth, wallMaterial);
  body.position.y = lot.height / 2;
  body.castShadow = detailed;
  body.receiveShadow = true;
  group.add(body);

  const plinth = box(lot.width + 0.5, 0.38, lot.depth + 0.5, materials.get('stone'));
  plinth.position.y = 0.19;
  group.add(plinth);

  if (pitched) {
    // Deep eaves with a light soffit band, then a saturated tiled hip roof.
    const overhang = 0.75, rise = Math.min(3.2, Math.max(1.4, Math.min(lot.width, lot.depth) * 0.36));
    const soffit = box(lot.width + overhang * 2, 0.16, lot.depth + overhang * 2, materials.get('warmPlaster'));
    soffit.position.y = lot.height + 0.08;
    group.add(soffit);
    const roof = new THREE.Mesh(hipRoofGeometry(lot.width + overhang * 2, lot.depth + overhang * 2, rise), materials.get(ROOF_STAND_IN));
    roof.name = 'pitched-roof';
    roof.position.y = lot.height + 0.16;
    roof.castShadow = detailed;
    roof.receiveShadow = true;
    group.add(roof);
  } else {
    const parapetHeight = lot.style === 'waterfront_hut' || lot.style === 'park_pavilion' ? 0.18 : 0.42;
    const parapet = box(lot.width + 0.28, parapetHeight, lot.depth + 0.28, materials.get('creamPlaster'));
    parapet.position.y = lot.height + parapetHeight / 2;
    group.add(parapet);
    // A coloured cornice band gives flat roofs a crisp painted edge.
    const cornice = box(lot.width + 0.4, 0.16, lot.depth + 0.4, materials.get(ROOF_STAND_IN));
    cornice.position.y = lot.height - 0.05;
    group.add(cornice);
  }

  if (!detailed) { dressSimpleFacades(group, materials, lot.width, lot.depth, lot.height); return group; }

  const faceX = lot.width / 2 + 0.015;

  if (lot.style === 'lantern_shopfront' || lot.style === 'lantern_mixed_use') {
    const shopWindow = box(lot.width * 0.62, 2.3, 0.1, materials.get('glass'));
    shopWindow.position.set(faceX + 0.03, 1.28, -lot.depth * 0.1);
    group.add(shopWindow);
    const awning = box(lot.width * 0.74, 0.14, 1.45, materials.get(lot.style === 'lantern_shopfront' ? 'sagePlaster' : 'terracottaPlaster'));
    awning.rotation.y = Math.PI / 2;
    awning.position.set(faceX + 0.68, 2.72, -lot.depth * 0.08);
    awning.rotation.x = -0.08;
    group.add(awning);
    const sign = box(Math.min(5.8, lot.width * 0.58), 0.55, 0.12, materials.get('curtainWarm'));
    sign.rotation.y = Math.PI / 2;
    sign.position.set(faceX + 0.12, 3.35, -lot.depth * 0.06);
    group.add(sign);
  }

  dressFacade(group, materials, lot.width, lot.depth, lot.height, lot.balconyCount, !pitched);
  if (pitched && lot.style !== 'park_pavilion' && lot.style !== 'waterfront_hut') addFrontYard(group, materials, lot);
  dressSimpleFacades(group, materials, lot.width, lot.depth, lot.height, 'x+');

  if (pitched) return group;
  // Roof/service silhouette: intentionally small but breaks rectangular massing.
  const service = box(Math.min(2.5, lot.width * 0.3), 1.1, Math.min(2.4, lot.depth * 0.25), materials.get('concrete'));
  service.position.set(-lot.width * 0.18, lot.height + 0.55, lot.depth * 0.16);
  group.add(service);
  if (lot.style !== 'waterfront_hut' && lot.style !== 'park_pavilion') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.0, 10), materials.get('metalDark'));
    tank.position.set(lot.width * 0.22, lot.height + 0.62, -lot.depth * 0.14);
    group.add(tank);
  }

  return group;
}
/**
 * A low painted picket fence across the street side with a gate gap at the door, and hedge
 * bushes at its ends. Visual only; built from trim and foliage materials the facade already uses.
 */
function addFrontYard(group: THREE.Group, materials: MaterialLibrary, lot: BuildingLot): void {
  const fenceX = lot.width / 2 + 0.95, half = lot.depth / 2, doorZ = -lot.depth * 0.29;
  const paint = materials.get('warmPlaster'), hedge = materials.get('foliageMid');
  for (let z = -half; z <= half; z += 0.2) {
    if (Math.abs(z - doorZ) < 0.75) continue;
    const picket = box(0.06, 0.82, 0.08, paint);
    picket.position.set(fenceX, 0.41, z);
    group.add(picket);
  }
  for (const [from, to] of [[-half, doorZ - 0.75], [doorZ + 0.75, half]] as const) {
    if (to - from < 0.2) continue;
    for (const y of [0.28, 0.62]) {
      const rail = box(0.05, 0.06, to - from, paint);
      rail.position.set(fenceX - 0.04, y, (from + to) / 2);
      group.add(rail);
    }
  }
  for (const z of [-half + 0.5, half - 0.5]) {
    const bush = box(0.8, 0.75, 1.1, hedge);
    bush.position.set(fenceX - 0.55, 0.38, z);
    group.add(bush);
  }
}

function createHorizonVolume(lot: BuildingLot, materials: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const body = box(lot.width, lot.height * 0.9, lot.depth, materials.get(lotFinish(lot).wall));
  body.position.y = lot.height * 0.45;
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);
  return group;
}

function addProp(
  root: THREE.Group,
  prop: DressingProp,
  originX: number,
  originZ: number,
  materials: MaterialLibrary,
  detailed: boolean,
): void {
  const wx = originX + prop.x;
  const wz = originZ + prop.z;
  if (!pointAllowsLandDressing(wx, wz, 1.2 * prop.scale)) return;
  const nearest = nearestAmayaBaySurfaceRoute(wx, wz);
  // Generation clears route centres, but road sidewalks extend beyond the
  // default setback. Only wholly off-surface props use the lower grass level.
  const surfaceMargin = nearest?.route.kind === 'road' ? 1.7 : nearest?.route.kind === 'promenade' ? 0.8 : 0.55;
  const offSurface = !nearest || nearest.distance > nearest.route.width / 2 + surfaceMargin + 1.2 * prop.scale;
  const y = offSurface ? terrainHeightAt(wx, wz) : cityHeightAt(wx, wz);
  const group = new THREE.Group();
  group.position.set(wx, y, wz);
  group.rotation.y = prop.rotationY;
  group.scale.setScalar(prop.scale);
  group.name = `prop:${prop.kind}:${prop.id}`;

  switch (prop.kind) {
    case 'bench': {
      const seat = box(1.7, 0.12, 0.5, materials.get('wood')); seat.position.y = 0.5; group.add(seat);
      const back = box(1.7, 0.12, 0.5, materials.get('wood')); back.rotation.x = Math.PI / 2; back.position.set(0, 0.85, 0.38); group.add(back);
      for (const side of [-0.62, 0.62]) {
        const leg = box(0.12, 0.44, 0.6, materials.get('metalDark'));
        leg.position.set(side, 0.22, 0.06); group.add(leg);
        const upright = box(0.08, 0.85, 0.08, materials.get('metalDark'));
        upright.position.set(side, 0.425, 0.38); group.add(upright);
      }
      break;
    }
    case 'lamp': {
      const pole = box(0.12, 3.5, 0.12, materials.get('metalDark')); pole.position.y = 1.75; group.add(pole);
      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), materials.get('curtainWarm')); shade.position.y = 3.45; group.add(shade);
      break;
    }
    case 'planter': {
      const pot = box(0.8, 0.45, 0.8, materials.get('terracottaPlaster')); pot.position.y = 0.23; group.add(pot);
      for (const xx of [-0.22, 0, 0.22]) { const stem = box(0.06, 0.65, 0.06, materials.get('foliageDeep')); stem.position.set(xx, 0.72, 0); group.add(stem); }
      break;
    }
    case 'bicycle': {
      for (const xx of [-0.5, 0.5]) { const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.024, 5, 14), materials.get('metalDark')); wheel.rotation.y = Math.PI / 2; wheel.position.set(xx, 0.34, 0); group.add(wheel); }
      const frame = box(0.9, 0.05, 0.05, materials.get('terracottaPlaster')); frame.position.y = 0.48; group.add(frame);
      break;
    }
    case 'crate': { const crate = box(0.8, 0.55, 0.65, materials.get('wood')); crate.position.y = 0.28; group.add(crate); break; }
    case 'awning_post': { const post = box(0.08, 2.25, 0.08, materials.get('metalDark')); post.position.y = 1.13; group.add(post); break; }
    case 'bin': { const bin = box(0.55, 0.75, 0.55, materials.get('metalDark')); bin.position.y = 0.38; group.add(bin); break; }
  }
  group.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = detailed; });
  root.add(group);
}

function box(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(staticGeometries.box(width, height, depth), material);
}
