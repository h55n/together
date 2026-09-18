import { CHUNK_SIZE_METRES } from './chunks.js';
import { createSeededRandom } from './random.js';
import type { DistrictId } from './city.js';
import { buildingFootprintClearsSurfaceRoutes, pointClearsSurfaceRoutes } from './surfaces.js';

export type BuildingStyle =
  | 'mogra_balcony'
  | 'pg_veranda'
  | 'lantern_shopfront'
  | 'lantern_mixed_use'
  | 'rain_tree_old_home'
  | 'civic_modern'
  | 'hill_terrace'
  | 'waterfront_hut'
  | 'park_pavilion';

export type BuildingLot = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  style: BuildingStyle;
  facadeLayers: number;
  balconyCount: number;
};

export type DressingPropKind = 'bench' | 'lamp' | 'planter' | 'bicycle' | 'crate' | 'awning_post' | 'bin';
export type DressingProp = {
  id: string;
  kind: DressingPropKind;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
};

export type ChunkDressing = {
  buildings: BuildingLot[];
  props: DressingProp[];
};

const DISTRICT_STYLES: Record<DistrictId, readonly BuildingStyle[]> = {
  mogra_court: ['mogra_balcony', 'pg_veranda'],
  lantern_street: ['lantern_shopfront', 'lantern_mixed_use'],
  mogra_park: ['park_pavilion'],
  bay_steps: ['waterfront_hut'],
  rain_tree_lane: ['rain_tree_old_home', 'pg_veranda'],
  the_common: ['civic_modern', 'lantern_mixed_use'],
  hill_garden: ['hill_terrace', 'park_pavilion'],
};

function seedFor(chunkX: number, chunkZ: number, districtId: DistrictId): number {
  let hash = ((chunkX * 73856093) ^ (chunkZ * 19349663)) >>> 0;
  for (let i = 0; i < districtId.length; i += 1) hash = Math.imul(hash ^ districtId.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

export function generateChunkDressing(chunkX: number, chunkZ: number, districtId: DistrictId): ChunkDressing {
  const random = createSeededRandom(seedFor(chunkX, chunkZ, districtId));
  const openDistrict = districtId === 'mogra_park' || districtId === 'bay_steps' || districtId === 'hill_garden';
  const denseCommercial = districtId === 'lantern_street' || districtId === 'the_common';
  const buildingCount = openDistrict
    ? (districtId === 'mogra_park' ? 1 + Math.floor(random() * 2) : 2 + Math.floor(random() * 2))
    : denseCommercial ? 6 + Math.floor(random() * 3) : 5 + Math.floor(random() * 3);

  const styles = DISTRICT_STYLES[districtId];
  const buildings: BuildingLot[] = [];
  const edgeInset = 10;
  let attempts = 0;
  while (buildings.length < buildingCount && attempts < buildingCount * 12) {
    attempts += 1;
    const width = 6 + random() * 12;
    const depth = 7 + random() * 15;
    const heightBase = districtId === 'lantern_street' ? 7 : districtId === 'mogra_court' ? 6 : districtId === 'the_common' ? 6.5 : 4;
    const height = Math.min(15, heightBase + random() * (denseCommercial ? 8 : 6));
    const x = edgeInset + width / 2 + random() * (CHUNK_SIZE_METRES - edgeInset * 2 - width);
    const z = edgeInset + depth / 2 + random() * (CHUNK_SIZE_METRES - edgeInset * 2 - depth);
    const worldX = chunkX * CHUNK_SIZE_METRES + x;
    const worldZ = chunkZ * CHUNK_SIZE_METRES + z;
    if (!buildingFootprintClearsSurfaceRoutes(worldX, worldZ, width, depth)) continue;
    if (buildings.some((other) => Math.abs(other.x - x) < (other.width + width) * 0.55 && Math.abs(other.z - z) < (other.depth + depth) * 0.55)) continue;
    const style = styles[Math.floor(random() * styles.length)]!;
    buildings.push({
      id: `${districtId}:${chunkX}:${chunkZ}:b${buildings.length}`,
      x, z, width, depth, height,
      rotationY: (random() - 0.5) * 0.18,
      style,
      facadeLayers: denseCommercial ? 3 : 2 + Math.floor(random() * 2),
      balconyCount: style === 'mogra_balcony' || style === 'pg_veranda' ? 1 + Math.floor(random() * 3) : Math.floor(random() * 2),
    });
  }

  const propCount = openDistrict ? 9 + Math.floor(random() * 6) : 7 + Math.floor(random() * 5);
  const propKinds: DressingPropKind[] = districtId === 'rain_tree_lane'
    ? ['planter', 'planter', 'bench', 'bicycle', 'crate', 'bin']
    : districtId === 'bay_steps'
      ? ['lamp', 'lamp', 'bench', 'bicycle', 'bin']
      : districtId === 'mogra_park' || districtId === 'hill_garden'
        ? ['bench', 'lamp', 'planter', 'planter', 'bin']
        : districtId === 'lantern_street'
          ? ['crate', 'awning_post', 'bicycle', 'planter', 'bin', 'lamp']
          : ['bench', 'planter', 'bicycle', 'bin', 'lamp'];

  const props: DressingProp[] = [];
  let propAttempts = 0;
  while (props.length < propCount && propAttempts < propCount * 10) {
    propAttempts += 1;
    const x = 5 + random() * (CHUNK_SIZE_METRES - 10);
    const z = 5 + random() * (CHUNK_SIZE_METRES - 10);
    const worldX = chunkX * CHUNK_SIZE_METRES + x;
    const worldZ = chunkZ * CHUNK_SIZE_METRES + z;
    if (!pointClearsSurfaceRoutes(worldX, worldZ)) continue;
    const index = props.length;
    props.push({
      id: `${districtId}:${chunkX}:${chunkZ}:p${index}`,
      kind: propKinds[index % propKinds.length]!,
      x,
      z,
      rotationY: random() * Math.PI * 2,
      scale: 0.8 + random() * 0.4,
    });
  }
  return { buildings, props };
}
