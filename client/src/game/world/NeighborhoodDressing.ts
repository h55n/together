import * as THREE from 'three';
import { dressFacade, dressSimpleFacades } from './FacadeDetails';
import { streetClearanceAt } from './StreetNetwork';
import { AMAYA_BAY_VENUES, cityHeightAt, type BuildingLot, type ChunkDressing, type DressingProp, type ResidencyRing } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { PROPERTY_WORLD_RESERVATIONS } from './PropertyLocations';
import { StaticGeometryCache } from '../assets/runtime/StaticGeometryCache';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';

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
  const colliders: unknown[] = [];
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
      : createLayeredBuilding(lot, materials, ring === 'active');
    building.position.set(wx, y, wz);
    building.rotation.y = lot.rotationY;
    root.add(building);
    if (ring === 'active' && physics) {
      colliders.push(physics.createFixedCuboid(
        { x: wx, y: y + lot.height / 2, z: wz },
        { x: lot.width / 2, y: lot.height / 2, z: lot.depth / 2 },
        lot.rotationY,
      ));
    }
  }

  if (ring !== 'horizon') {
    for (const prop of dressing.props) addProp(root, prop, chunkOriginX, chunkOriginZ, materials, ring === 'active');
  }

  if (physics && colliders.length > 0) {
    root.userData.disposeChunk = () => {
      for (const collider of colliders) physics.removeCollider(collider as never);
    };
  }
}

function createLayeredBuilding(lot: BuildingLot, materials: MaterialLibrary, detailed: boolean): THREE.Group {
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
    authoring.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = object.geometry;
      const geometry = original.index ? original.toNonIndexed() : original.clone();
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
    });
    prototype = compileStaticMeshesByMaterial(authoring);
    const owned = prototypeGeometryOwners.get(prototypes)!;
    prototype.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (!object.geometry.userData.togetherShared) owned.add(object.geometry);
      object.geometry.userData.togetherShared = true;
    });
    prototypes.set(key, prototype);
  }
  const placement = prototype.clone(true);
  placement.name = `building:${lot.id}:${lot.style}`;
  return placement;
}

const prototypeGeometryOwners = new WeakMap<Map<string, THREE.Group>, Set<THREE.BufferGeometry>>();

function buildLayeredBuilding(lot: BuildingLot, materials: MaterialLibrary, detailed: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = `building:${lot.id}:${lot.style}`;
  const body = box(lot.width, lot.height, lot.depth, materials.get(STYLE_MATERIALS[lot.style]));
  body.position.y = lot.height / 2;
  body.castShadow = detailed;
  body.receiveShadow = true;
  group.add(body);

  const plinth = box(lot.width + 0.4, 0.35, lot.depth + 0.45, materials.get('stone'));
  plinth.position.y = 0.18;
  group.add(plinth);
  const parapet = box(lot.width + 0.25, 0.32, lot.depth + 0.25, materials.get('stone'));
  parapet.position.y = lot.height + 0.16;
  group.add(parapet);

  if (!detailed) { dressSimpleFacades(group, materials, lot.width, lot.depth, lot.height); return group; }

  const faceX = lot.width / 2 + 0.015;

  if (lot.style === 'lantern_shopfront' || lot.style === 'lantern_mixed_use') {
    const shopWindow = box(0.09, 2.25, Math.min(4.8, lot.depth * 0.55), materials.get('glass'));
    shopWindow.position.set(faceX + 0.03, 1.25, 0);
    group.add(shopWindow);
    const awning = box(1.35, 0.14, Math.min(5.2, lot.depth * 0.6), materials.get(lot.style === 'lantern_shopfront' ? 'sagePlaster' : 'terracottaPlaster'));
    awning.position.set(faceX + 0.63, 2.65, 0);
    awning.rotation.z = -0.08;
    group.add(awning);
  }

  dressFacade(group, materials, lot.width, lot.depth, lot.height, lot.balconyCount);
  dressSimpleFacades(group, materials, lot.width, lot.depth, lot.height, 'x+');

  // Roof/service silhouette: intentionally small but breaks rectangular massing.
  const service = box(Math.min(2.5, lot.width * 0.3), 1.1, Math.min(2.4, lot.depth * 0.25), materials.get('concrete'));
  service.position.set(-lot.width * 0.18, lot.height + 0.55, lot.depth * 0.16);
  group.add(service);
  return group;
}

function createHorizonVolume(lot: BuildingLot, materials: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const body = box(lot.width, lot.height * 0.9, lot.depth, materials.get(STYLE_MATERIALS[lot.style]));
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
  const y = cityHeightAt(wx, wz);
  const group = new THREE.Group();
  group.position.set(wx, y, wz);
  group.rotation.y = prop.rotationY;
  group.scale.setScalar(prop.scale);
  group.name = `prop:${prop.kind}:${prop.id}`;

  switch (prop.kind) {
    case 'bench': {
      const seat = box(1.7, 0.12, 0.5, materials.get('wood')); seat.position.y = 0.5; group.add(seat);
      const back = box(1.7, 0.12, 0.5, materials.get('wood')); back.position.set(0, 0.85, 0.38); group.add(back);
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
