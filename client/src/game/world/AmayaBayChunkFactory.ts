import * as THREE from 'three';
import {
  AMAYA_BAY_CITY,
  AMAYA_BAY_VENUES,
  CHUNK_SIZE_METRES,
  cityHeightAt,
  createSeededRandom,
  districtAtPosition,
  generateChunkDressing,
  type ResidencyRing,
} from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary } from './MaterialLibrary';
import { addChunkDressing } from './NeighborhoodDressing';
import { VegetationSystem, type VegetationSpecies } from './VegetationSystem';
import { PROPERTY_WORLD_RESERVATIONS } from './PropertyLocations';
import { addVenueDressing } from './CityVenueDressing';

export type AmayaBayBoundaryCuboid = {
  center: { x: number; y: number; z: number };
  halfExtents: { x: number; y: number; z: number };
};

/** Invisible perimeter guard only; authored terrain/property floors own vertical support. */
export function amayaBayBoundaryCuboids(): readonly AmayaBayBoundaryCuboid[] {
  const halfCity = AMAYA_BAY_CITY.sizeMetres / 2;
  const wallHalfThickness = 0.5;
  const wallHalfHeight = 30;
  const wallCenterY = 20;
  return [
    { center: { x: -halfCity, y: wallCenterY, z: 0 }, halfExtents: { x: wallHalfThickness, y: wallHalfHeight, z: halfCity } },
    { center: { x: halfCity, y: wallCenterY, z: 0 }, halfExtents: { x: wallHalfThickness, y: wallHalfHeight, z: halfCity } },
    { center: { x: 0, y: wallCenterY, z: -halfCity }, halfExtents: { x: halfCity, y: wallHalfHeight, z: wallHalfThickness } },
    { center: { x: 0, y: wallCenterY, z: halfCity }, halfExtents: { x: halfCity, y: wallHalfHeight, z: wallHalfThickness } },
  ];
}

export function createAmayaBayChunkFactory(materials: MaterialLibrary, physics?: PhysicsWorld) {
  const vegetation = new VegetationSystem(materials);
  return (chunkX: number, chunkZ: number, ring: Exclude<ResidencyRing, 'unloaded'>): THREE.Group => {
    const root = new THREE.Group();
    const chunkOriginX = chunkX * CHUNK_SIZE_METRES;
    const chunkOriginZ = chunkZ * CHUNK_SIZE_METRES;
    const centerX = chunkOriginX + CHUNK_SIZE_METRES / 2;
    const centerZ = chunkOriginZ + CHUNK_SIZE_METRES / 2;
    if (Math.abs(centerX) > AMAYA_BAY_CITY.sizeMetres / 2 + 64 || Math.abs(centerZ) > AMAYA_BAY_CITY.sizeMetres / 2 + 64) return root;

    const segments = ring === 'active' ? 10 : ring === 'visual' ? 5 : 1;
    const geometry = new THREE.PlaneGeometry(CHUNK_SIZE_METRES, CHUNK_SIZE_METRES, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const wx = centerX + position.getX(i);
      const wz = centerZ + position.getZ(i);
      position.setY(i, cityHeightAt(wx, wz) - 0.16);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    const district = districtAtPosition(centerX, centerZ);
    const terrainMaterial = district?.id === 'mogra_park' || district?.id === 'hill_garden' || district?.id === 'rain_tree_lane'
      ? materials.get('soil')
      : materials.get('concrete');
    const terrain = new THREE.Mesh(geometry, terrainMaterial);
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = ring === 'active';
    root.add(terrain);

    if (district) {
      const dressing = generateChunkDressing(chunkX, chunkZ, district.id);
      addChunkDressing(root, dressing, chunkOriginX, chunkOriginZ, ring, materials, ring === 'active' ? physics : undefined);
      const venues = AMAYA_BAY_VENUES.filter((venue) =>
        venue.position.x >= chunkOriginX && venue.position.x < chunkOriginX + CHUNK_SIZE_METRES &&
        venue.position.z >= chunkOriginZ && venue.position.z < chunkOriginZ + CHUNK_SIZE_METRES
      );
      addVenueDressing(root, venues, ring, materials, ring === 'active' ? physics : undefined);
    }

    if (ring === 'active' && physics) {
      const index = geometry.getIndex();
      if (index) {
        const vertices = new Float32Array(position.count * 3);
        for (let i = 0; i < position.count; i += 1) {
          vertices[i * 3] = centerX + position.getX(i);
          vertices[i * 3 + 1] = position.getY(i);
          vertices[i * 3 + 2] = centerZ + position.getZ(i);
        }
        const indices = Uint32Array.from(index.array);
        const terrainCollider = physics.createFixedTrimesh(vertices, indices);
        const previousDispose = root.userData.disposeChunk as (() => void) | undefined;
        root.userData.disposeChunk = () => {
          previousDispose?.();
          physics.removeCollider(terrainCollider);
        };
      }
    }

    if (ring === 'horizon') return root;
    const random = createSeededRandom((chunkX * 73856093) ^ (chunkZ * 19349663));
    const count = ring === 'active' ? (district?.id === 'mogra_park' || district?.id === 'rain_tree_lane' ? 14 : 9) : 4;
    for (let i = 0; i < count; i += 1) {
      const localX = (random() - 0.5) * (CHUNK_SIZE_METRES - 12);
      const localZ = (random() - 0.5) * (CHUNK_SIZE_METRES - 12);
      const wx = centerX + localX;
      const wz = centerZ + localZ;
      if (Math.abs(wx + 30) < 28 && Math.abs(wz - 75) < 75) continue;
      if (PROPERTY_WORLD_RESERVATIONS.some(({ center, reserveRadius }) => Math.hypot(wx - center.x, wz - center.z) < reserveRadius)) continue;
      const species = chooseSpecies(district?.id, random());
      const tree = vegetation.createTree({ species, seed: Math.floor(random() * 1_000_000), scale: ring === 'visual' ? 0.72 : 0.85 + random() * 0.32 });
      tree.position.set(wx, cityHeightAt(wx, wz), wz);
      if (ring === 'visual') tree.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = false; });
      root.add(tree);
    }
    return root;
  };
}

function chooseSpecies(district: string | undefined, random: number): VegetationSpecies {
  if (district === 'bay_steps') return random > 0.45 ? 'palm' : 'ornamental';
  if (district === 'rain_tree_lane') return random > 0.2 ? 'rain_tree' : 'ficus';
  if (district === 'hill_garden') return random > 0.6 ? 'gulmohar' : 'ficus';
  if (district === 'mogra_park') return random > 0.55 ? 'gulmohar' : 'rain_tree';
  return random > 0.65 ? 'ornamental' : 'rain_tree';
}
