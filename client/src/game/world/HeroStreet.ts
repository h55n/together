import * as THREE from 'three';
import { dressFacade } from './FacadeDetails';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
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

/** Authored code-built hero street. Stable gameplay anchors stay independent from visual detail. */
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
    const patch = meshBox(group, [2.1, 0.009, 2.9], [z % 2 === 0 ? -3.4 : 3.4, 0.011, z], materials.get('asphaltPatch'), false);
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
  createStreetFoodStall(group, materials, 11.35, 43.5, -Math.PI / 2);

  // Pedestrian markings and drain grates make the roadway read at walking height.
  for (const crossingZ of [-37, 45]) {
    for (let stripe = -3; stripe <= 3; stripe += 1) {
      meshBox(group, [1.05, 0.018, 2.35], [stripe * 1.65, 0.028, crossingZ], materials.get('stone'), false);
    }
  }
  for (const side of [-1, 1]) {
    for (let z = -50; z <= 50; z += 10) {
      meshBox(group, [0.52, 0.028, 1.75], [side * 8.9, 0.045, z], materials.get('metalDark'), false);
      for (let bar = -2; bar <= 2; bar += 1) {
        meshBox(group, [0.56, 0.018, 0.045], [side * 8.9, 0.064, z + bar * 0.27], materials.get('stone'), false);
      }
    }
  }

  // Street furniture and lived-in contact details.
  for (const side of [-1, 1]) {
    for (const z of [-45, -5, 33, 49]) {
      createUtilityPole(group, materials, side * 10.9, z);
    }
  }
  for (const z of [-45, -5, 33, 49]) {
    createCable(group, materials, new THREE.Vector3(-10.9, 5.85, z), new THREE.Vector3(10.9, 5.85, z + 0.8));
  }
  createCable(group, materials, new THREE.Vector3(-10.9, 6.05, -45), new THREE.Vector3(-10.9, 6.0, 49));
  createCable(group, materials, new THREE.Vector3(10.9, 6.05, -45), new THREE.Vector3(10.9, 6.0, 49));
  createBench(group, materials, -10.4, 4, Math.PI / 2);
  createBench(group, materials, 10.5, -4, -Math.PI / 2);
  createBicycle(group, materials, -10.3, -30, 0.15);
  createBicycle(group, materials, 10.4, 25, -0.22);
  createScooter(group, materials, -10.2, 43, 0.22);
  createAutoRickshaw(group, materials, 12.4, 39, -0.12);
  physics.createFixedCuboid({ x: origin.x - 10.2, y: originY + 0.6, z: origin.z + 43 }, { x: 0.55, y: 0.6, z: 1.05 });
  physics.createFixedCuboid({ x: origin.x + 12.4, y: originY + 1.0, z: origin.z + 39 }, { x: 1.0, y: 1.0, z: 1.65 });

  for (let i = 0; i < 14; i += 1) {
    // Keep trunks out of the café, apartments and shop row.
    if ([3, 4, 9, 10].includes(i)) continue;
    const side = i % 2 === 0 ? -1 : 1;
    const z = -54 + i * 8.2;
    const tree = vegetation.createTree({ species: i % 5 === 0 ? 'gulmohar' : 'rain_tree', seed: 1000 + i, scale: 1.04 + (i % 3) * 0.08 });
    tree.position.set(side * (12.2 + (i % 2) * 1.3), 0.15, z);
    group.add(tree);
  }
  for (let i = 0; i < 22; i += 1) {
    const shrub = vegetation.createShrub(2000 + i, 0.65 + (i % 3) * 0.08);
    shrub.position.set((i % 2 === 0 ? -1 : 1) * 11.9, 0.12, -53 + i * 5.1);
    group.add(shrub);
  }

  // Physical floor and facade boundaries for the walkable slice.
  // Terrain chunks provide continuous street support; a second flat road collider traps the character where both surfaces overlap.
  physics.createFixedCuboid({ x: origin.x - 17.5, y: originY + 3, z: origin.z }, { x: 4.2, y: 3, z: 62 });
  physics.createFixedCuboid({ x: origin.x + 17.5, y: originY + 3, z: origin.z }, { x: 4.2, y: 3, z: 62 });

  interactions.set('cafe_roshan', new THREE.Vector3(origin.x - 10.3, originY + 0.2, origin.z - 14));
  interactions.set('street_bench_west', new THREE.Vector3(origin.x - 10.2, originY + 0.2, origin.z + 4));
  interactions.set('bicycle_rack', new THREE.Vector3(origin.x - 10.1, originY + 0.2, origin.z - 30));
  interactions.set('street_planter', new THREE.Vector3(origin.x + 11.9, originY + 0.2, origin.z + 31));

  compileStaticMeshesByMaterial(group);
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
  const cafeSign = materials.createSign('CAFE ROSHAN', 4.2, 0.68);
  cafeSign.position.set(5.22, 5.4, 0); cafeSign.rotation.y = Math.PI / 2; facade.add(cafeSign);
  dressFacade(facade, materials, 8.8, 12.5, 6.8);
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
  const details = new THREE.Group();
  dressFacade(details, materials, 9, 18, floors * 3.15, floors);
  details.rotation.y = Math.PI;
  building.add(details);
  group.add(building);
}

function createShopRow(group: THREE.Group, materials: MaterialLibrary, x: number, z: number): void {
  const row = new THREE.Group();
  row.position.set(x, 0, z);
  meshBox(row, [8.5, 6.1, 20], [0, 3.05, 0], materials.get('terracottaPlaster'));
  const bays = [
    { z: -6, sign: 'LANTERN MARKET', accent: 'sagePlaster' as const },
    { z: 0, sign: 'FILTER HOUSE', accent: 'curtainWarm' as const },
    { z: 6, sign: 'PAPER & LEAF', accent: 'warmPlaster' as const },
  ];
  for (const [index, bay] of bays.entries()) {
    const zz = bay.z;
    meshBox(row, [0.18, 2.2, 4.5], [4.35, 1.25, zz], materials.get('glass'), false);
    meshBox(row, [1.15, 0.14, 5.1], [4.95, 2.55, zz], materials.get(bay.accent));
    meshBox(row, [0.16, 0.75, 4.6], [4.65, 3.45, zz], materials.get('wood'));
    const lettering = materials.createSign(bay.sign, 4.3, 0.64);
    lettering.position.set(4.76, 3.45, zz);
    lettering.rotation.y = Math.PI / 2;
    row.add(lettering);
    for (const edge of [-1, 1]) {
      meshBox(row, [0.2, 2.55, 0.18], [4.45, 1.4, zz + edge * 2.3], materials.get('stone'));
      meshBox(row, [0.18, 1.4, 1.55], [4.38, 4.8, zz + edge * 1.2], materials.get('glass'), false);
    }
    meshBox(row, [0.56, 0.55, 1.4], [5.0, 0.32, zz - 1.1], materials.get(index === 1 ? 'wood' : 'terracottaPlaster'));
    meshBox(row, [0.56, 0.42, 1.2], [5.0, 0.25, zz + 1.1], materials.get('wood'));
    for (let item = 0; item < 4; item += 1) {
      const stock = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), materials.get(index === 0 ? 'foliageLight' : index === 1 ? 'curtainWarm' : 'sagePlaster'));
      stock.position.set(5.0, 0.68, zz - 1.45 + item * 0.9);
      row.add(stock);
    }
  }
  meshBox(row, [0.28, 0.65, 20.4], [4.2, 6.2, 0], materials.get('stone'));
  dressFacade(row, materials, 8.5, 20, 6.1);
  group.add(row);
}

function createStreetFoodStall(
  group: THREE.Group,
  materials: MaterialLibrary,
  x: number,
  z: number,
  rotation: number,
): void {
  const stall = new THREE.Group();
  stall.position.set(x, 0.1, z);
  stall.rotation.y = rotation;
  meshBox(stall, [2.6, 1.0, 1.45], [0, 0.55, 0], materials.get('wood'));
  meshBox(stall, [2.9, 0.12, 1.75], [0, 2.18, 0], materials.get('terracottaPlaster'));
  meshBox(stall, [2.65, 0.12, 0.6], [0, 1.28, -0.73], materials.get('metalDark'));
  for (const xx of [-1.05, 1.05]) {
    meshBox(stall, [0.08, 1.62, 0.08], [xx, 1.35, 0], materials.get('metalDark'));
  }
  for (const xx of [-0.72, 0, 0.72]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 8), materials.get('metalDark'));
    pot.position.set(xx, 1.42, -0.35);
    stall.add(pot);
  }
  group.add(stall);
}

function createCable(
  group: THREE.Group,
  materials: MaterialLibrary,
  start: THREE.Vector3,
  end: THREE.Vector3,
): void {
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 1e-6) return;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 5), materials.get('metalDark'));
  cable.position.copy(start).add(end).multiplyScalar(0.5);
  cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cable.castShadow = false;
  group.add(cable);
}

function createUtilityPole(group: THREE.Group, materials: MaterialLibrary, x: number, z: number): void {
  const pole = meshBox(group, [0.18, 6.6, 0.18], [x, 3.3, z], materials.get('metalDark'));
  pole.rotation.y = 0.05;
  meshBox(group, [1.45, 0.12, 0.12], [x, 6.0, z], materials.get('metalDark'));
  const lampX = x - Math.sign(x) * 0.64;
  meshBox(group, [0.35, 0.18, 0.33], [lampX, 5.84, z], materials.get('glass'), false);
  const light = new THREE.PointLight(0xffc58a, 0, 22, 2);
  light.position.set(lampX, 5.72, z);
  light.userData.amayaStreetLamp = true;
  group.add(light);

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
function createScooter(group: THREE.Group, materials: MaterialLibrary, x: number, z: number, rotation: number): void {
  const scooter = new THREE.Group();
  scooter.position.set(x, 0.05, z);
  scooter.rotation.y = rotation;
  for (const wheelZ of [-0.68, 0.68]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.13, 12), materials.get('metalDark'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.34, wheelZ);
    scooter.add(wheel);
  }
  meshBox(scooter, [0.5, 0.19, 1.52], [0, 0.57, 0], materials.get('sagePlaster'));
  meshBox(scooter, [0.62, 0.72, 0.16], [0, 0.92, -0.57], materials.get('terracottaPlaster'));
  meshBox(scooter, [0.48, 0.12, 0.74], [0, 1.03, 0.35], materials.get('wood'));
  meshBox(scooter, [0.72, 0.07, 0.07], [0, 1.39, -0.6], materials.get('metalDark'));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), materials.get('curtainWarm'));
  lamp.position.set(0, 1.06, -0.68); scooter.add(lamp);
  group.add(scooter);
}

function createAutoRickshaw(group: THREE.Group, materials: MaterialLibrary, x: number, z: number, rotation: number): void {
  const auto = new THREE.Group();
  auto.position.set(x, 0.04, z);
  auto.rotation.y = rotation;
  for (const wheelZ of [-1.05, 1.02]) for (const wheelX of [-0.7, 0.7]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 12), materials.get('metalDark'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wheelX, 0.36, wheelZ); auto.add(wheel);
  }
  meshBox(auto, [1.66, 0.72, 2.85], [0, 0.74, 0], materials.get('sagePlaster'));
  meshBox(auto, [1.7, 0.18, 1.36], [0, 1.1, -0.68], materials.get('wood'));
  meshBox(auto, [1.55, 0.76, 0.11], [0, 1.56, -0.7], materials.get('glass'), false);
  meshBox(auto, [1.82, 0.14, 2.15], [0, 2.08, -0.12], materials.get('curtainWarm'));
  for (const side of [-1, 1]) {
    meshBox(auto, [0.08, 1.22, 0.08], [side * 0.82, 1.5, -0.94], materials.get('metalDark'));
    meshBox(auto, [0.08, 1.22, 0.08], [side * 0.82, 1.5, 0.7], materials.get('metalDark'));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), materials.get('curtainWarm'));
    lamp.position.set(side * 0.56, 0.78, -1.48); auto.add(lamp);
  }
  group.add(auto);
}
