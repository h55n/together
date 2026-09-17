import * as THREE from 'three';
import { cityHeightAt, locationAnchor } from '@together/shared';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
import type { MaterialLibrary } from './MaterialLibrary';
import { VegetationSystem } from './VegetationSystem';

export class AmayaBayEnvironment {
  readonly root = new THREE.Group();

  constructor(private readonly materials: MaterialLibrary) {
    this.root.name = 'amaya-bay-authored-environment';
    this.root.add(compileStaticMeshesByMaterial(this.createMograCourt()));
    this.root.add(compileStaticMeshesByMaterial(this.createMograPark()));
    this.root.add(compileStaticMeshesByMaterial(this.createBaySteps()));
    this.root.add(compileStaticMeshesByMaterial(this.createRainTreeLane()));
    this.root.add(compileStaticMeshesByMaterial(this.createCommon()));
    this.root.add(compileStaticMeshesByMaterial(this.createHillGarden()));
  }

  private createMograCourt(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:mogra-court';
    const apartments = [
      { x: -250, z: 135, height: 12 },
      { x: -224, z: 135, height: 14.5 },
      { x: -198, z: 150, height: 17 },
    ] as const;

    for (let i = 0; i < apartments.length; i += 1) {
      const building = new THREE.Group();
      const { x, z, height } = apartments[i]!;
      const y = cityHeightAt(x, z);
      addBox(building, [18, height, 22], [x, y + height / 2, z], this.materials.get(i === 1 ? 'sagePlaster' : 'warmPlaster'));
      addBox(building, [19.2, 0.34, 23.2], [x, y + height + 0.17, z], this.materials.get(i === 1 ? 'warmPlaster' : 'terracottaPlaster'));
      addBox(building, [19, 0.42, 22.8], [x, y + 0.21, z], this.materials.get('stone'));
      for (let floor = 0; floor < 3; floor += 1) {
        for (const windowX of [-5, 0, 5]) {
          addBox(building, [2.5, 1.35, 0.18], [x + windowX, y + 2.5 + floor * 3.1, z - 11.1], this.materials.get('glass'), false);
          addBox(building, [2.85, 0.16, 0.5], [x + windowX, y + 1.75 + floor * 3.1, z - 11.22], this.materials.get('concrete'), false);
        }
        if (floor > 0) {
          addBox(building, [7.1, 0.2, 1.5], [x, y + 1.7 + floor * 3.1, z - 11.65], this.materials.get('concrete'));
          addBox(building, [7.2, 0.7, 0.1], [x, y + 2.05 + floor * 3.1, z - 12.35], this.materials.get('metalDark'), false);
        }
      }
      root.add(building);
    }

    // Corner grocery/laundromat edge gives the residential colony a lived commercial seam.
    const shopY = cityHeightAt(-183, 126);
    addBox(root, [13, 4.2, 8], [-183, shopY + 2.1, 126], this.materials.get('terracottaPlaster'));
    addBox(root, [14, 0.28, 9], [-183, shopY + 4.34, 126], this.materials.get('warmPlaster'));
    addBox(root, [12.2, 2.25, 0.12], [-183, shopY + 1.45, 121.95], this.materials.get('glass'), false);
    addBox(root, [14, 0.18, 2.2], [-183, shopY + 3.7, 121.2], this.materials.get('sagePlaster'));
    return root;
  }

  private createMograPark(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:mogra-park';
    const y = cityHeightAt(185, 110);
    const lawn = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 0.18, 48), this.materials.get('foliageMid'));
    lawn.position.set(185, y, 110); lawn.receiveShadow = true; root.add(lawn);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 0.65, 32), this.materials.get('stone'));
    basin.position.set(184, y + 0.35, 108); root.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.9, 0.08, 32), this.materials.get('water'));
    water.position.set(184, y + 0.7, 108); root.add(water);
    const vegetation = new VegetationSystem(this.materials);
    for (let i = 0; i < 13; i += 1) {
      const a = i / 13 * Math.PI * 2;
      const tree = vegetation.createTree({ species: i % 4 === 0 ? 'gulmohar' : 'rain_tree', seed: 500 + i, scale: 0.95 });
      tree.position.set(185 + Math.cos(a) * 43, y, 110 + Math.sin(a) * 39);
      root.add(tree);
    }
    const badminton = locationAnchor('park_badminton')!;
    const courtY = cityHeightAt(badminton.position.x, badminton.position.z);
    addBox(root, [13, 0.08, 6.1], [badminton.position.x, courtY + 0.04, badminton.position.z], this.materials.get('sagePlaster'), false);
    addBox(root, [0.05, 0.9, 6.1], [badminton.position.x, courtY + 0.48, badminton.position.z], this.materials.get('curtainWarm'), false);
    for (const sx of [-6.1, 6.1]) addBox(root, [0.08, 1.15, 0.08], [badminton.position.x + sx, courtY + 0.58, badminton.position.z], this.materials.get('metalDark'));
    const picnic = locationAnchor('park_picnic_lawn')!;
    for (const offset of [[-5, 3], [4, -4], [8, 5]] as const) addBox(root, [2.2, 0.1, 1.35], [picnic.position.x + offset[0], courtY + 0.08, picnic.position.z + offset[1]], this.materials.get('curtainWarm'), false);
    return root;
  }

  private createBaySteps(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:bay-steps';
    const water = new THREE.Mesh(new THREE.PlaneGeometry(620, 220), this.materials.get('water')); water.rotation.x = -Math.PI / 2; water.position.set(70, -0.05, -405); root.add(water);
    for (let i = 0; i < 7; i += 1) addBox(root, [210, 0.28, 5], [75, 0.14 + i * 0.16, -300 - i * 4.4], this.materials.get('stone'), false);
    const promenade = addBox(root, [220, 0.24, 22], [75, 0.22, -270], this.materials.get('concrete'), false); promenade.receiveShadow = true;
    const pier = addBox(root, [4, 0.35, 54], [118, 0.25, -336], this.materials.get('wood')); pier.receiveShadow = true;
    for (let i = 0; i < 9; i += 1) {
      addBox(root, [0.12, 2, 0.12], [118 - 1.65, 0.9, -314 - i * 6], this.materials.get('metalDark'));
      addBox(root, [0.12, 2, 0.12], [118 + 1.65, 0.9, -314 - i * 6], this.materials.get('metalDark'));
    }
    const cycle = locationAnchor('bay_cycle_hut')!;
    addBox(root, [9, 3.6, 5], [cycle.position.x, 2.0, cycle.position.z], this.materials.get('sagePlaster'));
    addBox(root, [10, 0.18, 6], [cycle.position.x, 3.9, cycle.position.z], this.materials.get('wood'));
    const kayak = locationAnchor('bay_kayak_hut')!;
    addBox(root, [8, 3.2, 5], [kayak.position.x, 1.7, kayak.position.z], this.materials.get('warmPlaster'));
    addBox(root, [9, 0.15, 6], [kayak.position.x, 3.35, kayak.position.z], this.materials.get('terracottaPlaster'));
    for (let i = 0; i < 3; i += 1) {
      const boat = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.3, 4, 8), this.materials.get(i === 1 ? 'terracottaPlaster' : 'sagePlaster'));
      boat.rotation.z = Math.PI / 2;
      boat.position.set(kayak.position.x - 4 + i * 4, 0.48, kayak.position.z - 4.2);
      root.add(boat);
    }
    return root;
  }

  private createRainTreeLane(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:rain-tree-lane';
    const vegetation = new VegetationSystem(this.materials); const y = cityHeightAt(-210, -95);
    for (let i = 0; i < 14; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const tree = vegetation.createTree({ species: 'rain_tree', seed: 700 + i, scale: 1.05 });
      tree.position.set(-210 + side * (11 + (i % 3) * 2), y, -155 + i * 9.2);
      root.add(tree);
    }
    addBox(root, [18, 5.5, 22], [-246, y + 2.75, -88], this.materials.get('sagePlaster'));
    addBox(root, [19.2, 0.3, 23.2], [-246, y + 5.65, -88], this.materials.get('wood'));
    addBox(root, [19, 0.35, 22.8], [-246, y + 0.18, -88], this.materials.get('stone'));
    addBox(root, [10, 0.2, 5], [-236.5, y + 2.5, -88], this.materials.get('warmPlaster'));
    const nursery = locationAnchor('rain_tree_nursery')!;
    const ny = cityHeightAt(nursery.position.x, nursery.position.z);
    addBox(root, [15, 0.14, 10], [nursery.position.x, ny + 0.07, nursery.position.z], this.materials.get('soil'), false);
    for (let i = 0; i < 9; i += 1) {
      const xx = nursery.position.x - 5 + (i % 3) * 5;
      const zz = nursery.position.z - 3 + Math.floor(i / 3) * 3;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.5, 9), this.materials.get('terracottaPlaster'));
      pot.position.set(xx, ny + 0.25, zz); root.add(pot);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), this.materials.get(i % 2 ? 'foliageMid' : 'foliageDeep'));
      crown.scale.set(0.8, 1.15, 0.8); crown.position.set(xx, ny + 0.95, zz); root.add(crown);
    }
    return root;
  }

  private createCommon(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:the-common'; const y = cityHeightAt(215, -80);
    addBox(root, [38, 8, 25], [215, y + 4, -80], this.materials.get('warmPlaster'));
    addBox(root, [40, 0.34, 27], [215, y + 8.17, -80], this.materials.get('stone'));
    addBox(root, [40, 0.42, 27], [215, y + 0.21, -80], this.materials.get('stone'));
    addBox(root, [19, 1.2, 5], [215, y + 7.5, -93], this.materials.get('wood'));
    for (const x of [202, 210, 220, 228]) addBox(root, [4.2, 2.3, 0.18], [x, y + 3.3, -92.6], this.materials.get('glass'), false);
    const courtyard = addBox(root, [62, 0.16, 50], [215, y + 0.08, -45], this.materials.get('stone'), false); courtyard.receiveShadow = true;
    return root;
  }

  private createHillGarden(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:hill-garden'; const y = cityHeightAt(265, 275);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(20, 23, 1, 32), this.materials.get('stone')); platform.position.set(265, y + 0.5, 275); root.add(platform);
    addBox(root, [12, 4.2, 9], [283, y + 2.1, 272], this.materials.get('warmPlaster'));
    addBox(root, [14, 0.3, 11], [283, y + 4.25, 272], this.materials.get('wood'));
    const railRadius = 16;
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 1.45 + 0.15;
      addBox(root, [0.12, 1.2, 0.12], [265 + Math.cos(a) * railRadius, y + 1.1, 275 + Math.sin(a) * railRadius], this.materials.get('metalDark'));
    }
    const golf = locationAnchor('hill_minigolf')!;
    const gy = cityHeightAt(golf.position.x, golf.position.z);
    for (let hole = 0; hole < 6; hole += 1) {
      const hx = golf.position.x + (hole % 3) * 9 - 9;
      const hz = golf.position.z + Math.floor(hole / 3) * 11 - 5;
      addBox(root, [7.2, 0.12, 3.2], [hx, gy + 0.08, hz], this.materials.get('foliageMid'), false);
      addBox(root, [0.04, 1.2, 0.04], [hx + 2.3, gy + 0.65, hz], this.materials.get('metalDark'));
      addBox(root, [0.55, 0.3, 0.04], [hx + 2.58, gy + 1.05, hz], this.materials.get('terracottaPlaster'), false);
    }
    return root;
  }
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material, cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
