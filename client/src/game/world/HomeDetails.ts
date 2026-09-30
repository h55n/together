import * as THREE from 'three';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';

/** Detail stays on existing surfaces so furniture placement and walking lanes remain free. */
export function dressHome(root: THREE.Group, materials: MaterialLibrary, x:number,y:number,z:number,width:number,depth:number):void {
  const add=(size:[number,number,number],p:[number,number,number],key:WorldMaterialKey)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),materials.get(key));mesh.position.set(x+p[0],y+p[1],z+p[2]);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const hw=width/2,hd=depth/2;
  for(const side of [-1,1]){
    add([0.07,0.13,depth-0.2],[side*(hw-0.12),0.25,0],'wood');
    add([width-0.2,0.13,0.07],[0,0.25,side*(hd-0.12)],'wood');
  }
  add([2.9,0.025,2.7],[-0.3,0.197,-0.3],'sagePlaster');
  for(const edge of [-1,1])add([2.7,0.028,0.06],[-0.3,0.2,-0.3+edge*1.2],'curtainWarm');
  // Four slender legs support the existing shared table.
  for(const xx of [-0.92,0.32])for(const zz of [-0.7,0.1])add([0.09,0.62,0.09],[xx,0.43,zz],'wood');
  for(let i=0;i<2;i+=1){
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.055,0.13,12),materials.get('warmPlaster'));
    cup.position.set(x-0.6+i*0.6,y+0.9,z-0.3);root.add(cup);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.012,5,10),materials.get('warmPlaster'));
    handle.position.set(cup.position.x+0.08,cup.position.y,cup.position.z);root.add(handle);
  }
  const kitchenX=-hw+3.1;
  add([3.7,0.07,0.76],[kitchenX,0.94,hd-0.75],'warmPlaster');
  for(let i=0;i<4;i+=1){
    add([0.82,0.69,0.04],[kitchenX-1.36+i*0.9,0.5,hd-1.12],'sagePlaster');
    add([0.24,0.04,0.065],[kitchenX-1.36+i*0.9,0.72,hd-1.16],'metalDark');
  }
  add([3.5,0.6,0.06],[kitchenX,1.28,hd-0.12],'concrete');
  add([3.5,0.07,0.28],[kitchenX,1.95,hd-0.28],'wood');
  for(let i=0;i<7;i+=1){
    const jar=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.2+i%2*0.06,10),materials.get(i%2?'terracottaPlaster':'curtainWarm'));
    jar.position.set(x+kitchenX-1.3+i*0.35,y+2.08,z+hd-0.28);root.add(jar);
  }
  for(const side of [-1,1]){
    const curtain=add([0.6,1.65,0.11],[-2.2+side*1.6,1.8,hd-0.25],'curtainWarm');curtain.rotation.y=side*0.06;
  }
  add([4,0.055,0.055],[-2.2,2.7,hd-0.3],'metalDark');
  // Art on the side wall and a low book shelf add domestic scale.
  add([0.065,1.0,1.4],[-hw+0.14,1.9,0.3],'wood');
  add([0.075,0.82,1.22],[-hw+0.19,1.9,0.3],'sagePlaster');
  add([0.085,0.24,0.66],[-hw+0.23,1.75,0.3],'curtainWarm');
  for(const sy of [0.4,0.85,1.3])add([0.35,0.06,1.7],[-hw+0.28,sy,1.6],'wood');
  for(let i=0;i<7;i+=1)add([0.22,0.31,0.1],[-hw+0.27,1.03,0.92+i*0.18],i%2?'terracottaPlaster':'sagePlaster');
  const lamp=new THREE.PointLight(0xffd9a0,13,10,2);lamp.position.set(x,y+2.55,z+0.5);root.add(lamp);
  const kitchenFill=new THREE.PointLight(0xffe5bf,5,6,2);kitchenFill.position.set(x+kitchenX,y+2.4,z+hd-1.2);root.add(kitchenFill);
}
