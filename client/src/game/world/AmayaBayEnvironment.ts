import * as THREE from 'three';
import { cityHeightAt, locationAnchor } from '@together/shared';
import type { MaterialLibrary } from './MaterialLibrary';
import { VegetationSystem } from './VegetationSystem';

export class AmayaBayEnvironment {
  readonly root = new THREE.Group();

  constructor(private readonly materials: MaterialLibrary) {
    this.root.name = 'amaya-bay-authored-environment';
    this.root.add(this.createMograCourt());
    this.root.add(this.createMograPark());
    this.root.add(this.createBaySteps());
    this.root.add(this.createRainTreeLane());
    this.root.add(this.createCommon());
    this.root.add(this.createHillGarden());
  }


  private createMograCourt(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:mogra-court';
    const y = cityHeightAt(-225, 160);
    for (let i = 0; i < 3; i += 1) {
      const building = new THREE.Group();
      const x = -250 + i * 26;
      addBox(building, [18, 12 + i * 2.5, 22], [x, y + 6 + i * 1.25, 160 + (i % 2) * 16], this.materials.get(i === 1 ? 'sagePlaster' : 'warmPlaster'));
      for (let floor = 0; floor < 3; floor += 1) {
        for (const windowX of [-5, 0, 5]) addBox(building, [2.5, 1.35, .18], [x + windowX, y + 2.5 + floor * 3.1, 148.9 + (i % 2) * 16], this.materials.get('glass'), false);
      }
      root.add(building);
    }
    // Corner grocery/laundromat edge gives the residential colony a lived commercial seam.
    addBox(root, [13, 4.2, 8], [-183, y + 2.1, 126], this.materials.get('terracottaPlaster'));
    addBox(root, [12.2, 2.25, .12], [-183, y + 1.45, 121.95], this.materials.get('glass'), false);
    addBox(root, [14, .18, 2.2], [-183, y + 3.7, 121.2], this.materials.get('sagePlaster'));
    return root;
  }

  private createMograPark(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:mogra-park';
    const y = cityHeightAt(185,110);
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(58,58,.18,48), this.materials.get('foliageMid'));
    lawn.position.set(185,y,110); lawn.receiveShadow = true; root.add(lawn);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(7.5,8,.65,32), this.materials.get('stone'));
    basin.position.set(184,y+.35,108); root.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(6.9,6.9,.08,32), this.materials.get('water'));
    water.position.set(184,y+.7,108); root.add(water);
    const vegetation = new VegetationSystem(this.materials);
    for (let i=0;i<13;i+=1){ const a=i/13*Math.PI*2; const tree=vegetation.createTree({species:i%4===0?'gulmohar':'rain_tree',seed:500+i,scale:.95}); tree.position.set(185+Math.cos(a)*43,y,110+Math.sin(a)*39); root.add(tree); }
    const badminton=locationAnchor('park_badminton')!;
    const courtY=cityHeightAt(badminton.position.x,badminton.position.z);
    addBox(root,[13,.08,6.1],[badminton.position.x,courtY+.04,badminton.position.z],this.materials.get('sagePlaster'),false);
    addBox(root,[.05,.9,6.1],[badminton.position.x,courtY+.48,badminton.position.z],this.materials.get('curtainWarm'),false);
    for(const sx of [-6.1,6.1]) addBox(root,[.08,1.15,.08],[badminton.position.x+sx,courtY+.58,badminton.position.z],this.materials.get('metalDark'));
    const picnic=locationAnchor('park_picnic_lawn')!;
    for(const offset of [[-5,3],[4,-4],[8,5]] as const) addBox(root,[2.2,.1,1.35],[picnic.position.x+offset[0],courtY+.08,picnic.position.z+offset[1]],this.materials.get('curtainWarm'),false);
    return root;
  }

  private createBaySteps(): THREE.Group {
    const root = new THREE.Group(); root.name='landmark:bay-steps';
    const water = new THREE.Mesh(new THREE.PlaneGeometry(620,220), this.materials.get('water')); water.rotation.x=-Math.PI/2; water.position.set(70,-.05,-405); root.add(water);
    for(let i=0;i<7;i+=1) addBox(root,[210,.28,5],[75,.14+i*.16,-300-i*4.4],this.materials.get('stone'),false);
    const promenade = addBox(root,[220,.24,22],[75,.22,-270],this.materials.get('concrete'),false); promenade.receiveShadow=true;
    const pier = addBox(root,[4,.35,54],[118,.25,-336],this.materials.get('wood')); pier.receiveShadow=true;
    for(let i=0;i<9;i+=1){ addBox(root,[.12,2,.12],[118-1.65,.9,-314-i*6],this.materials.get('metalDark')); addBox(root,[.12,2,.12],[118+1.65,.9,-314-i*6],this.materials.get('metalDark')); }
    const cycle=locationAnchor('bay_cycle_hut')!;
    addBox(root,[9,3.6,5],[cycle.position.x,2.0,cycle.position.z],this.materials.get('sagePlaster'));
    addBox(root,[10,.18,6],[cycle.position.x,3.9,cycle.position.z],this.materials.get('wood'));
    const kayak=locationAnchor('bay_kayak_hut')!;
    addBox(root,[8,3.2,5],[kayak.position.x,1.7,kayak.position.z],this.materials.get('warmPlaster'));
    addBox(root,[9,.15,6],[kayak.position.x,3.35,kayak.position.z],this.materials.get('terracottaPlaster'));
    for(let i=0;i<3;i+=1){const boat=new THREE.Mesh(new THREE.CapsuleGeometry(.35,2.3,4,8),this.materials.get(i===1?'terracottaPlaster':'sagePlaster'));boat.rotation.z=Math.PI/2;boat.position.set(kayak.position.x-4+i*4,.48,kayak.position.z-4.2);root.add(boat);}
    return root;
  }

  private createRainTreeLane(): THREE.Group {
    const root = new THREE.Group(); root.name='landmark:rain-tree-lane';
    const vegetation=new VegetationSystem(this.materials); const y=cityHeightAt(-210,-95);
    for(let i=0;i<14;i+=1){ const side=i%2===0?-1:1; const tree=vegetation.createTree({species:'rain_tree',seed:700+i,scale:1.05}); tree.position.set(-210+side*(11+(i%3)*2),y,-155+i*9.2); root.add(tree); }
    addBox(root,[18,5.5,22],[-246,y+2.75,-88],this.materials.get('sagePlaster'));
    addBox(root,[10,.2,5],[-236.5,y+2.5,-88],this.materials.get('warmPlaster'));
    const nursery=locationAnchor('rain_tree_nursery')!;
    const ny=cityHeightAt(nursery.position.x,nursery.position.z);
    addBox(root,[15,.14,10],[nursery.position.x,ny+.07,nursery.position.z],this.materials.get('soil'),false);
    for(let i=0;i<9;i+=1){const xx=nursery.position.x-5+(i%3)*5;const zz=nursery.position.z-3+Math.floor(i/3)*3;const pot=new THREE.Mesh(new THREE.CylinderGeometry(.38,.3,.5,9),this.materials.get('terracottaPlaster'));pot.position.set(xx,ny+.25,zz);root.add(pot);const crown=new THREE.Mesh(new THREE.SphereGeometry(.48,8,6),this.materials.get(i%2?'foliageMid':'foliageDeep'));crown.scale.set(.8,1.15,.8);crown.position.set(xx,ny+.95,zz);root.add(crown);}
    return root;
  }

  private createCommon(): THREE.Group {
    const root=new THREE.Group(); root.name='landmark:the-common'; const y=cityHeightAt(215,-80);
    addBox(root,[38,8,25],[215,y+4,-80],this.materials.get('warmPlaster'));
    addBox(root,[19,1.2,5],[215,y+7.5,-93],this.materials.get('wood'));
    for(const x of [202,210,220,228]) addBox(root,[4.2,2.3,.18],[x,y+3.3,-92.6],this.materials.get('glass'),false);
    const courtyard=addBox(root,[62,.16,50],[215,y+.08,-45],this.materials.get('stone'),false); courtyard.receiveShadow=true;
    return root;
  }

  private createHillGarden(): THREE.Group {
    const root=new THREE.Group(); root.name='landmark:hill-garden'; const y=cityHeightAt(265,275);
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(20,23,1,32),this.materials.get('stone')); platform.position.set(265,y+.5,275); root.add(platform);
    addBox(root,[12,4.2,9],[283,y+2.1,272],this.materials.get('warmPlaster'));
    addBox(root,[14,.3,11],[283,y+4.25,272],this.materials.get('wood'));
    const railRadius=16;
    for(let i=0;i<14;i+=1){const a=(i/14)*Math.PI*1.45+.15; addBox(root,[.12,1.2,.12],[265+Math.cos(a)*railRadius,y+1.1,275+Math.sin(a)*railRadius],this.materials.get('metalDark'));}
    const golf=locationAnchor('hill_minigolf')!;
    const gy=cityHeightAt(golf.position.x,golf.position.z);
    for(let hole=0;hole<6;hole+=1){const hx=golf.position.x+(hole%3)*9-9;const hz=golf.position.z+Math.floor(hole/3)*11-5;addBox(root,[7.2,.12,3.2],[hx,gy+.08,hz],this.materials.get('foliageMid'),false);const flag=addBox(root,[.04,1.2,.04],[hx+2.3,gy+.65,hz],this.materials.get('metalDark'));void flag;addBox(root,[.55,.3,.04],[hx+2.58,gy+1.05,hz],this.materials.get('terracottaPlaster'),false);}
    return root;
  }
}


function addBox(group:THREE.Group,size:[number,number,number],position:[number,number,number],material:THREE.Material,cast=true):THREE.Mesh{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=cast;mesh.receiveShadow=true;group.add(mesh);return mesh;}
