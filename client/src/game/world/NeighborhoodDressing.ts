import * as THREE from 'three';
import { AMAYA_BAY_VENUES, cityHeightAt, type BuildingLot, type ChunkDressing, type DressingProp, type ResidencyRing } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { PROPERTY_WORLD_RESERVATIONS } from './PropertyLocations';
import { StaticGeometryCache } from '../assets/runtime/StaticGeometryCache';

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
  const group = new THREE.Group();
  group.name = `building:${lot.id}:${lot.style}`;

  const wallMaterial = materials.get(STYLE_MATERIALS[lot.style]);
  const body = box(lot.width, lot.height, lot.depth, wallMaterial);
  body.position.y = lot.height / 2;
  body.castShadow = detailed;
  body.receiveShadow = true;
  group.add(body);

  const plinth = box(lot.width + 0.5, 0.38, lot.depth + 0.5, materials.get('stone'));
  plinth.position.y = 0.19;
  group.add(plinth);

  const parapetHeight = lot.style === 'waterfront_hut' || lot.style === 'park_pavilion' ? 0.18 : 0.42;
  const parapet = box(lot.width + 0.28, parapetHeight, lot.depth + 0.28, materials.get('stone'));
  parapet.position.y = lot.height + parapetHeight / 2;
  group.add(parapet);

  if (!detailed) return group;

  const frontZ = -lot.depth / 2 - 0.02;
  const rearZ = lot.depth / 2 + 0.02;
  const floors = Math.max(1, Math.floor(lot.height / 3.05));
  const frontColumns = Math.max(2, Math.floor(lot.width / 3.8));

  // Recessed entry gives every procedural building a readable public-facing front.
  const entranceWidth = Math.min(1.5, Math.max(1.05, lot.width * 0.14));
  const entrance = box(entranceWidth, 2.25, 0.14, materials.get('wood'));
  entrance.position.set(lot.width * 0.28, 1.13, frontZ - 0.03);
  group.add(entrance);
  const entranceCanopy = box(Math.min(3.2, lot.width * 0.34), 0.14, 1.0, materials.get('stone'));
  entranceCanopy.position.set(lot.width * 0.28, 2.42, frontZ - 0.45);
  group.add(entranceCanopy);

  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.55 + floor * 3.0;
    for (let col = 0; col < frontColumns; col += 1) {
      const x = -lot.width / 2 + ((col + 0.5) / frontColumns) * lot.width;
      if (floor === 0 && Math.abs(x - lot.width * 0.28) < entranceWidth) continue;
      const windowWidth = Math.min(1.75, lot.width / frontColumns - 0.42);
      const window = box(windowWidth, 1.25, 0.09, materials.get('glass'));
      window.position.set(x, y, frontZ);
      window.castShadow = false;
      group.add(window);
      const sill = box(windowWidth + 0.28, 0.12, 0.35, materials.get('concrete'));
      sill.position.set(x, y - 0.72, frontZ - 0.12);
      group.add(sill);

      if (floor > 0 && col % 2 === 0) {
        const rearWindow = box(windowWidth * 0.86, 1.12, 0.08, materials.get('glass'));
        rearWindow.position.set(x, y, rearZ);
        group.add(rearWindow);
      }
    }
  }

  const sideRows = Math.max(1, Math.floor(lot.depth / 5.4));
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < sideRows; row += 1) {
      const z = -lot.depth * 0.28 + row * Math.min(4.6, lot.depth / Math.max(1, sideRows));
      const sideWindow = box(0.08, 1.05, 1.45, materials.get('glass'));
      sideWindow.position.set(side * (lot.width / 2 + 0.02), Math.min(lot.height - 1.2, 2.2), z);
      group.add(sideWindow);
    }
  }

  const residentialBalconies = lot.style === 'mogra_balcony' || lot.style === 'pg_veranda' || lot.style === 'rain_tree_old_home';
  if (residentialBalconies) {
    for (let i = 0; i < Math.max(1, lot.balconyCount); i += 1) {
      const y = 3.0 + i * 2.9;
      if (y > lot.height - 0.7) break;
      const balconyWidth = Math.min(lot.width * 0.64, 6.8);
      const balcony = box(balconyWidth, 0.18, 1.25, materials.get('concrete'));
      balcony.position.set(-lot.width * 0.08, y, frontZ - 0.6);
      group.add(balcony);
      const rail = box(balconyWidth, 0.72, 0.08, materials.get('metalDark'));
      rail.position.set(-lot.width * 0.08, y + 0.38, frontZ - 1.18);
      group.add(rail);
      for (const x of [-balconyWidth / 2 + 0.18, balconyWidth / 2 - 0.18]) {
        const sideRail = box(0.08, 0.72, 1.12, materials.get('metalDark'));
        sideRail.position.set(x - lot.width * 0.08, y + 0.38, frontZ - 0.6);
        group.add(sideRail);
      }
    }
  }

  if (lot.style === 'lantern_shopfront' || lot.style === 'lantern_mixed_use') {
    const shopWindow = box(lot.width * 0.62, 2.3, 0.1, materials.get('glass'));
    shopWindow.position.set(-lot.width * 0.1, 1.28, frontZ - 0.03);
    group.add(shopWindow);
    const awning = box(lot.width * 0.74, 0.14, 1.45, materials.get(lot.style === 'lantern_shopfront' ? 'sagePlaster' : 'terracottaPlaster'));
    awning.position.set(-lot.width * 0.08, 2.72, frontZ - 0.68);
    awning.rotation.x = -0.08;
    group.add(awning);
    const sign = box(Math.min(5.8, lot.width * 0.58), 0.55, 0.12, materials.get('curtainWarm'));
    sign.position.set(-lot.width * 0.06, 3.35, frontZ - 0.12);
    group.add(sign);
  }

  if (lot.style === 'civic_modern') {
    for (const x of [-lot.width * 0.3, 0, lot.width * 0.3]) {
      const fin = box(0.18, Math.min(3.8, lot.height * 0.55), 0.55, materials.get('stone'));
      fin.position.set(x, Math.min(lot.height * 0.52, 3.2), frontZ - 0.24);
      group.add(fin);
    }
  }

  if (lot.style === 'hill_terrace' || lot.style === 'park_pavilion') {
    const roof = box(lot.width + 1.1, 0.22, lot.depth + 1.1, materials.get('wood'));
    roof.position.y = lot.height + 0.28;
    group.add(roof);
  }

  // Rooftop/service clutter breaks the generated-box silhouette without adding gameplay collision.
  const service = box(Math.min(2.8, lot.width * 0.28), 1.15, Math.min(2.6, lot.depth * 0.26), materials.get('concrete'));
  service.position.set(-lot.width * 0.18, lot.height + 0.58, lot.depth * 0.14);
  group.add(service);
  if (lot.style !== 'waterfront_hut' && lot.style !== 'park_pavilion') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.0, 10), materials.get('metalDark'));
    tank.position.set(lot.width * 0.22, lot.height + 0.62, -lot.depth * 0.14);
    group.add(tank);
  }

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
