import * as THREE from 'three';
import { cityHeightAt } from '@together/shared';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';
import { VegetationSystem } from './VegetationSystem';

/** Authored civic and garden furniture; all positions are grounded on city terrain. */
export function addDistrictDetails(root: THREE.Group, district: 'park'|'common'|'hill'|'rain', materials:MaterialLibrary):void {
  const vegetation=new VegetationSystem(materials);
  const center=district==='park'?{x:185,z:110}:district==='common'?{x:215,z:-45}:district==='hill'?{x:265,z:275}:{x:-210,z:-95};
  const box=(size:[number,number,number],p:[number,number,number],key:WorldMaterialKey)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),materials.get(key));mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const bench=(x:number,z:number,angle:number)=>{
    const group=new THREE.Group(),y=cityHeightAt(x,z);
    const parts:[number[],number[],WorldMaterialKey][]=[[[2.1,0.12,0.58],[0,0.51,0],'wood'],[[2.1,0.5,0.09],[0,0.86,0.29],'wood'],[[0.1,0.5,0.5],[-0.8,0.25,0],'metalDark'],[[0.1,0.5,0.5],[0.8,0.25,0],'metalDark']];
    for(const [size,p,key] of parts){const mesh=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),materials.get(key));mesh.position.set(p[0]!,p[1]!,p[2]!);mesh.castShadow=true;group.add(mesh);}
    group.position.set(x,y,z);group.rotation.y=angle;root.add(group);
  };
  const radius=district==='common'?21:district==='hill'?24:district==='rain'?13:32;
  for(let i=0;i<12;i+=1){
    const a=i/12*Math.PI*2,x=center.x+Math.cos(a)*radius,z=center.z+Math.sin(a)*radius,y=cityHeightAt(x,z);
    if(district==='rain'&&i%3!==0)continue;
    if(district==='common'&&i===9)continue; // Keep the library's square-facing entrance open.
    if(district==='hill'&&i===10)continue; // Keep the mini-golf tee and sightline clear.
    if(i%2===0)bench(x,z,-a-Math.PI/2);
    const tree=vegetation.createTree({species:i%3===0?'gulmohar':'rain_tree',seed:340+i,scale:0.85});
    tree.position.set(x+Math.cos(a)*4,cityHeightAt(x+Math.cos(a)*4,z+Math.sin(a)*4),z+Math.sin(a)*4);root.add(tree);
    box([2.2,0.4,1.1],[x,y+0.2,z],'terracottaPlaster');
    for(let j=0;j<3;j+=1){const shrub=vegetation.createShrub(i*31+j,0.7);shrub.position.set(x-0.7+j*0.7,y+0.42,z);root.add(shrub);}
  }
  // A terrain-following loop makes lawns and gardens legible as places to walk.
  if(district==='park'||district==='hill'){
    for(let i=0;i<96;i+=1){const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2;
      const x=center.x+Math.cos(a)*(radius-4),z=center.z+Math.sin(a)*(radius-4);
      const nx=center.x+Math.cos(b)*(radius-4),nz=center.z+Math.sin(b)*(radius-4);
      const section=box([2.4,0.06,Math.hypot(nx-x,nz-z)+0.1],[(x+nx)/2,cityHeightAt((x+nx)/2,(z+nz)/2)+0.02,(z+nz)/2],'concrete');section.rotation.y=Math.atan2(nx-x,nz-z);
    }
  }
  if(district==='park'||district==='common'){
    const x=center.x+18,z=center.z+14,y=cityHeightAt(x,z);
    for(const xx of [-2.5,2.5])for(const zz of [-2,2])box([0.17,2.7,0.17],[x+xx,y+1.35,z+zz],'wood');
    for(let i=0;i<9;i+=1)box([5.7,0.13,0.13],[x,y+2.75,z-2.2+i*0.55],'wood');
    bench(x,z,0);
  }
  if(district==='rain'){
    for(let i=0;i<8;i+=1){const x=-235+i*3,z=-115,y=cityHeightAt(x,z);box([0.04,0.035,0.04],[x,y+3,z],'metalDark');box([0.75,0.95,0.035],[x,y+2.6,z],i%2?'curtainWarm':'sagePlaster');}
    box([24,0.03,0.03],[-224.5,cityHeightAt(-224.5,-115)+3.1,-115],'metalDark');
  }
}
