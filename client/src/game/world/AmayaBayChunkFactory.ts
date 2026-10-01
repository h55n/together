import { coastalTerrainLowering } from './CoastalShoreline';
import * as THREE from 'three';
import { streetClearanceAt, streetPlantingForChunk, streetFrontageLotsForChunk } from './StreetNetwork';
import {
  AMAYA_BAY_CITY,
  AMAYA_BAY_VENUES,
  CHUNK_SIZE_METRES,
  cityHeightAt,
  createSeededRandom,
  districtAtPosition,
  generateChunkDressing,
  pointClearsSurfaceRoutes,
  type ResidencyRing,
} from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
import { instanceSharedMeshes } from '../assets/runtime/SharedMeshInstancer';
import type { MaterialLibrary } from './MaterialLibrary';
import { addChunkDressing } from './NeighborhoodDressing';
import { VegetationSystem, type TreePlacement, type VegetationSpecies } from './VegetationSystem';
import { PROPERTY_WORLD_RESERVATIONS } from './PropertyLocations';
import { addVenueDressing } from './CityVenueDressing';
import { createChunkSurfaceNetwork } from './CitySurfaceNetwork';

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

export function createAmayaBayChunkFactory(materials: MaterialLibrary, physics?: PhysicsWorld, monitor?: PerformanceMonitor) {
  const vegetation = new VegetationSystem(materials);
  return (chunkX: number, chunkZ: number, ring: Exclude<ResidencyRing, 'unloaded'>, vegetationDetail: 'near' | 'far' = ring === 'active' ? 'near' : 'far'): THREE.Group => {
    const root = new THREE.Group();
    const chunkOriginX = chunkX * CHUNK_SIZE_METRES;
    const chunkOriginZ = chunkZ * CHUNK_SIZE_METRES;
    const centerX = chunkOriginX + CHUNK_SIZE_METRES / 2;
    const centerZ = chunkOriginZ + CHUNK_SIZE_METRES / 2;
    if (Math.abs(centerX) > AMAYA_BAY_CITY.sizeMetres / 2 + 64 || Math.abs(centerZ) > AMAYA_BAY_CITY.sizeMetres / 2 + 64) return root;

    const terrainStarted = performance.now();
    const segments = ring === 'active' ? 10 : ring === 'visual' ? 5 : 1;
    const geometry = new THREE.PlaneGeometry(CHUNK_SIZE_METRES, CHUNK_SIZE_METRES, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const wx = centerX + position.getX(i);
      const wz = centerZ + position.getZ(i);
      position.setY(i, cityHeightAt(wx, wz) - 0.16 - coastalTerrainLowering(wx, wz));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    const district = districtAtPosition(centerX, centerZ);
    // Roads and sidewalks own their paved strips. Unbuilt residential land
    // remains planted ground instead of extending pavement to the horizon.
    const terrainMaterial = district?.id === 'the_common' ? materials.get('concrete')
      : district?.id === 'bay_steps' ? materials.get('sandstone') : materials.get('grass');
    if (terrainMaterial === materials.get('grass')) {
      const colors = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i += 1) {
        const wx = centerX + position.getX(i), wz = centerZ + position.getZ(i);
        const patch = (Math.sin(wx * 0.041) * Math.cos(wz * 0.037) + 1) * 0.5;
        colors.set([0.78 + patch * 0.22, 0.84 + patch * 0.16, 0.72 + patch * 0.24], i * 3);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    const terrain = new THREE.Mesh(geometry, terrainMaterial);
    terrain.position.set(centerX, 0, centerZ);
    terrain.receiveShadow = ring === 'active';
    root.add(terrain);
    monitor?.recordSystem('chunk-terrain', performance.now() - terrainStarted);

    const surfacesStarted = performance.now();
    if (ring !== 'horizon') {
      const surfaceNetwork = createChunkSurfaceNetwork(chunkX, chunkZ, materials);
      if (surfaceNetwork.children.length > 0) root.add(surfaceNetwork);
    }
    monitor?.recordSystem('chunk-surfaces', performance.now() - surfacesStarted);

    if (district) {
      const staticDressing = new THREE.Group();
      staticDressing.name = 'chunk-static-dressing';
      root.add(staticDressing);

      const dressingStarted = performance.now();
      const dressing = generateChunkDressing(chunkX, chunkZ, district.id);
      const frontages = streetFrontageLotsForChunk(chunkX, chunkZ);
      dressing.buildings = [...frontages, ...dressing.buildings.filter(lot => frontages.every(front =>
        Math.hypot(lot.x - front.x, lot.z - front.z) > Math.hypot(lot.width, lot.depth) / 2 + Math.hypot(front.width, front.depth) / 2 + 2))];
      addChunkDressing(staticDressing, dressing, chunkOriginX, chunkOriginZ, ring, materials, ring === 'active' ? physics : undefined);
      const venues = AMAYA_BAY_VENUES.filter((venue) =>
        venue.position.x >= chunkOriginX && venue.position.x < chunkOriginX + CHUNK_SIZE_METRES &&
        venue.position.z >= chunkOriginZ && venue.position.z < chunkOriginZ + CHUNK_SIZE_METRES
      );
      addVenueDressing(staticDressing, venues, ring, materials, ring === 'active' ? physics : undefined);
      monitor?.recordSystem('chunk-dressing-build', performance.now() - dressingStarted);

      const mergeStarted = performance.now();
      const disposeStaticDressing = staticDressing.userData.disposeChunk as (() => void) | undefined;
      delete staticDressing.userData.disposeChunk;
      compileStaticMeshesByMaterial(staticDressing);
      monitor?.recordSystem('chunk-dressing-merge', performance.now() - mergeStarted);
      if (disposeStaticDressing) {
        const previousDispose = root.userData.disposeChunk as (() => void) | undefined;
        root.userData.disposeChunk = () => {
          previousDispose?.();
          disposeStaticDressing();
        };
      }
    }

    const colliderStarted = performance.now();
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
    monitor?.recordSystem('chunk-terrain-collider', performance.now() - colliderStarted);

    if (ring === 'horizon') return root;
    const vegetationStarted = performance.now();
    const vegetationRoot = new THREE.Group();
    vegetationRoot.name = 'chunk-vegetation';
    root.add(vegetationRoot);

    const placements: TreePlacement[] = [];
    const roadside = new THREE.Group(); roadside.name = 'street-planting';
    for(const point of streetPlantingForChunk(chunkX, chunkZ)) {
      if(Math.abs(point.x+30)<29 && point.z>0 && point.z<150) continue;
      if(point.x>25 && point.x<110 && point.z<-282 && point.z>-318)continue;
      if(PROPERTY_WORLD_RESERVATIONS.some(({center,reserveRadius})=>Math.hypot(point.x-center.x,point.z-center.z)<reserveRadius+2))continue;
      if(AMAYA_BAY_VENUES.some(venue=>Math.hypot(point.x-venue.position.x,point.z-venue.position.z)<venue.frontageMetres+3))continue;
      if(streetClearanceAt(point.x,point.z)<0.5)continue;
      const tree=vegetation.createTree({species:point.z < -220 ? 'palm' : point.seed%4===0 ? 'gulmohar' : 'rain_tree',seed:point.seed,lod:vegetationDetail,scale:1.06});
      if (ring === 'visual') tree.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = false; });
      tree.position.set(point.x,cityHeightAt(point.x,point.z),point.z);roadside.add(tree);
      if(ring==='active')for(const offset of [-2,2]){
        const shrub=vegetation.createShrub(point.seed+offset,0.8);
        shrub.position.set(point.x+offset,cityHeightAt(point.x+offset,point.z),point.z);roadside.add(shrub);
      }
    }
    root.add(roadside);
    const random = createSeededRandom((chunkX * 73856093) ^ (chunkZ * 19349663));
    const count = ring === 'active' ? (district?.id === 'mogra_park' || district?.id === 'rain_tree_lane' ? 14 : 9) : 4;
    let placedTrees = 0;
    let treeAttempts = 0;
    while (placedTrees < count && treeAttempts < count * 10) {
      treeAttempts += 1;
      const localX = (random() - 0.5) * (CHUNK_SIZE_METRES - 12);
      const localZ = (random() - 0.5) * (CHUNK_SIZE_METRES - 12);
      const wx = centerX + localX;
      const wz = centerZ + localZ;
      if (Math.abs(wx + 30) < 28 && Math.abs(wz - 75) < 75) continue;
      if (!pointClearsSurfaceRoutes(wx, wz, 2.2)) continue;
      if (PROPERTY_WORLD_RESERVATIONS.some(({ center, reserveRadius }) => Math.hypot(wx - center.x, wz - center.z) < reserveRadius)) continue;
      if (wz < -332 || streetClearanceAt(wx, wz) < 1.5) continue;
      if (wx > 25 && wx < 110 && wz < -282 && wz > -318) continue;
      placements.push({
        lod: vegetationDetail,
        species: chooseSpecies(district?.id, random()),
        seed: Math.floor(random() * 1_000_000),
        scale: ring === 'visual' ? 0.72 : 0.85 + random() * 0.32,
        position: { x: wx, y: cityHeightAt(wx, wz), z: wz },
      });
      placedTrees += 1;
    }
    monitor?.recordSystem('chunk-vegetation-build', performance.now() - vegetationStarted);
    const vegetationMergeStarted = performance.now();
    const vegetationCluster = vegetation.createTreeCluster(placements, ring === 'active');
    while (vegetationCluster.children.length > 0) {
      vegetationRoot.add(vegetationCluster.children[0]!);
    }
    monitor?.recordSystem('chunk-vegetation-merge', performance.now() - vegetationMergeStarted);
    instanceSharedMeshes(roadside);
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
