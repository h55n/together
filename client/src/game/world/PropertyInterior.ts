import * as THREE from 'three';
import {
  bathroomCleaningSequence,
  cityHeightAt,
  dishwashingSequence,
  floorCleaningSequence,
  groceryRestockSequence,
  laundryFoldSequence,
  plantWateringSequence,
  repairSequence,
  starterPropertyById,
  trashSequence,
  type AvatarAction,
  type HomeAction,
  type MicroActionStep,
  type StarterPropertyDefinition,
} from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { WorldInteraction } from '../interaction/InteractionSystem';
import type { MaterialLibrary } from './MaterialLibrary';
import { buildStarterHome, STARTER_HOME_CENTER } from './StarterHome';
import { PROPERTY_WORLD_PLACEMENTS } from './PropertyLocations';
import { propertyRoofSpec } from './propertyShell';

export type PropertyInteriorBuild = {
  group: THREE.Group;
  interactions: WorldInteraction[];
  center: { x: number; z: number };
  reserveRadius: number;
  spawn: { x: number; y: number; z: number };
  property: StarterPropertyDefinition;
};

export function buildPropertyInterior(materials: MaterialLibrary, physics: PhysicsWorld, propertyId?: string): PropertyInteriorBuild {
  const property = starterPropertyById(propertyId ?? 'couple_studio') ?? starterPropertyById('couple_studio')!;
  if (property.id === 'couple_studio') {
    const starter = buildStarterHome(materials, physics);
    const terrainY = cityHeightAt(STARTER_HOME_CENTER.x, STARTER_HOME_CENTER.z);
    const roof = propertyRoofSpec(11, 9, 3);
    const roofMesh = addBox(
      starter.group,
      [roof.width, roof.thickness, roof.depth],
      [STARTER_HOME_CENTER.x, terrainY + roof.centerY, STARTER_HOME_CENTER.z],
      materials.get('warmPlaster'),
    );
    roofMesh.name = 'home:couple_studio:roof';
    return {
      ...starter,
      center: STARTER_HOME_CENTER,
      reserveRadius: 20,
      spawn: { x: STARTER_HOME_CENTER.x, y: terrainY + 1.1, z: STARTER_HOME_CENTER.z - 3.4 },
      property,
    };
  }

  const placement = PROPERTY_WORLD_PLACEMENTS[property.id];
  const center = placement.center;
  const size = placement;
  const group = new THREE.Group();
  group.name = `home:${property.id}:development-shell`;
  const terrainY = cityHeightAt(center.x, center.z);
  group.position.y = terrainY;
  const y = 0;

  addBox(group, [size.width, 0.18, size.depth], [center.x, y + 0.09, center.z], materials.get('wood'));
  physics.createFixedCuboid(
    { x: center.x, y: terrainY + 0.09, z: center.z },
    { x: size.width / 2, y: 0.09, z: size.depth / 2 },
  );
  const halfW = size.width / 2;
  const halfD = size.depth / 2;
  addWall(group, physics, [0.18, 3, size.depth], [center.x - halfW, 1.5, center.z], materials);
  addWall(group, physics, [0.18, 3, size.depth], [center.x + halfW, 1.5, center.z], materials);
  addWall(group, physics, [size.width, 3, 0.18], [center.x, 1.5, center.z + halfD], materials);
  // South wall doorway is intentionally open in the middle.
  addWall(group, physics, [halfW - 1.3, 3, 0.18], [center.x - (halfW + 1.3) / 2, 1.5, center.z - halfD], materials);
  addWall(group, physics, [halfW - 1.3, 3, 0.18], [center.x + (halfW + 1.3) / 2, 1.5, center.z - halfD], materials);
  const roof = propertyRoofSpec(size.width, size.depth, 3);
  const roofMesh = addBox(group, [roof.width, roof.thickness, roof.depth], [center.x, roof.centerY, center.z], materials.get('warmPlaster'));
  roofMesh.name = `home:${property.id}:roof`;

  // Interior partitions vary with household capacity: more rooms without creating a CAD-style floor plan.
  const partitionX = center.x + (property.id === 'one_bhk' ? 2.2 : 1.4);
  addWall(group, physics, [0.12, 2.7, size.depth * 0.55], [partitionX, 1.35, center.z + size.depth * 0.18], materials);
  if (size.beds >= 2) addWall(group, physics, [size.width * 0.42, 2.7, 0.12], [center.x + size.width * 0.2, 1.35, center.z + 0.8], materials);
  if (size.beds >= 4) addWall(group, physics, [size.width * 0.45, 2.7, 0.12], [center.x - size.width * 0.2, 1.35, center.z + 2.9], materials);

  // Shared kitchen.
  addFurniture(group, physics, [4.2, 0.9, 0.72], [center.x - halfW + 2.5, 0.45, center.z + halfD - 0.72], materials.get('concrete'));
  addFurniture(group, physics, [1.05, 1.85, 0.82], [center.x + halfW - 0.72, 0.925, center.z + halfD - 0.72], materials.get('warmPlaster'));
  const table = addFurniture(group, physics, [1.7, 0.12, 1.1], [center.x - 0.4, 0.76, center.z - 0.4], materials.get('wood'));
  table.name = 'home:shared-table';

  // Bedrooms/bed spaces are visually distinct and scale with property capacity.
  for (let index = 0; index < size.beds; index += 1) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const bx = center.x + halfW - 2.3 - col * 3.1;
    const bz = center.z + halfD - 2.5 - row * 3.35;
    addFurniture(group, physics, [1.55, 0.42, 2.45], [bx, 0.21, bz], materials.get('wood'));
    addBox(group, [1.44, 0.18, 2.32], [bx, 0.51, bz], materials.get(index % 2 ? 'curtainWarm' : 'sagePlaster'));
  }

  // Common-room lived-in detail.
  addFurniture(group, physics, [2.2, 0.65, 0.88], [center.x - 1.6, 0.325, center.z + 1.2], materials.get('sagePlaster'));
  addBox(group, [0.72, 0.68, 0.72], [center.x - halfW + 1.1, 0.34, center.z - halfD + 1.3], materials.get('wood')).name = 'moving-box:shared';
  addPlant(group, center.x + halfW - 1.0, center.z - 0.8, materials);

  const interactionX = center.x - halfW + 2.5;
  const kitchenZ = center.z + halfD - 1.35;
  const interactions: WorldInteraction[] = [
    interaction(`${property.id}:dishes`, 'Wash dishes', 'wash', interactionX - 0.8, kitchenZ, 2.1, 6, dishwashingSequence, { type: 'wash_dish', amount: 1 }),
    interaction(`${property.id}:laundry`, 'Fold laundry', 'fold', center.x - halfW + 1.2, center.z - halfD + 2.0, 2.2, 5, laundryFoldSequence, { type: 'fold_laundry', amount: 1 }),
    interaction(`${property.id}:plant`, 'Water house plant', 'water', center.x + halfW - 1.1, center.z - 0.8, 2.1, 5, plantWateringSequence, { type: 'water_plant', plantId: `${property.id}_plant`, amount: 0.35 }),
    interaction(`${property.id}:trash`, 'Take trash out', 'carry', interactionX + 1.0, kitchenZ, 2.1, 4, trashSequence, { type: 'take_trash', amount: 1 }),
    interaction(`${property.id}:floor`, 'Sweep common floor', 'wipe', center.x, center.z + 1.8, 2.4, 4, floorCleaningSequence, { type: 'sweep_floor', amount: 0.24 }),
    interaction(`${property.id}:bathroom`, 'Clean shared sink', 'scrub', center.x + halfW - 1.2, center.z + halfD - 1.7, 2.1, 5, bathroomCleaningSequence, { type: 'clean_bathroom', amount: 0.22 }),
    interaction(`${property.id}:groceries`, 'Put groceries away', 'carry', interactionX + 0.4, kitchenZ, 2.1, 4, groceryRestockSequence, { type: 'restock_groceries', amount: 0.2 }),
    simpleInteraction(`${property.id}:cooking`, 'Cook a meal', 'point', interactionX, kitchenZ, 2.1, 8, 0.5),
    interaction(`${property.id}:repair`, 'Tighten loose fitting', 'point', center.x + halfW - 1.3, center.z + 0.2, 2.1, 5, repairSequence, { type: 'repair', repairId: `${property.id}_fitting` }),
    { ...simpleInteraction(`${property.id}:table`, 'Play a board/card game', 'sit', center.x - 0.4, center.z - 0.4, 2.2, 3, 2.4), activityId: 'board_game' },
    simpleInteraction(`${property.id}:plans`, 'Talk about this home', 'point', center.x - 0.4, center.z - 0.4, 2.2, 8, 0.6),
    simpleInteraction(`${property.id}:bed`, 'Rest in your room', 'sleep', center.x + halfW - 2.3, center.z + halfD - 2.5, 2.2, 3, 3),
  ];

  return {
    group,
    interactions,
    center,
    reserveRadius: placement.reserveRadius,
    spawn: { x: center.x, y: terrainY + 1.1, z: center.z - halfD + 1.8 },
    property,
  };
}

function interaction(id: string, label: string, action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>, x: number, z: number, radius: number, priority: number, sequence: readonly MicroActionStep[], completionAction: HomeAction): WorldInteraction {
  return { id, label, action, x, z, radius, priority, durationSeconds: 1, sequence, completionAction };
}
function simpleInteraction(id: string, label: string, action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>, x: number, z: number, radius: number, priority: number, durationSeconds: number): WorldInteraction {
  return { id, label, action, x, z, radius, priority, durationSeconds };
}
function addWall(group: THREE.Group, physics: PhysicsWorld, size: [number, number, number], position: [number, number, number], materials: MaterialLibrary): void {
  addBox(group, size, position, materials.get('warmPlaster'));
  physics.createFixedCuboid({ x: position[0], y: position[1] + group.position.y, z: position[2] }, { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 });
}
function addFurniture(group: THREE.Group, physics: PhysicsWorld, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = addBox(group, size, position, material);
  physics.createFixedCuboid({ x: position[0], y: position[1] + group.position.y, z: position[2] }, { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 });
  return mesh;
}
function addPlant(group: THREE.Group, x: number, z: number, materials: MaterialLibrary): void {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.44, 10), materials.get('terracottaPlaster'));
  pot.position.set(x, 0.22, z); group.add(pot);
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), materials.get(i % 2 ? 'foliageDeep' : 'foliageMid'));
    const angle = i / 6 * Math.PI * 2; leaf.scale.set(0.55, 1.2, 0.36); leaf.position.set(x + Math.cos(angle) * 0.16, 0.68 + (i % 2) * 0.12, z + Math.sin(angle) * 0.16); group.add(leaf);
  }
}
function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
