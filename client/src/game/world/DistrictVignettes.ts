import * as THREE from 'three';
import { cityHeightAt } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { VegetationSystem } from './VegetationSystem';

/** Small authored moments at routes and district arrivals; large structures stay with their landmarks. */
export function createDistrictVignettes(materials: MaterialLibrary, physics?: PhysicsWorld): THREE.Group {
  const root = new THREE.Group();
  root.name = 'authored:district-vignettes';
  const vegetation = new VegetationSystem(materials);
  const box = (size: [number, number, number], at: [number, number, number], key: WorldMaterialKey): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials.get(key));
    mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    return mesh;
  };
  const bed = (x: number, z: number, width: number, depth: number, seed: number, ground = cityHeightAt(x, z)): void => {
    box([width, 0.3, depth], [x, ground + 0.15, z], 'stone');
    box([width - 0.35, 0.07, depth - 0.35], [x, ground + 0.33, z], 'soil');
    physics?.createFixedCuboid({ x, y: ground + 0.15, z }, { x: width / 2, y: 0.15, z: depth / 2 });
    const count = Math.max(3, Math.round(width / 1.4));
    for (let i = 0; i < count; i += 1) {
      const px = x - width * 0.4 + i * width * 0.8 / Math.max(1, count - 1);
      const shrub = vegetation.createShrub(seed + i, 0.55 + (i % 3) * 0.13);
      shrub.position.set(px, ground + 0.34, z); root.add(shrub);
      if (i % 2 === 0) {
        const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), materials.get(i % 4 === 0 ? 'flowerCoral' : 'flowerGold'));
        bloom.position.set(px + 0.14, ground + 1.02, z + 0.24); root.add(bloom);
      }
    }
  };
  const tree = (x: number, z: number, seed: number, species: 'rain_tree' | 'gulmohar' = 'rain_tree', scale = 1): void => {
    const instance = vegetation.createTree({ species, seed, scale });
    instance.position.set(x, cityHeightAt(x, z), z); root.add(instance);
  };
  const bench = (x: number, z: number, facing = 0): void => {
    const y = cityHeightAt(x, z);
    const seat = box([2.4, 0.14, 0.6], [x, y + 0.55, z], 'wood'); seat.rotation.y = facing;
    const back = box([2.4, 0.65, 0.12], [x, y + 0.9, z + 0.31], 'wood'); back.rotation.y = facing;
    for (const side of [-0.95, 0.95]) box([0.12, 0.52, 0.46], [x + side, y + 0.27, z], 'metalDark');
  };

  // Residential court: planted edges leave the central path and shop approaches open.
  bed(-211, 119, 6.8, 2.2, 610);
  bed(-185, 117, 5.4, 2.2, 620);
  tree(-218, 116, 630, 'gulmohar', 1.08);
  tree(-178, 112, 631, 'rain_tree', 1.05);
  bench(-210, 124);

  // The auto stand gives Lantern's broad junction a recognisable street use.
  const ax = 28, az = 95, ay = cityHeightAt(ax, az);
  const auto = new THREE.Group();
  auto.name = 'lantern:auto-stand-rickshaw';
  auto.position.set(ax, ay, az);
  root.add(auto);
  const autoBox = (size: [number, number, number], at: [number, number, number], key: WorldMaterialKey): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials.get(key));
    mesh.position.set(...at); mesh.castShadow = true; auto.add(mesh);
  };
  autoBox([1.72, 0.72, 2.8], [0, 0.8, 0], 'sagePlaster');
  autoBox([1.83, 0.18, 2.18], [0, 2.06, 0], 'curtainWarm');
  autoBox([1.55, 0.78, 0.1], [0, 1.57, -0.96], 'glass');
  for (const side of [-0.78, 0.78]) {
    for (const end of [-0.95, 0.94]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.12, 12), materials.get('metalDark'));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side, 0.38, end); auto.add(wheel);
    }
    autoBox([0.07, 1.25, 0.07], [side, 1.48, -0.78], 'metalDark');
  }
  physics?.createFixedCuboid({ x: ax, y: ay + 1.0, z: az }, { x: 1, y: 1, z: 1.5 });
  const standX = 15, standZ = 88, standY = cityHeightAt(standX, standZ);
  for (const sx of [-3.2, 3.2]) box([0.14, 2.7, 0.14], [standX + sx, standY + 1.35, standZ], 'wood');
  box([7.2, 0.16, 2.1], [standX, standY + 2.75, standZ], 'terracottaPlaster');
  box([5.9, 0.62, 0.12], [standX, standY + 2.27, standZ - 1.1], 'wood');
  const standSign = materials.createSign('AUTO STAND', 5.7, 0.52);
  standSign.position.set(standX, standY + 2.27, standZ - 1.18); standSign.rotation.y = Math.PI; root.add(standSign);
  bed(6, 85, 5.2, 1.8, 650);
  tree(4, 78, 651, 'gulmohar', 1.02);

  // Flower borders guide the park arrival toward its larger loop and court.
  for (const [x, z, seed] of [[168, 54, 680], [190, 54, 690], [204, 46, 700]] as const) bed(x, z, 6.2, 1.8, seed);
  tree(158, 53, 704, 'rain_tree', 1.12);
  tree(210, 55, 705, 'gulmohar', 1.05);
  bench(181, 52, Math.PI);

  // Dense planted thresholds and an older lane seat frame Rain Tree Lane.
  bed(-261, -82, 6, 2.0, 720);
  bed(-236, -83, 6, 2.0, 730);
  tree(-267, -90, 740, 'rain_tree', 1.17);
  tree(-229, -89, 741, 'gulmohar', 1.0);
  bench(-250, -87);

  // The civic and hill arrivals use low planting so signs, golf and views remain visible.
  bed(194, -64, 5.3, 1.6, 760);
  bed(239, -64, 5.3, 1.6, 770);
  bed(261, 239, 5.5, 1.6, 780);
  bed(296, 239, 5.5, 1.6, 790);

  // A small flowering edge gives the promenade foreground depth beside the stair opening.
  bed(16, -277, 5.5, 1.5, 800, 0.32);
  bed(168, -277, 5.5, 1.5, 810, 0.32);
  return root;
}
