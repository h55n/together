import * as THREE from 'three';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { StaticGeometryCache } from '../assets/runtime/StaticGeometryCache';

const facadeGeometry = new StaticGeometryCache();

/** Shared architectural vocabulary, authored on a local +X-facing facade. */
export function dressFacade(root: THREE.Group, materials: MaterialLibrary, width: number, depth: number, height: number, seed = 0): void {
  function box(size: [number,number,number], p: [number,number,number], key: WorldMaterialKey): THREE.Mesh {
    const mesh = new THREE.Mesh(facadeGeometry.box(...size),materials.get(key));mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  const face=width/2, roof=height+0.25;
  // Roof cap, raised parapet, corner piers and a shaded entry recess.
  box([width+0.65,0.18,depth+0.65],[0,roof,0],'warmPlaster');
  for(const side of [-1,1]){
    box([0.18,0.7,depth+0.3],[side*(face+0.08),roof+0.35,0],'warmPlaster');
    box([width,0.7,0.18],[0,roof+0.35,side*(depth/2+0.08)],'warmPlaster');
    box([0.19,height,0.25],[face+0.08,height/2,side*(depth/2-0.2)],'concrete');
    box([0.11,height+0.15,0.11],[face+0.24,height/2,side*(depth/2-0.5)],'metalDark');
  }
  box([0.1,2.35,1.35],[face+0.12,1.18,-depth*0.29],'metalDark');
  box([0.16,2.05,1.04],[face+0.2,1.05,-depth*0.29],'wood');
  box([0.1,0.24,0.04],[face+0.31,1.05,-depth*0.29+0.33],'curtainWarm');
  box([0.7,0.15,1.6],[face+0.28,0.09,-depth*0.29],'stone');
  box([1.1,0.13,1.9],[face+0.45,2.47,-depth*0.29],'terracottaPlaster');
  const floors=Math.max(1,Math.floor(height/3.1));
  for(let floor=0;floor<floors;floor+=1){
    const y=1.65+floor*3.05;
    for(const z of [-depth*0.3,0,depth*0.3]){
      if(floor===0&&z<0)continue;
      box([0.055,1.48,2.24],[face+0.045,y,z],'windowRecess');
      box([0.045,1.24,1.96],[face+0.08,y+0.025,z],'windowGlaze');
      for(const edge of [-1,1])box([0.15,1.5,0.1],[face+0.15,y,z+edge*1.14],'warmPlaster');
      box([0.15,0.1,2.38],[face+0.15,y-0.72,z],'warmPlaster');
      box([0.15,0.1,2.38],[face+0.15,y+0.72,z],'warmPlaster');
      box([0.17,1.4,0.065],[face+0.19,y,z],'wood');
      box([0.17,0.065,2.2],[face+0.19,y+0.18,z],'wood');
      box([0.45,0.12,2.65],[face+0.24,y+0.86,z],'concrete');
    }
    if(floor>0){
      const by=y-0.5, length=Math.min(4.8,depth*0.5);
      for(let z=-length/2;z<=length/2;z+=0.32)box([0.055,0.83,0.055],[face+1.14,by+0.44,z],'metalDark');
      box([0.07,0.07,length],[face+1.14,by+0.88,0],'wood');
      box([1.3,0.15,length],[face+0.6,by,0],'concrete');
      for(const z of [-length*0.32,length*0.32]){
        box([0.48,0.38,0.72],[face+0.85,by+0.26,z],'terracottaPlaster');
        const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(0.45,1),materials.get('foliageMid'));plant.scale.set(0.7,0.7,1.15);plant.position.set(face+0.85,by+0.62,z);root.add(plant);
      }
      if((floor+seed)%2===0){
        box([0.025,0.025,length*0.68],[face+0.6,by+1.8,0],'metalDark');
        for(let i=0;i<3;i+=1)box([0.035,0.75,0.52],[face+0.61,by+1.42,-0.8+i*0.8],i===1?'sagePlaster':'curtainWarm');
      }
    }
    const ac=box([0.48,0.55,0.95],[face+0.3,y+0.15,depth*0.4],'concrete');ac.name='air-conditioning';
    for(let j=0;j<4;j+=1)box([0.015,0.035,0.75],[face+0.55,y-0.02+j*0.1,depth*0.4],'metalDark');
  }
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,1.3,10),materials.get('metalDark'));tank.position.set(-width*0.2,roof+0.7,depth*0.22);root.add(tank);
}

/** One draw per surface family gives visible-ring buildings readable massing from every street. */
export function dressSimpleFacades(root: THREE.Group, materials: MaterialLibrary, width: number, depth: number, height: number, skipFace?: 'x+' | 'z-'): void {
  const glass: number[] = [];
  const recess: number[] = [];
  const doors: number[] = [];
  const projection = (size: [number, number, number], at: [number, number, number], key: WorldMaterialKey): void => {
    const mesh = new THREE.Mesh(facadeGeometry.box(...size), materials.get(key));
    mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  };
  const addQuad = (target: number[], face: 'x' | 'z', side: -1 | 1, coordinate: number, u0: number, u1: number, v0: number, v1: number): void => {
    const point = (u: number, v: number): [number, number, number] => face === 'x' ? [coordinate, v, u] : [u, v, coordinate];
    const corners = [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
    const flip = face === 'x' ? side === 1 : side === -1;
    for (const index of (flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3])) target.push(...corners[index]!);
  };
  const floors = Math.max(1, Math.floor(height / 3.1));
  for (const face of ['x', 'z'] as const) {
    for (const side of [-1, 1] as const) {
      if (skipFace === 'x+' && face === 'x' && side === 1) continue;
      if (skipFace === 'z-' && face === 'z' && side === -1) continue;
      const span = face === 'x' ? depth : width;
      const coordinate = side * (face === 'x' ? width : depth) / 2;
      const columns = Math.max(1, Math.floor(span / 4.2));
      for (let floor = 0; floor < floors; floor += 1) {
        const y = 1.65 + floor * 3.05;
        for (let column = 0; column < columns; column += 1) {
          if (floor === 0 && column === Math.floor(columns / 2)) continue;
          const u = -span / 2 + (column + 0.5) * span / columns;
          const facade = coordinate + side * 0.035;
          const border = coordinate + side * 0.025;
          addQuad(recess, face, side, border, u - 0.92, u + 0.92, y - 0.72, y + 0.78);
          addQuad(glass, face, side, facade, u - 0.76, u + 0.76, y - 0.57, y + 0.61);
          // A continuous lintel and narrow jambs project beyond the glazing.
          const lintel: [number, number, number] = face === 'x' ? [0.32, 0.11, 1.98] : [1.98, 0.11, 0.32];
          projection(lintel, face === 'x' ? [facade + side * 0.12, y + 0.76, u] : [u, y + 0.76, facade + side * 0.12], 'sandstone');
          for (const edge of [-1, 1]) {
            const jamb: [number, number, number] = face === 'x' ? [0.18, 1.43, 0.09] : [0.09, 1.43, 0.18];
            projection(jamb, face === 'x' ? [facade + side * 0.08, y, u + edge * 0.9] : [u + edge * 0.9, y, facade + side * 0.08], 'warmPlaster');
          }
          const mullion: [number, number, number] = face === 'x' ? [0.11, 1.22, 0.05] : [0.05, 1.22, 0.11];
          projection(mullion, face === 'x' ? [facade + side * 0.07, y + 0.025, u] : [u, y + 0.025, facade + side * 0.07], 'wood');
          const sill: [number, number, number] = face === 'x' ? [0.35, 0.13, 1.85] : [1.85, 0.13, 0.35];
          const sillAt: [number, number, number] = face === 'x'
            ? [facade + side * 0.15, y - 0.72, u]
            : [u, y - 0.72, facade + side * 0.15];
          projection(sill, sillAt, floor % 2 ? 'sandstone' : 'concrete');
        }
        if (face === 'z' && floor > 0 && span > 7) {
          // A shallow planted balcony breaks the otherwise flat side elevation.
          const balconyY = y - 0.62;
          const balconyZ = coordinate + side * 0.52;
          const length = Math.min(3.3, span * 0.5);
          projection([length, 0.16, 1.05], [0, balconyY, balconyZ], 'concrete');
          projection([length, 0.09, 0.1], [0, balconyY + 0.84, coordinate + side * 1.04], 'wood');
          for (const offsetX of [-length * 0.42, 0, length * 0.42]) {
            projection([0.07, 0.73, 0.07], [offsetX, balconyY + 0.44, coordinate + side * 1.04], 'metalDark');
          }
          for (const offsetX of [-length * 0.31, length * 0.31]) {
            projection([0.42, 0.27, 0.48], [offsetX, balconyY + 0.24, balconyZ], 'terracottaPlaster');
            projection([0.34, 0.42, 0.35], [offsetX, balconyY + 0.55, balconyZ], 'foliageMid');
          }
        }
      }
      const doorFace = coordinate + side * 0.045;
      addQuad(doors, face, side, doorFace, -0.58, 0.58, 0.04, 2.15);
      if (face === 'z') {
        projection([1.85, 0.12, 0.8], [0, 2.42, coordinate + side * 0.38], 'terracottaPlaster');
        projection([1.55, 0.11, 0.45], [0, 0.08, coordinate + side * 0.24], 'stone');
      }
    }
  }
  for (const [name, vertices, key] of [
    ['window-recess', recess, 'windowRecess'],
    ['window-glass', glass, 'windowGlaze'],
    ['ground-doors', doors, 'wood'],
  ] as const) {
    if (vertices.length === 0) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, materials.get(key));
    mesh.name = name;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}
