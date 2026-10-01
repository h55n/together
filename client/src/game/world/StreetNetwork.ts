import * as THREE from 'three';
import { cityHeightAt, districtAtPosition, type BuildingLot, type ResidencyRing } from '@together/shared';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';

export const AUTHORED_STREETS = [
  { id: 'primary-spine', kind: 'primary', width: 9, points: [[-275,175],[-275,187],[-245,189],[-205,186],[-175,181],[-95,155],[-30,145],[-30,75],[-30,10],[-20,-65],[35,-160],[95,-265]] },
  { id: 'rain-tree-connector', kind: 'secondary', width: 6, points: [[-275,175],[-280,70],[-210,-20],[-205,-125],[-150,-185],[35,-160]] },
  { id: 'park-common-connector', kind: 'secondary', width: 7, points: [[-30,145],[35,165],[120,160],[150,110],[165,15],[178,-70],[135,-165],[95,-265]] },
  { id: 'bay-promenade', kind: 'primary', width: 8, points: [[-150,-250],[-50,-246],[55,-248],[160,-250],[265,-268]] },
  { id: 'hill-approach', kind: 'secondary', width: 6, points: [[120,160],[165,195],[205,235],[250,300],[300,330]] },
] as const;

type Sample = { x: number; z: number; nx: number; nz: number };
const routes = AUTHORED_STREETS.map((road) => {
  const curve = new THREE.CatmullRomCurve3(road.points.map(([x,z]) => new THREE.Vector3(x,0,z)), false, 'centripetal');
  const count = Math.ceil(curve.getLength() / 3);
  const points: Sample[] = [];
  for (let i = 0; i <= count; i += 1) {
    const p = curve.getPoint(i / count); const tangent = curve.getTangent(i / count);
    points.push({ x: p.x, z: p.z, nx: -tangent.z, nz: tangent.x });
  }
  return { ...road, samples: points };
});

/** Sampled road centres are also used by physical route audits and map tooling. */
export function streetCenterline(id: (typeof AUTHORED_STREETS)[number]['id']): Array<{ x: number; z: number }> {
  const route = routes.find((candidate) => candidate.id === id);
  if (!route) throw new Error(`Unknown street: ${id}`);
  return route.samples.map(({ x, z }) => ({ x, z }));
}
type CorridorPoint = { x: number; z: number; margin: number };
type CorridorNode = {
  point: CorridorPoint; axis: 'x' | 'z'; left: CorridorNode | null; right: CorridorNode | null;
  minX: number; maxX: number; minZ: number; maxZ: number; maxMargin: number;
};

function corridorTree(points: CorridorPoint[], level = 0): CorridorNode | null {
  if (!points.length) return null;
  const axis = level % 2 ? 'z' : 'x';
  points.sort((a, b) => a[axis] - b[axis]);
  const middle = Math.floor(points.length / 2), point = points[middle]!;
  const left = corridorTree(points.slice(0, middle), level + 1);
  const right = corridorTree(points.slice(middle + 1), level + 1);
  return {
    point, axis, left, right,
    minX: Math.min(point.x, left?.minX ?? Infinity, right?.minX ?? Infinity),
    maxX: Math.max(point.x, left?.maxX ?? -Infinity, right?.maxX ?? -Infinity),
    minZ: Math.min(point.z, left?.minZ ?? Infinity, right?.minZ ?? Infinity),
    maxZ: Math.max(point.z, left?.maxZ ?? -Infinity, right?.maxZ ?? -Infinity),
    maxMargin: Math.max(point.margin, left?.maxMargin ?? 0, right?.maxMargin ?? 0),
  };
}
const corridorIndex = corridorTree(routes.flatMap(route => route.samples.map(point => ({ x: point.x, z: point.z, margin: route.width / 2 + 3.2 }))));

function nearestCorridor(node: CorridorNode | null, x: number, z: number, best: number): number {
  if (!node) return best;
  const dx = Math.max(node.minX - x, 0, x - node.maxX), dz = Math.max(node.minZ - z, 0, z - node.maxZ);
  if (Math.hypot(dx, dz) - node.maxMargin >= best) return best;
  best = Math.min(best, Math.hypot(node.point.x - x, node.point.z - z) - node.point.margin);
  const leftFirst = (node.axis === 'x' ? x : z) < node.point[node.axis];
  best = nearestCorridor(leftFirst ? node.left : node.right, x, z, best);
  return nearestCorridor(leftFirst ? node.right : node.left, x, z, best);
}

/** Exact signed clearance, with indexed queries instead of scanning every street sample. */
export function streetClearanceAt(x: number, z: number): number {
  return nearestCorridor(corridorIndex, x, z, Infinity);
}

type Point = { x: number; z: number };
function clip(poly: Point[], axis: 'x' | 'z', bound: number, sign: number): Point[] {
  const output: Point[] = [];
  for (let i=0; i<poly.length; i+=1) {
    const a = poly[i]!; const b = poly[(i+1)%poly.length]!;
    const da = (a[axis]-bound)*sign; const db = (b[axis]-bound)*sign;
    if (da>=0) output.push(a);
    if ((da>=0)!==(db>=0)) {
      const t = da/(da-db);
      output.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
    }
  }
  return output;
}

/** Clipped ribbons follow terrain and are owned/disposed by their resident chunk. */
export function buildStreetChunk(cx: number, cz: number, ring: Exclude<ResidencyRing,'unloaded'>, materials: MaterialLibrary): THREE.Group {
  const root = new THREE.Group(); root.name = 'authored-street-network';
  const batches = new Map<WorldMaterialKey, number[]>();
  const minX=cx*128, minZ=cz*128;
  function strip(a: Sample,b: Sample,left: number,right: number,lift: number,key: WorldMaterialKey): void {
    if (left > right) [left, right] = [right, left];
    let poly: Point[] = [
      {x:a.x+a.nx*left,z:a.z+a.nz*left}, {x:b.x+b.nx*left,z:b.z+b.nz*left},
      {x:b.x+b.nx*right,z:b.z+b.nz*right}, {x:a.x+a.nx*right,z:a.z+a.nz*right},
    ];
    poly=clip(clip(clip(clip(poly,'x',minX,1),'x',minX+128,-1),'z',minZ,1),'z',minZ+128,-1);
    if(poly.length<3) return;
    let positions=batches.get(key); if(!positions){positions=[];batches.set(key,positions);}
    for(let i=1;i<poly.length-1;i+=1) for(const p of [poly[0]!,poly[i+1]!,poly[i]!]) positions.push(p.x,cityHeightAt(p.x,p.z)+lift,p.z);
  }
  for(const route of routes) for(let i=0;i<route.samples.length-1;i+=1){
    const a=route.samples[i]!, b=route.samples[i+1]!;
    if(Math.max(a.x,b.x)+12<minX || Math.min(a.x,b.x)-12>minX+128 || Math.max(a.z,b.z)+12<minZ || Math.min(a.z,b.z)-12>minZ+128)continue;
    // The existing hero street owns this section and its raised sidewalks.
    if(route.id==='primary-spine' && a.z>17 && a.z<133 && b.z>17 && b.z<133)continue;
    const half=route.width/2;
    strip(a,b,-half,half,0.015,'asphalt');
    if(ring==='horizon')continue;
    for(const side of [-1,1]){
      strip(a,b,side*half,side*(half+0.22),0.055,'stone');
      strip(a,b,side*(half+0.22),side*(half+2.7),0.045,'concrete');
      if(ring==='active')strip(a,b,side*(half-0.15),side*(half-0.06),0.023,'curtainWarm');
    }
    if(ring==='active' && i%4<2)strip(a,b,-0.045,0.045,0.025,'curtainWarm');
  }
  for(const [key,vertices] of batches){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const uv=[];for(let i=0;i<vertices.length;i+=3)uv.push(vertices[i]!/24,vertices[i+2]!/24);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,materials.get(key));

    mesh.receiveShadow=true;root.add(mesh);
  }
  return root;
}


export function streetPlantingForChunk(cx: number, cz: number): Array<{x:number;z:number;seed:number}> {
  const result: Array<{x:number;z:number;seed:number}> = [];
  for(let r=0;r<routes.length;r+=1){
    const route=routes[r]!;
    for(let i=0;i<route.samples.length;i+=6){
      const p=route.samples[i]!;
      for(const side of [-1,1]){
        const x=p.x+p.nx*(route.width/2+4.5)*side,z=p.z+p.nz*(route.width/2+4.5)*side;
        if(x>=cx*128&&x<(cx+1)*128&&z>=cz*128&&z<(cz+1)*128)result.push({x,z,seed:r*1000+i+(side+1)});
      }
    }
  }
  return result;
}

/** Compact residential fronts address the actual streets instead of floating in open lots. */
export function streetFrontageLotsForChunk(cx: number, cz: number): BuildingLot[] {
  const lots: BuildingLot[] = [];
  for (const route of routes) {
    if (route.id === 'bay-promenade' || route.id === 'hill-approach') continue;
    for (let i = 5; i < route.samples.length - 5; i += 11) {
      const sample = route.samples[i]!;
      for (const side of [-1, 1]) {
        const x = sample.x + sample.nx * (route.width / 2 + 11.5) * side;
        const z = sample.z + sample.nz * (route.width / 2 + 11.5) * side;
        if (x < cx * 128 || x >= (cx + 1) * 128 || z < cz * 128 || z >= (cz + 1) * 128) continue;
        const district = districtAtPosition(x, z);
        if (!district || ['mogra_park', 'hill_garden', 'bay_steps'].includes(district.id)) continue;
        const variant = (i + (side + 1)) % 4;
        const width = 7.4 + variant * 0.45, depth = 10.8 + variant * 0.6;
        if (streetClearanceAt(x, z) < Math.hypot(width, depth) / 2 + 0.8) continue;
        lots.push({
          id: `street-frontage:${route.id}:${i}:${side}`, x: x - cx * 128, z: z - cz * 128,
          width, depth, height: variant % 2 ? 9.3 : 6.4,
          rotationY: Math.atan2(sample.nz * side, -sample.nx * side) - Math.PI / 2,
          style: district.id === 'lantern_street' ? (variant % 2 ? 'lantern_mixed_use' : 'lantern_shopfront')
            : district.id === 'rain_tree_lane' ? 'rain_tree_old_home'
              : district.id === 'the_common' ? 'civic_modern' : 'mogra_balcony',
          facadeLayers: 4, balconyCount: variant % 2 ? 2 : 1,
        });
      }
    }
  }
  return lots;
}
