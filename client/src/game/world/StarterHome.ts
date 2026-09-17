import * as THREE from 'three';
import {
  bathroomCleaningSequence, cityHeightAt, dishwashingSequence, floorCleaningSequence, groceryRestockSequence,
  laundryFoldSequence, plantWateringSequence, repairSequence, trashSequence,
  type AvatarAction, type HomeAction, type MicroActionStep,
} from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { WorldInteraction } from '../interaction/InteractionSystem';
import type { MaterialLibrary } from './MaterialLibrary';

export const STARTER_HOME_CENTER = { x: -235, z: 175 } as const;
export const STARTER_HOME_RESERVE_RADIUS = 20;

export type StarterHomeBuild = {
  group: THREE.Group;
  interactions: WorldInteraction[];
};

export function buildStarterHome(materials: MaterialLibrary, physics: PhysicsWorld): StarterHomeBuild {
  const group = new THREE.Group();
  group.name = 'home:couple-studio-development-shell';
  const x = STARTER_HOME_CENTER.x;
  const z = STARTER_HOME_CENTER.z;
  const y = cityHeightAt(x, z);

  // 11m x 9m authored starter studio. The south wall keeps a 2.2m doorway open.
  addBox(group, [11, 0.18, 9], [x, y + 0.09, z], materials.get('wood'));
  physics.createFixedCuboid({ x, y: y + 0.09, z }, { x: 5.5, y: 0.09, z: 4.5 });
  addWall(group, physics, [0.18, 3, 9], [x - 5.5, y + 1.5, z], materials);
  addWall(group, physics, [0.18, 3, 9], [x + 5.5, y + 1.5, z], materials);
  addWall(group, physics, [11, 3, 0.18], [x, y + 1.5, z + 4.5], materials);
  addWall(group, physics, [4.35, 3, 0.18], [x - 3.325, y + 1.5, z - 4.5], materials);
  addWall(group, physics, [4.35, 3, 0.18], [x + 3.325, y + 1.5, z - 4.5], materials);

  // Kitchen run and domestic objects.
  addFurniture(group, physics, [3.7, 0.9, 0.7], [x - 2.4, y + 0.45, z + 3.75], materials.get('concrete'));
  addFurniture(group, physics, [1.2, 0.08, 0.55], [x - 3.3, y + 0.94, z + 3.65], materials.get('metalDark'));
  addFurniture(group, physics, [1.0, 1.85, 0.85], [x + 4.65, y + 0.925, z + 3.5], materials.get('warmPlaster'));
  const kettle = addBox(group, [0.22, 0.28, 0.22], [x - 0.9, y + 1.08, z + 3.55], materials.get('metalDark'));
  kettle.name = 'prop:kettle';
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.035, 20), materials.get('warmPlaster'));
  plate.rotation.x = Math.PI / 2;
  plate.position.set(x - 3.3, y + 1.0, z + 3.55);
  group.add(plate);

  // Bed / clothes / laundry corner.
  addFurniture(group, physics, [2.2, 0.45, 3.5], [x + 3.55, y + 0.225, z - 1.85], materials.get('wood'));
  addBox(group, [2.05, 0.2, 3.25], [x + 3.55, y + 0.53, z - 1.85], materials.get('curtainWarm'));
  addBox(group, [0.72, 0.6, 0.72], [x + 0.9, y + 0.3, z - 3.35], materials.get('wood')).name = 'prop:laundry-basket';

  // Small table, seats, moving boxes and plant make the space feel occupied from day one.
  addFurniture(group, physics, [1.55, 0.12, 1.1], [x - 0.3, y + 0.76, z - 0.3], materials.get('wood'));
  for (const dz of [-1.05, 1.05]) {
    addFurniture(group, physics, [0.6, 0.75, 0.6], [x - 0.3, y + 0.375, z - 0.3 + dz], materials.get('wood'));
  }
  addBox(group, [0.75, 0.68, 0.72], [x - 3.8, y + 0.34, z - 2.95], materials.get('wood')).name = 'moving-box:kitchen';
  addBox(group, [0.88, 0.78, 0.76], [x - 2.9, y + 0.39, z - 2.7], materials.get('wood')).name = 'moving-box:shared';
  addPlant(group, x + 4.55, y, z + 0.9, materials);

  // Warm practical lamp and window composition without creating a dynamic light per fixture.
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.3, 12, 1, true), materials.get('curtainWarm'));
  shade.position.set(x, y + 2.55, z + 0.5);
  group.add(shade);
  addBox(group, [3.6, 1.5, 0.08], [x - 2.2, y + 1.75, z + 4.39], materials.get('glass')).name = 'window:balcony';

  // Additional lived-in chore props: bin, broom, bathroom sink, grocery bag and a loose tap panel.
  addBox(group, [0.55, 0.8, 0.55], [x - 4.55, y + 0.4, z + 2.4], materials.get('metalDark')).name = 'prop:kitchen-bin';
  addBox(group, [0.08, 1.35, 0.08], [x + 0.35, y + 0.68, z + 3.9], materials.get('wood')).name = 'prop:broom';
  addFurniture(group, physics, [1.3, 0.82, 0.55], [x + 4.5, y + 0.41, z + 2.25], materials.get('concrete')).name = 'prop:bathroom-sink';
  addBox(group, [0.72, 0.8, 0.58], [x - 4.2, y + 0.4, z - 2.25], materials.get('terracottaPlaster')).name = 'prop:grocery-bag';
  addBox(group, [0.32, 0.24, 0.08], [x + 4.9, y + 1.0, z + 2.25], materials.get('metalDark')).name = 'prop:repair-panel';

  const interactions: WorldInteraction[] = [
    interaction('home_dishes', 'Wash plate', 'wash', x - 3.3, z + 3.0, 2.0, 6, 1.0, dishwashingSequence, { type: 'wash_dish', amount: 1 }),
    interaction('home_kettle', 'Pour water for chai', 'pour', x - 1.0, z + 3.0, 2.0, 4, 1.6),
    interaction('home_stir', 'Stir dinner', 'stir', x - 0.4, z + 3.0, 2.0, 4, 1.8),
    interaction('home_cooking', 'Cook a meal', 'point', x - 0.4, z + 3.0, 2.0, 8, 0.5),
    interaction('home_laundry', 'Fold laundry', 'fold', x + 0.9, z - 2.8, 2.0, 5, 1.0, laundryFoldSequence, { type: 'fold_laundry', amount: 1 }),
    interaction('home_plant', 'Water pothos', 'water', x + 4.0, z + 0.9, 2.0, 5, 1.0, plantWateringSequence, { type: 'water_plant', plantId: 'pothos', amount: 0.35 }),
    interaction('home_trash', 'Take trash out', 'carry', x - 4.3, z + 1.7, 2.0, 4, 1.0, trashSequence, { type: 'take_trash', amount: 1 }),
    interaction('home_floor', 'Sweep floor', 'wipe', x + 0.2, z + 3.0, 2.0, 4, 1.0, floorCleaningSequence, { type: 'sweep_floor', amount: 0.24 }),
    interaction('home_bathroom', 'Clean bathroom sink', 'scrub', x + 3.9, z + 2.2, 2.0, 5, 1.0, bathroomCleaningSequence, { type: 'clean_bathroom', amount: 0.22 }),
    interaction('home_groceries', 'Put groceries away', 'carry', x - 4.0, z - 1.7, 2.0, 4, 1.0, groceryRestockSequence, { type: 'restock_groceries', amount: 0.2 }),
    interaction('home_repair', 'Fix loose tap panel', 'point', x + 4.2, z + 2.7, 2.0, 6, 1.0, repairSequence, { type: 'repair', repairId: 'tap_panel' }),
    interaction('home_box', 'Carry moving box', 'carry', x - 3.3, z - 2.2, 2.0, 3, 2.0),
    interaction('home_table', 'Sit at table', 'sit', x - 0.3, z - 1.3, 2.0, 2, 2.5),
    interaction('home_plans', 'Talk about this home', 'point', x - 0.3, z - 0.3, 2.2, 7, 0.6),
    interaction('home_bed', 'Rest on bed', 'sleep', x + 3.55, z - 0.8, 2.0, 3, 3.0),
  ];

  return { group, interactions };
}

function interaction(
  id: string,
  label: string,
  action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>,
  x: number,
  z: number,
  radius: number,
  priority: number,
  durationSeconds: number,
  sequence?: readonly MicroActionStep[],
  completionAction?: HomeAction,
): WorldInteraction {
  return { id, label, action, x, z, radius, priority, durationSeconds, ...(sequence ? { sequence } : {}), ...(completionAction ? { completionAction } : {}) };
}

function addWall(group: THREE.Group, physics: PhysicsWorld, size: [number, number, number], position: [number, number, number], materials: MaterialLibrary): void {
  addBox(group, size, position, materials.get('warmPlaster'));
  physics.createFixedCuboid(
    { x: position[0], y: position[1], z: position[2] },
    { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 },
  );
}

function addFurniture(group: THREE.Group, physics: PhysicsWorld, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = addBox(group, size, position, material);
  physics.createFixedCuboid(
    { x: position[0], y: position[1], z: position[2] },
    { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 },
  );
  return mesh;
}

function addPlant(group: THREE.Group, x: number, y: number, z: number, materials: MaterialLibrary): void {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.2, 0.46, 12), materials.get('terracottaPlaster'));
  pot.position.set(x, y + 0.23, z);
  group.add(pot);
  for (let index = 0; index < 7; index += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), materials.get(index % 2 ? 'foliageDeep' : 'foliageMid'));
    const angle = (index / 7) * Math.PI * 2;
    leaf.scale.set(0.55, 1.35, 0.35);
    leaf.rotation.z = angle * 0.25;
    leaf.position.set(x + Math.cos(angle) * 0.18, y + 0.72 + (index % 3) * 0.12, z + Math.sin(angle) * 0.18);
    group.add(leaf);
  }
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
