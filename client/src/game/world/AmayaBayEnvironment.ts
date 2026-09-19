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
    lawn.position.set(185, y, 110);
    lawn.receiveShadow = true;
    root.add(lawn);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 0.65, 32), this.materials.get('stone'));
    basin.position.set(184, y + 0.35, 108);
    root.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.9, 0.08, 32), this.materials.get('water'));
    water.position.set(184, y + 0.7, 108);
    root.add(water);
    const fountainColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 2.1, 12), this.materials.get('stone'));
    fountainColumn.position.set(184, y + 1.45, 108);
    root.add(fountainColumn);

    const vegetation = new VegetationSystem(this.materials);
    for (let i = 0; i < 13; i += 1) {
      const a = i / 13 * Math.PI * 2;
      const tree = vegetation.createTree({ species: i % 4 === 0 ? 'gulmohar' : 'rain_tree', seed: 500 + i, scale: 0.95 });
      tree.position.set(185 + Math.cos(a) * 43, y, 110 + Math.sin(a) * 39);
      root.add(tree);
    }

    // Quiet seating ring and lighting around the fountain.
    for (let i = 0; i < 6; i += 1) {
      const a = i / 6 * Math.PI * 2;
      const bx = 184 + Math.cos(a) * 15;
      const bz = 108 + Math.sin(a) * 15;
      addBench(root, this.materials, bx, cityHeightAt(bx, bz), bz, -a + Math.PI / 2);
    }
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      const lx = 184 + Math.cos(a) * 27;
      const lz = 108 + Math.sin(a) * 27;
      addLamp(root, this.materials, lx, cityHeightAt(lx, lz), lz);
    }

    // Small open pavilion keeps the park useful in sun and rain.
    const pavilionX = 213;
    const pavilionZ = 92;
    const pavilionY = cityHeightAt(pavilionX, pavilionZ);
    addBox(root, [9.5, 0.18, 7.2], [pavilionX, pavilionY + 3.25, pavilionZ], this.materials.get('wood'));
    for (const px of [-4.0, 4.0]) {
      for (const pz of [-2.9, 2.9]) {
        addBox(root, [0.18, 3.2, 0.18], [pavilionX + px, pavilionY + 1.6, pavilionZ + pz], this.materials.get('metalDark'));
      }
    }
    addBox(root, [7.6, 0.18, 1.0], [pavilionX, pavilionY + 0.5, pavilionZ], this.materials.get('wood'));

    // Flower beds provide seasonal colour blocks without visual noise.
    for (const [fx, fz] of [[154, 95], [162, 139], [211, 137], [219, 112]] as const) {
      const fy = cityHeightAt(fx, fz);
      addBox(root, [5.2, 0.16, 2.1], [fx, fy + 0.08, fz], this.materials.get('soil'), false);
      for (let j = -2; j <= 2; j += 1) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), this.materials.get(j % 2 === 0 ? 'curtainWarm' : 'terracottaPlaster'));
        flower.position.set(fx + j * 0.72, fy + 0.34, fz);
        root.add(flower);
      }
    }

    const badminton = locationAnchor('park_badminton')!;
    const courtY = cityHeightAt(badminton.position.x, badminton.position.z);
    addBox(root, [13, 0.08, 6.1], [badminton.position.x, courtY + 0.04, badminton.position.z], this.materials.get('sagePlaster'), false);
    addBox(root, [0.05, 0.9, 6.1], [badminton.position.x, courtY + 0.48, badminton.position.z], this.materials.get('curtainWarm'), false);
    for (const sx of [-6.1, 6.1]) addBox(root, [0.08, 1.15, 0.08], [badminton.position.x + sx, courtY + 0.58, badminton.position.z], this.materials.get('metalDark'));

    const picnic = locationAnchor('park_picnic_lawn')!;
    for (const offset of [[-5, 3], [4, -4], [8, 5]] as const) {
      const matX = picnic.position.x + offset[0];
      const matZ = picnic.position.z + offset[1];
      addBox(root, [2.2, 0.1, 1.35], [matX, cityHeightAt(matX, matZ) + 0.08, matZ], this.materials.get('curtainWarm'), false);
    }
    return root;
  }
  private createBaySteps(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:bay-steps';

    const promenadeY = cityHeightAt(75, -270);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(620, 220), this.materials.get('water'));
    water.rotation.x = -Math.PI / 2;
    water.position.set(70, -0.05, -405);
    root.add(water);

    // A layered coast reads as promenade -> seawall -> sitting steps -> beach/water, not one flat slab.
    const beach = addBox(root, [255, 0.1, 23], [62, 0.015, -332], this.materials.get('soil'), false);
    beach.receiveShadow = true;
    addBox(root, [228, 0.55, 2.3], [72, promenadeY + 0.16, -283.8], this.materials.get('stone'), false);
    for (let i = 0; i < 7; i += 1) {
      const stepY = Math.max(0.08, promenadeY - 0.08 - i * 0.12);
      addBox(root, [214 - i * 1.5, 0.24, 4.3], [74, stepY, -289 - i * 4.0], this.materials.get('stone'), false);
    }

    const promenade = addBox(root, [224, 0.24, 24], [75, promenadeY + 0.12, -270], this.materials.get('concrete'), false);
    promenade.receiveShadow = true;
    addBox(root, [224, 0.08, 2.0], [75, promenadeY + 0.25, -258.8], this.materials.get('stone'), false);

    // Waterfront rail, lamps and benches establish a believable public-space rhythm.
    for (let x = -24; x <= 176; x += 16) {
      addBox(root, [0.1, 1.0, 0.1], [x, promenadeY + 0.76, -282.6], this.materials.get('metalDark'), false);
    }
    addBox(root, [202, 0.08, 0.08], [76, promenadeY + 1.18, -282.6], this.materials.get('metalDark'), false);
    for (let x = -10; x <= 160; x += 34) {
      addBox(root, [1.9, 0.14, 0.55], [x, promenadeY + 0.48, -265.0], this.materials.get('wood'));
      addBox(root, [1.9, 0.12, 0.48], [x, promenadeY + 0.84, -264.72], this.materials.get('wood'));
      for (const lx of [-0.72, 0.72]) {
        addBox(root, [0.1, 0.48, 0.1], [x + lx, promenadeY + 0.24, -265.0], this.materials.get('metalDark'));
      }
    }
    for (let x = -20; x <= 170; x += 38) {
      addBox(root, [0.12, 3.7, 0.12], [x, promenadeY + 1.86, -260.5], this.materials.get('metalDark'));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), this.materials.get('curtainWarm'));
      lamp.position.set(x, promenadeY + 3.72, -260.5);
      root.add(lamp);
    }

    // Pier and sunset lookout.
    const pier = addBox(root, [5.2, 0.35, 58], [118, 0.25, -338], this.materials.get('wood'));
    pier.receiveShadow = true;
    for (let i = 0; i < 10; i += 1) {
      const z = -313 - i * 6;
      addBox(root, [0.12, 1.65, 0.12], [115.7, 0.84, z], this.materials.get('metalDark'));
      addBox(root, [0.12, 1.65, 0.12], [120.3, 0.84, z], this.materials.get('metalDark'));
    }
    addBox(root, [12, 0.28, 8], [118, 0.28, -369], this.materials.get('wood'));
    addBox(root, [9, 0.12, 0.5], [118, 0.72, -372.7], this.materials.get('metalDark'));

    const cycle = locationAnchor('bay_cycle_hut')!;
    const cycleY = cityHeightAt(cycle.position.x, cycle.position.z);
    addBox(root, [10, 3.8, 5.8], [cycle.position.x, cycleY + 1.9, cycle.position.z], this.materials.get('sagePlaster'));
    addBox(root, [11.2, 0.22, 7], [cycle.position.x, cycleY + 3.94, cycle.position.z], this.materials.get('wood'));
    addBox(root, [5.8, 2.0, 0.1], [cycle.position.x - 1.4, cycleY + 1.25, cycle.position.z - 2.95], this.materials.get('glass'), false);
    addBox(root, [1.3, 2.25, 0.12], [cycle.position.x + 3.3, cycleY + 1.18, cycle.position.z - 2.96], this.materials.get('wood'));

    const kayak = locationAnchor('bay_kayak_hut')!;
    const kayakY = cityHeightAt(kayak.position.x, kayak.position.z);
    addBox(root, [9, 3.4, 5.8], [kayak.position.x, kayakY + 1.7, kayak.position.z], this.materials.get('warmPlaster'));
    addBox(root, [10.2, 0.2, 7], [kayak.position.x, kayakY + 3.52, kayak.position.z], this.materials.get('terracottaPlaster'));
    addBox(root, [5.1, 1.85, 0.1], [kayak.position.x - 1.2, kayakY + 1.22, kayak.position.z - 2.95], this.materials.get('glass'), false);
    addBox(root, [1.25, 2.1, 0.12], [kayak.position.x + 3.1, kayakY + 1.08, kayak.position.z - 2.96], this.materials.get('wood'));

    // Rental racks/boats communicate activities before the player interacts with them.
    for (let i = 0; i < 4; i += 1) {
      const boat = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 2.35, 4, 8), this.materials.get(i % 2 === 0 ? 'terracottaPlaster' : 'sagePlaster'));
      boat.rotation.z = Math.PI / 2;
      boat.position.set(kayak.position.x - 5.2 + i * 3.5, Math.max(0.42, kayakY + 0.34), kayak.position.z - 4.6);
      root.add(boat);
    }
    for (let i = 0; i < 5; i += 1) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 5, 14), this.materials.get('metalDark'));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(cycle.position.x - 4.2 + i * 2.0, cycleY + 0.34, cycle.position.z - 4.1);
      root.add(wheel);
    }

    // Small food cart keeps the waterfront socially legible without turning it into a busy fairground.
    const cartX = 18;
    addBox(root, [2.8, 1.1, 1.5], [cartX, promenadeY + 0.58, -262.5], this.materials.get('wood'));
    addBox(root, [3.4, 0.14, 2.1], [cartX, promenadeY + 2.05, -262.5], this.materials.get('terracottaPlaster'));
    for (const cx of [-1.15, 1.15]) {
      addBox(root, [0.08, 1.48, 0.08], [cartX + cx, promenadeY + 1.3, -262.5], this.materials.get('metalDark'));
    }

    return root;
  }
  private createRainTreeLane(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:rain-tree-lane';
    const vegetation = new VegetationSystem(this.materials);
    const y = cityHeightAt(-210, -95);

    for (let i = 0; i < 14; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const tree = vegetation.createTree({ species: 'rain_tree', seed: 700 + i, scale: 1.05 });
      tree.position.set(-210 + side * (11 + (i % 3) * 2), y, -155 + i * 9.2);
      root.add(tree);
    }

    // Older lived-in home with shaded veranda, windows and laundry.
    const homeX = -246;
    const homeZ = -88;
    addBox(root, [18, 5.5, 22], [homeX, y + 2.75, homeZ], this.materials.get('sagePlaster'));
    addBox(root, [19.2, 0.3, 23.2], [homeX, y + 5.65, homeZ], this.materials.get('wood'));
    addBox(root, [19, 0.35, 22.8], [homeX, y + 0.18, homeZ], this.materials.get('stone'));
    addBox(root, [10, 0.2, 5], [-236.5, y + 2.5, homeZ], this.materials.get('warmPlaster'));
    for (const zOffset of [-6.2, 0, 6.2]) {
      addBox(root, [0.12, 1.35, 2.25], [-236.9, y + 3.65, homeZ + zOffset], this.materials.get('glass'), false);
      addBox(root, [0.45, 0.12, 2.7], [-237.08, y + 2.92, homeZ + zOffset], this.materials.get('concrete'), false);
    }
    addBox(root, [0.14, 2.35, 1.35], [-236.92, y + 1.22, homeZ + 7.8], this.materials.get('wood'));
    addBox(root, [0.1, 0.1, 12], [-235.9, y + 4.85, homeZ], this.materials.get('metalDark'), false);
    for (let i = 0; i < 6; i += 1) {
      const cloth = addBox(root, [0.08, 0.8 + (i % 2) * 0.22, 1.35], [-235.75, y + 4.2, homeZ - 5 + i * 2], this.materials.get(i % 3 === 0 ? 'terracottaPlaster' : i % 3 === 1 ? 'curtainWarm' : 'sagePlaster'), false);
      cloth.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.04;
    }

    // Hidden bench and tiny food stall sell the quiet lived-in character.
    addBench(root, this.materials, -202, cityHeightAt(-202, -116), -116, Math.PI);
    const stallY = cityHeightAt(-188, -82);
    addBox(root, [3.2, 1.2, 1.8], [-188, stallY + 0.6, -82], this.materials.get('wood'));
    addBox(root, [3.8, 0.16, 2.5], [-188, stallY + 2.28, -82], this.materials.get('terracottaPlaster'));
    for (const sx of [-1.35, 1.35]) addBox(root, [0.08, 1.7, 0.08], [-188 + sx, stallY + 1.42, -82], this.materials.get('metalDark'));

    const nursery = locationAnchor('rain_tree_nursery')!;
    const ny = cityHeightAt(nursery.position.x, nursery.position.z);
    addBox(root, [15, 0.14, 10], [nursery.position.x, ny + 0.07, nursery.position.z], this.materials.get('soil'), false);
    addBox(root, [16.2, 0.14, 2.4], [nursery.position.x, ny + 2.65, nursery.position.z + 4.1], this.materials.get('sagePlaster'), false);
    for (let i = 0; i < 9; i += 1) {
      const xx = nursery.position.x - 5 + (i % 3) * 5;
      const zz = nursery.position.z - 3 + Math.floor(i / 3) * 3;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.5, 9), this.materials.get('terracottaPlaster'));
      pot.position.set(xx, ny + 0.25, zz);
      root.add(pot);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), this.materials.get(i % 2 ? 'foliageMid' : 'foliageDeep'));
      crown.scale.set(0.8, 1.15, 0.8);
      crown.position.set(xx, ny + 0.95, zz);
      root.add(crown);
    }
    return root;
  }
  private createCommon(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:the-common';
    const y = cityHeightAt(215, -80);

    addBox(root, [38, 8, 25], [215, y + 4, -80], this.materials.get('warmPlaster'));
    addBox(root, [40, 0.34, 27], [215, y + 8.17, -80], this.materials.get('stone'));
    addBox(root, [40, 0.42, 27], [215, y + 0.21, -80], this.materials.get('stone'));
    addBox(root, [19, 1.2, 5], [215, y + 7.5, -93], this.materials.get('wood'));
    for (const x of [202, 210, 220, 228]) addBox(root, [4.2, 2.3, 0.18], [x, y + 3.3, -92.6], this.materials.get('glass'), false);
    addBox(root, [2.2, 2.6, 0.18], [215, y + 1.42, -92.72], this.materials.get('wood'));

    const courtyard = addBox(root, [62, 0.16, 50], [215, y + 0.08, -45], this.materials.get('stone'), false);
    courtyard.receiveShadow = true;

    // Colonnade, event notice board and municipal-garden edges turn the slab into a civic place.
    for (let x = 188; x <= 242; x += 9) {
      addBox(root, [0.22, 3.2, 0.22], [x, y + 1.6, -60], this.materials.get('concrete'));
    }
    addBox(root, [58, 0.18, 3.2], [215, y + 3.22, -60], this.materials.get('wood'));
    addBox(root, [4.8, 2.8, 0.22], [190, y + 1.5, -39], this.materials.get('wood'));
    addBox(root, [4.1, 2.15, 0.12], [190, y + 1.5, -38.85], this.materials.get('curtainWarm'), false);

    for (const [gx, gz] of [[197, -33], [213, -31], [230, -34]] as const) {
      addBox(root, [10, 0.16, 3.1], [gx, y + 0.12, gz], this.materials.get('soil'), false);
      for (let i = -3; i <= 3; i += 1) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), this.materials.get(i % 2 ? 'foliageDeep' : 'foliageMid'));
        shrub.scale.set(1.1, 0.8, 0.9);
        shrub.position.set(gx + i * 1.15, y + 0.42, gz);
        root.add(shrub);
      }
    }
    addBench(root, this.materials, 203, y, -48, 0);
    addBench(root, this.materials, 227, y, -48, 0);
    addLamp(root, this.materials, 193, y, -52);
    addLamp(root, this.materials, 237, y, -52);
    return root;
  }
  private createHillGarden(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:hill-garden';
    const y = cityHeightAt(265, 275);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(20, 23, 1, 32), this.materials.get('stone'));
    platform.position.set(265, y + 0.5, 275);
    root.add(platform);

    // Tea hut with shaded deck and readable windows.
    addBox(root, [12, 4.2, 9], [283, y + 2.1, 272], this.materials.get('warmPlaster'));
    addBox(root, [14, 0.3, 11], [283, y + 4.25, 272], this.materials.get('wood'));
    addBox(root, [6.0, 2.1, 0.12], [283, y + 1.35, 267.45], this.materials.get('glass'), false);
    addBox(root, [1.3, 2.2, 0.14], [287.5, y + 1.15, 267.42], this.materials.get('wood'));
    addBox(root, [10.5, 0.16, 3.5], [283, y + 0.18, 265.5], this.materials.get('wood'), false);
    addBench(root, this.materials, 279, y, 264.5, 0);
    addBench(root, this.materials, 286, y, 264.5, 0);

    // Lookout rail with continuous top edge.
    const railRadius = 16;
    const railPoints: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 1.45 + 0.15;
      const x = 265 + Math.cos(a) * railRadius;
      const z = 275 + Math.sin(a) * railRadius;
      railPoints.push({ x, z });
      addBox(root, [0.12, 1.2, 0.12], [x, y + 1.1, z], this.materials.get('metalDark'));
    }
    for (let i = 1; i < railPoints.length; i += 1) {
      const a = railPoints[i - 1]!;
      const b = railPoints[i]!;
      addBeam(root, this.materials, a.x, y + 1.62, a.z, b.x, y + 1.62, b.z, 0.09);
    }

    // Terraced garden beds make the climb feel authored.
    for (const [tx, tz, rot] of [[238, 286, 0.18], [247, 303, -0.12], [275, 311, 0.08]] as const) {
      const ty = cityHeightAt(tx, tz);
      const bed = addBox(root, [13, 0.18, 3.5], [tx, ty + 0.09, tz], this.materials.get('soil'), false);
      bed.rotation.y = rot;
      for (let i = -4; i <= 4; i += 1) {
        const plant = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 5), this.materials.get(i % 2 ? 'foliageLight' : 'foliageDeep'));
        plant.position.set(tx + i * 1.22, ty + 0.42, tz);
        root.add(plant);
      }
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

function addBench(
  group: THREE.Group,
  materials: MaterialLibrary,
  x: number,
  y: number,
  z: number,
  rotation = 0,
): void {
  const bench = new THREE.Group();
  addBox(bench, [2.0, 0.14, 0.55], [0, 0.52, 0], materials.get('wood'));
  addBox(bench, [2.0, 0.14, 0.5], [0, 0.9, 0.38], materials.get('wood'));
  for (const bx of [-0.74, 0.74]) addBox(bench, [0.1, 0.5, 0.1], [bx, 0.25, 0], materials.get('metalDark'));
  bench.position.set(x, y, z);
  bench.rotation.y = rotation;
  group.add(bench);
}

function addLamp(group: THREE.Group, materials: MaterialLibrary, x: number, y: number, z: number): void {
  addBox(group, [0.12, 3.5, 0.12], [x, y + 1.75, z], materials.get('metalDark'));
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), materials.get('curtainWarm'));
  shade.position.set(x, y + 3.5, z);
  group.add(shade);
}

function addBeam(
  group: THREE.Group,
  materials: MaterialLibrary,
  startX: number,
  startY: number,
  startZ: number,
  endX: number,
  endY: number,
  endZ: number,
  thickness: number,
): void {
  const start = new THREE.Vector3(startX, startY, startZ);
  const end = new THREE.Vector3(endX, endY, endZ);
  const direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 1e-6) return;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(thickness / 2, thickness / 2, length, 6), materials.get('metalDark'));
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(beam);
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material, cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
