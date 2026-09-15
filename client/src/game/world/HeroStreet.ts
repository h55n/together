import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary } from './MaterialLibrary';
import { VegetationSystem } from './VegetationSystem';

export type HeroStreetBuild = {
  group: THREE.Group;
  spawn: THREE.Vector3;
  interactionAnchors: Map<string, THREE.Vector3>;
};

function meshBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/** Authored procedural Phase-1 hero street; not intended as final shipping mesh art. */
export function buildLanternStreetHero(
  materials: MaterialLibrary,
  physics: PhysicsWorld,
  origin: { x: number; y?: number; z: number } = { x: 0, z: 0 },
): HeroStreetBuild {
  const group = new THREE.Group();
  group.name = 'hero:lantern-street';
  const originY = origin.y ?? 0;
  group.position.set(origin.x, originY, origin.z);
  const interactions = new Map<string, THREE.Vector3>();
  const vegetation = new VegetationSystem(materials);

  // Road bed, shoulders, curbs, monsoon drains and patched surface variation.
  meshBox(group, [17, 0.24, 118], [0, -0.12, 0], materials.get('asphalt'), false);
  meshBox(group, [3.2, 0.18, 118], [-10.1, 0.09, 0], materials.get('concrete'), false);
  meshBox(group, [3.2, 0.18, 118], [10.1, 0.09, 0], materials.get('concrete'), false);
  meshBox(group, [0.28, 0.28, 118], [-8.45, 0.05, 0], materials.get('stone'), false);
  meshBox(group, [0.28, 0.28, 118], [8.45, 0.05, 0], materials.get('stone'), false);
  meshBox(group, [0.42, 0.12, 118], [-8.9, -0.02, 0], materials.get('metalDark'), false);
  meshBox(group, [0.42, 0.12, 118], [8.9, -0.02, 0], materials.get('metalDark'), false);

  for (const z of [-43, -18, 13, 39]) {
    const patch = meshBox(group, [3.5 + (z % 2), 0.015, 4.8], [z % 3, 0.013, z], materials.get('asphaltPatch'), false);
    patch.rotation.y = z * 0.017;
  }
  for (let z = -52; z <= 52; z += 8) {
    meshBox(group, [0.08, 0.012, 3.2], [0, 0.018, z], materials.get('stone'), false);
  }

  // Café Roshan: layered facade rather than a flat box.
  createCafeRoshan(group, materials, -14.2, -15);
  createResidentialFacade(group, materials, 14.8, -27, 0x849582, 3);
  createResidentialFacade(group, materials, 15.6, 17, 0xd7c8ae, 4);
  createShopRow(group, materials, -15.5, 26);

  // Street furniture and lived-in contact details.
  for (const side of [-1, 1]) {
    for (const z of [-45, -5, 33, 49]) {
      createUtilityPole(group, materials, side * 10.9, z);
    }
  }
  createBench(group, materials, -10.4, 4, Math.PI / 2);
  createBench(group, materials, 10.5, -4, -Math.PI / 2);
  createBicycle(group, materials, -10.3, -30, 0.15);
  createBicycle(group, materials, 10.4, 25, -0.22);

  for (let i = 0; i < 14; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -54 + i * 8.2;
    const tree = vegetation.createTree({ species: i % 5 === 0 ? 'gulmohar' : 'rain_tree', seed: 1000 + i, scale: 0.82 + (i % 3) * 0.08 });
    tree.position.set(side * (12.2 + (i % 2) * 1.3), 0.15, z);
    group.add(tree);
  }
  for (let i = 0; i < 22; i += 1) {
    const shrub = vegetation.createShrub(2000 + i, 0.65 + (i % 3) * 0.08);
    shrub.position.set((i % 2 === 0 ? -1 : 1) * 11.9, 0.12, -53 + i * 5.1);
    group.add(shrub);
  }

  // Physical floor and facade boundaries for the walkable slice.
  physics.createFixedCuboid({ x: origin.x, y: originY - 0.45, z: origin.z }, { x: 15, y: 0.4, z: 62 });
  physics.createFixedCuboid({ x: origin.x - 17.5, y: originY + 3, z: origin.z }, { x: 4.2, y: 3, z: 62 });
  physics.createFixedCuboid({ x: origin.x + 17.5, y: originY + 3, z: origin.z }, { x: 4.2, y: 3, z: 62 });

  interactions.set('cafe_roshan', new THREE.Vector3(origin.x - 10.3, originY + 0.2, origin.z - 14));
  interactions.set('street_bench_west', new THREE.Vector3(origin.x - 10.2, originY + 0.2, origin.z + 4));
  interactions.set('bicycle_rack', new THREE.Vector3(origin.x - 10.1, originY + 0.2, origin.z - 30));
  interactions.set('street_planter', new THREE.Vector3(origin.x + 11.9, originY + 0.2, origin.z + 31));

  return { group, spawn: new THREE.Vector3(origin.x, originY + 1.05, origin.z + 42), interactionAnchors: interactions };
}

function createCafeRoshan(group: THREE.Group, materials: MaterialLibrary, x: number, z: number): void {
  const facade = new THREE.Group();
  facade.position.set(x, 0, z);
  meshBox(facade, [8.8, 6.8, 12.5], [0, 3.4, 0], materials.get('warmPlaster'));
  meshBox(facade, [9.3, 0.45, 13], [0, 0.22, 0], materials.get('stone'));
  meshBox(facade, [0.35, 3.0, 2.2], [4.55, 1.55, -2.7], materials.get('terracottaPlaster'));
  meshBox(facade, [0.35, 3.0, 2.2], [4.55, 1.55, 2.7], materials.get('terracottaPlaster'));
  meshBox(facade, [0.18, 2.4, 3.4], [4.76, 1.35, 0], materials.get('glass'), false);
  meshBox(facade, [1.25, 0.18, 5.4], [5.12, 3.12, 0], materials.get('terracottaPlaster'));
  meshBox(facade, [0.18, 0.84, 5.2], [5.0, 4.5, 0], materials.get('wood'));
  for (const y of [4.3, 5.65]) {
    for (const zz of [-3.8, 0, 3.8]) {
      meshBox(facade, [0.18, 0.95, 2.25], [4.78, y, zz], materials.get('glass'), false);
      meshBox(facade, [0.12, 1.1, 0.12], [4.9, y, zz - 1.18], materials.get('metalDark'));
      meshBox(facade, [0.12, 1.1, 0.12], [4.9, y, zz + 1.18], materials.get('metalDark'));
    }
  }
  // Sign and plant trough ground the building.
  meshBox(facade, [0.16, 0.85, 4.4], [5.12, 5.4, 0], materials.get('wood'));
  for (const zz of [-4.8, 4.8]) {
    meshBox(facade, [0.9, 0.55, 1.35], [5.0, 0.34, zz], materials.get('terracottaPlaster'));
  }
  group.add(facade);
}

function createResidentialFacade(group: THREE.Group, materials: MaterialLibrary, x: number, z: number, _tone: number, floors: number): void {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  const material = z > 0 ? materials.get('warmPlaster') : materials.get('sagePlaster');
  meshBox(building, [9, floors * 3.15, 18], [0, floors * 1.575, 0], material);
  meshBox(building, [9.5, 0.5, 18.5], [0, 0.25, 0], materials.get('stone'));
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.65 + floor * 3.05;
    for (const zz of [-5.6, 0, 5.6]) {
      meshBox(building, [0.2, 1.35, 2.25], [-4.58, y, zz], materials.get('glass'), false);
      meshBox(building, [0.55, 0.16, 2.8], [-4.9, y - 0.82, zz], materials.get('concrete'));
      if ((floor + Math.round(zz)) % 2 === 0) meshBox(building, [0.14, 1.12, 1.55], [-4.72, y, zz], materials.get('curtainWarm'), false);
    }
    if (floor > 0) {
      meshBox(building, [1.5, 0.18, 5.2], [-5.25, y - 0.45, 0], materials.get('concrete'));
      meshBox(building, [0.1, 0.8, 5.2], [-5.95, y - 0.05, 0], materials.get('metalDark'));
    }
  }
  group.add(building);
}

function createShopRow(group: THREE.Group, materials: MaterialLibrary, x: number, z: number): void {
  const row = new THREE.Group();
  row.position.set(x, 0, z);
  meshBox(row, [8.5, 6.1, 20], [0, 3.05, 0], materials.get('terracottaPlaster'));
  for (const zz of [-6, 0, 6]) {
    meshBox(row, [0.18, 2.2, 4.5], [4.35, 1.25, zz], materials.get('glass'), false);
    meshBox(row, [1.0, 0.14, 5], [4.85, 2.55, zz], materials.get(zz === 0 ? 'sagePlaster' : 'warmPlaster'));
    meshBox(row, [0.16, 0.65, 4.4], [4.65, 3.4, zz], materials.get('wood'));
  }
  group.add(row);
}

function createUtilityPole(group: THREE.Group, materials: MaterialLibrary, x: number, z: number): void {
  const pole = meshBox(group, [0.18, 6.6, 0.18], [x, 3.3, z], materials.get('metalDark'));
  pole.rotation.y = 0.05;
  meshBox(group, [1.45, 0.12, 0.12], [x, 6.0, z], materials.get('metalDark'));
}

function createBench(group: THREE.Group, materials: MaterialLibrary, x: number, z: number, rotation: number): void {
  const bench = new THREE.Group();
  meshBox(bench, [2.1, 0.14, 0.58], [0, 0.62, 0], materials.get('wood'));
  meshBox(bench, [2.1, 0.14, 0.58], [0, 1.05, 0.42], materials.get('wood'));
  for (const xx of [-0.78, 0.78]) meshBox(bench, [0.12, 0.62, 0.12], [xx, 0.31, 0], materials.get('metalDark'));
  bench.position.set(x, 0, z);
  bench.rotation.y = rotation;
  group.add(bench);
}

function createBicycle(group: THREE.Group, materials: MaterialLibrary, x: number, z: number, rotation: number): void {
  const bike = new THREE.Group();
  const wheelGeometry = new THREE.TorusGeometry(0.38, 0.025, 6, 18);
  for (const xx of [-0.55, 0.55]) {
    const wheel = new THREE.Mesh(wheelGeometry, materials.get('metalDark'));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(xx, 0.42, 0);
    bike.add(wheel);
  }
  const frame = meshBox(bike, [1.05, 0.06, 0.06], [0, 0.58, 0], materials.get('terracottaPlaster'));
  frame.rotation.z = 0.1;
  meshBox(bike, [0.06, 0.72, 0.06], [0.15, 0.67, 0], materials.get('terracottaPlaster'));
  bike.position.set(x, 0.12, z);
  bike.rotation.y = rotation;
  group.add(bike);
}
