import * as THREE from 'three';
import { dressSimpleFacades } from './FacadeDetails';
import { addDistrictDetails } from './DistrictDetails';
import { createDistrictVignettes } from './DistrictVignettes';
import { cityHeightAt, locationAnchor } from '@together/shared';
import { compileStaticMeshesByMaterial } from '../assets/runtime/StaticBatchCompiler';
import type { MaterialLibrary } from './MaterialLibrary';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { VegetationSystem } from './VegetationSystem';

export class AmayaBayEnvironment {
  readonly root = new THREE.Group();

  constructor(private readonly materials: MaterialLibrary, private readonly physics?: PhysicsWorld) {
    this.root.name = 'amaya-bay-authored-environment';
    this.root.add(compileStaticMeshesByMaterial(this.createMograCourt()));
    this.root.add(compileStaticMeshesByMaterial(this.createMograPark()));
    this.root.add(compileStaticMeshesByMaterial(this.createBaySteps()));
    this.root.add(compileStaticMeshesByMaterial(this.createRainTreeLane()));
    this.root.add(compileStaticMeshesByMaterial(this.createCommon()));
    this.root.add(compileStaticMeshesByMaterial(this.createHillGarden()));
    this.root.add(compileStaticMeshesByMaterial(createDistrictVignettes(materials, physics)));
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
      const facade = new THREE.Group();
      facade.position.set(x, y, z);
      dressSimpleFacades(facade, this.materials, 18, 22, height);
      building.add(facade);
      // Corner pilasters and roof cornices give the court a clear vertical rhythm.
      for (const side of [-1, 1]) {
        addBox(building, [0.34, height, 0.3], [x + side * 8.85, y + height / 2, z - 11.12], this.materials.get('sandstone'));
      }
      addBox(building, [18.6, 0.22, 22.6], [x, y + height - 0.3, z], this.materials.get('sandstone'));
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.65, 10), this.materials.get('metalDark'));
      tank.position.set(x - 5, y + height + 1.2, z + 5); tank.castShadow = true; building.add(tank);
      // A recessed entry and shallow rain canopy identify each apartment home.
      addBox(building, [2.1, 2.2, 0.16], [x, y + 1.16, z - 11.18], this.materials.get('wood'));
      addBox(building, [2.9, 0.16, 1.05], [x, y + 2.44, z - 11.65], this.materials.get('terracottaPlaster'));
      addBox(building, [3.0, 0.18, 0.8], [x, y + 0.1, z - 11.42], this.materials.get('stone'));
      for (const side of [-1, 1]) {
        addBox(building, [0.18, 0.42, 0.18], [x + side * 2.4, y + 0.28, z - 11.75], this.materials.get('terracottaPlaster'));
        addBox(building, [0.6, 0.24, 0.6], [x + side * 2.4, y + 0.59, z - 11.75], this.materials.get('foliageMid'), false);
      }
      root.add(building);
    }

    // Planted islands, seating and pavement play marks establish a lived court.
    const shrubs = new VegetationSystem(this.materials);
    for (const [index, point] of [{ x: -240, z: 115 }, { x: -215, z: 116 }, { x: -182, z: 125 }].entries()) {
      const tree = shrubs.createTree({ species: index === 1 ? 'gulmohar' : 'rain_tree', seed: 410 + index, scale: 0.94 });
      tree.position.set(point.x, cityHeightAt(point.x, point.z), point.z);
      root.add(tree);
    }
    for (const bed of [{ x: -216, z: 110, width: 10 }, { x: -178, z: 107, width: 8 }]) {
      const ground = cityHeightAt(bed.x, bed.z);
      addBox(root, [bed.width, 0.34, 2.8], [bed.x, ground + 0.17, bed.z], this.materials.get('stone'));
      addBox(root, [bed.width - 0.5, 0.1, 2.35], [bed.x, ground + 0.39, bed.z], this.materials.get('soil'), false);
      this.physics?.createFixedCuboid({ x: bed.x, y: ground + 0.17, z: bed.z }, { x: bed.width / 2, y: 0.17, z: 1.4 });
      for (let stem = 0; stem < 4; stem += 1) {
        const bush = shrubs.createShrub(Math.round(-bed.x * 10 + stem), 0.72 + stem % 2 * 0.12);
        bush.position.set(bed.x - bed.width / 2 + 1.3 + stem * (bed.width - 2.6) / 3, ground + 0.4, bed.z);
        root.add(bush);
      }
      addBox(root, [2.2, 0.15, 0.58], [bed.x, ground + 0.52, bed.z + 2.4], this.materials.get('wood'));
      for (const side of [-0.85, 0.85]) addBox(root, [0.12, 0.52, 0.12], [bed.x + side, ground + 0.26, bed.z + 2.4], this.materials.get('metalDark'));
    }
    for (let tile = 0; tile < 5; tile += 1) {
      const x = -201 + tile * 1.05, z = 114 - tile * 1.05;
      addBox(root, [0.82, 0.015, 0.82], [x, cityHeightAt(x, z) + 0.02, z], this.materials.get(tile % 2 ? 'terracottaPlaster' : 'sagePlaster'), false);
    }
    return root;
  }

  private createMograPark(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'landmark:mogra-park';
    addDistrictDetails(root, 'park', this.materials);
    const y = cityHeightAt(185, 110);
    const lawnGeometry = new THREE.CircleGeometry(58, 64);
    lawnGeometry.rotateX(-Math.PI / 2);
    const lawnVertices = lawnGeometry.getAttribute('position');
    for (let index = 0; index < lawnVertices.count; index += 1) {
      lawnVertices.setY(index, cityHeightAt(185 + lawnVertices.getX(index), 110 + lawnVertices.getZ(index)) + 0.025);
    }
    lawnVertices.needsUpdate = true;
    lawnGeometry.computeVertexNormals();
    const lawn = new THREE.Mesh(lawnGeometry, this.materials.get('foliageMid'));
    lawn.position.set(185, 0, 110); lawn.receiveShadow = true; root.add(lawn);
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
      tree.position.set(185 + Math.cos(a) * 43, cityHeightAt(185 + Math.cos(a) * 43, 110 + Math.sin(a) * 39), 110 + Math.sin(a) * 39);
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
    const courtGeometry = new THREE.PlaneGeometry(13, 6.1, 12, 6);
    courtGeometry.rotateX(-Math.PI / 2);
    const courtVertices = courtGeometry.getAttribute('position');
    for (let vertex = 0; vertex < courtVertices.count; vertex += 1) {
      courtVertices.setY(vertex, cityHeightAt(badminton.position.x + courtVertices.getX(vertex), badminton.position.z + courtVertices.getZ(vertex)) + 0.05);
    }
    courtVertices.needsUpdate = true;
    courtGeometry.computeVertexNormals();
    const court = new THREE.Mesh(courtGeometry, this.materials.get('sagePlaster'));
    court.position.set(badminton.position.x, 0, badminton.position.z);
    court.receiveShadow = true;
    root.add(court);
    addBox(root, [0.05, 0.9, 6.1], [badminton.position.x, courtY + 0.48, badminton.position.z], this.materials.get('curtainWarm'), false);
    for (const sz of [-3, 3]) addBox(root, [0.08, 1.15, 0.08], [badminton.position.x, cityHeightAt(badminton.position.x, badminton.position.z + sz) + 0.58, badminton.position.z + sz], this.materials.get('metalDark'));
    const picnic = locationAnchor('park_picnic_lawn')!;
    for (const offset of [[-5, 3], [4, -4], [8, 5]] as const) {
      const matX = picnic.position.x + offset[0];
      const matZ = picnic.position.z + offset[1];
      addBox(root, [2.2, 0.1, 1.35], [matX, cityHeightAt(matX, matZ) + 0.08, matZ], this.materials.get('curtainWarm'), false);
    }
    return root;
  }
  private createBaySteps(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:bay-steps';
    const vegetation = new VegetationSystem(this.materials);
    // Repeated coastal furniture sets a readable promenade rhythm.
    for (let i = 0; i < 14; i += 1) {
      const x = -25 + i * 15;
      // Keep the primary street's arrival and the view toward the water open.
      if (x >= 55 && x <= 110) continue;
      addBox(root, [3.3, 0.55, 2.0], [x, 0.55, -263], this.materials.get('stone'));
      const tree = vegetation.createTree({ species: i % 3 === 0 ? 'palm' : 'rain_tree', seed: 810+i, scale: 0.9 });
      tree.position.set(x, 0.83, -263); root.add(tree);
      addBox(root, [2.5, 0.13, 0.52], [x+4.5, 0.75, -278], this.materials.get('wood'));
      addBox(root, [2.5, 0.58, 0.1], [x+4.5, 1.04, -277.7], this.materials.get('wood'));
      for(const side of [-1,1]) addBox(root, [0.13, 0.52, 0.42], [x+4.5+side*0.93, 0.47, -278], this.materials.get('metalDark'));
      addBox(root, [0.12, 4.2, 0.12], [x, 2.3, -281], this.materials.get('metalDark'));
      addBox(root, [0.42, 0.5, 0.42], [x, 4.45, -281], this.materials.get('curtainWarm'));
    }
    for(let i=0;i<44;i+=1){
      const x=-32+i*5;
      if (x >= 53 && x <= 78) continue;
      addBox(root,[0.12,0.95,0.12],[x,0.83,-283],this.materials.get('metalDark'));
      addBox(root,[5,0.075,0.075],[x+2.5,1.25,-283],this.materials.get('wood'));
    }
    // A level landing bridges the promenade to the first descending tread.
    addBox(root, [75, 0.24, 7.8], [67.5, 0.21, -284.9], this.materials.get('sandstone'), false);
    this.physics?.createFixedCuboid({ x: 67.5, y: 0.21, z: -284.9 }, { x: 37.5, y: 0.12, z: 3.9 });
    for (let i = 0; i < 5; i += 1) {
      const top = 0.33 - i * 0.15;
      const center = { x: 67.5, y: top - 0.14, z: -291 - i * 4.5 };
      addBox(root, [75, 0.28, 4.6], [center.x, center.y, center.z], this.materials.get('sandstone'), false);
      addBox(root, [75, 0.15, 0.09], [center.x, top - 0.075, center.z + 2.27], this.materials.get('stone'), false);
      addBox(root, [75, 0.04, 0.28], [center.x, top + 0.025, center.z + 2.14], this.materials.get('curtainWarm'), false);
      for (const sideX of [52, 83]) {
        addBox(root, [0.1, 0.9, 0.1], [sideX, top + 0.45, center.z], this.materials.get('metalDark'));
      }
      this.physics?.createFixedCuboid(center, { x: 37.5, y: 0.14, z: 2.3 });
    }
    for (const sideX of [52, 83]) {
      const rail = addBox(root, [0.11, 0.11, 22.5], [sideX, 0.92, -300], this.materials.get('wood'));
      rail.rotation.x = -0.02;
    }
    // Readable waterfront activity at the end of the public stair sightline.
    for (const [boatX, boatZ, accent] of [
      [43, -326, 'terracottaPlaster'],
      [88, -331, 'sagePlaster'],
    ] as const) {
      const skiff = new THREE.Group();
      skiff.name = 'waterfront:moored-skiff';
      skiff.position.set(boatX, 0.02, boatZ);
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), this.materials.get(accent));
      hull.scale.set(0.98, 0.32, 3.15);
      hull.position.y = 0.08;
      skiff.add(hull);
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), this.materials.get('wood'));
      cockpit.scale.set(0.7, 0.055, 2.1);
      cockpit.position.y = 0.36;
      skiff.add(cockpit);
      for (const seatZ of [-0.8, 0.9]) addBox(skiff, [1.35, 0.11, 0.35], [0, 0.42, seatZ], this.materials.get('warmPlaster'), false);
      const paddle = addBox(skiff, [2.2, 0.055, 0.08], [0.4, 0.47, 0.18], this.materials.get('wood'), false);
      paddle.rotation.y = -0.28;
      root.add(skiff);
    }
    for (const sideX of [52, 83]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.075, 8, 16), this.materials.get('terracottaPlaster'));
      ring.name = 'waterfront:life-ring';
      ring.position.set(sideX, 1.0, -301.8);
      root.add(ring);
    }
    const promenade = addBox(root, [220, 0.24, 22], [75, 0.22, -270], this.materials.get('concrete'), false); promenade.receiveShadow = true;
    this.physics?.createFixedCuboid({ x: 75, y: 0.22, z: -270 }, { x: 110, y: 0.12, z: 11 });
    this.physics?.createFixedCuboid({ x: 10.5, y: 0.8, z: -283 }, { x: 42.5, y: 0.5, z: 0.12 });
    this.physics?.createFixedCuboid({ x: 135.5, y: 0.8, z: -283 }, { x: 52.5, y: 0.5, z: 0.12 });
    const pier = addBox(root, [4, 0.35, 54], [118, 0.25, -336], this.materials.get('wood')); pier.receiveShadow = true;
    for (let i = 0; i < 9; i += 1) {
      addBox(root, [0.12, 2, 0.12], [118 - 1.65, 0.9, -314 - i * 6], this.materials.get('metalDark'));
      addBox(root, [0.12, 2, 0.12], [118 + 1.65, 0.9, -314 - i * 6], this.materials.get('metalDark'));
    }

    const cycle = locationAnchor('bay_cycle_hut')!;
    addBox(root, [9, 3.6, 5], [cycle.position.x, 2.0, cycle.position.z], this.materials.get('sagePlaster'));
    addBox(root, [10, 0.18, 6], [cycle.position.x, 3.9, cycle.position.z], this.materials.get('wood'));
    this.physics?.createFixedCuboid({ x: cycle.position.x, y: 2.0, z: cycle.position.z }, { x: 4.5, y: 1.8, z: 2.5 });
    const kayak = locationAnchor('bay_kayak_hut')!;
    addBox(root, [8, 3.2, 5], [kayak.position.x, 1.7, kayak.position.z], this.materials.get('warmPlaster'));
    addBox(root, [9, 0.15, 6], [kayak.position.x, 3.35, kayak.position.z], this.materials.get('terracottaPlaster'));
    this.physics?.createFixedCuboid({ x: kayak.position.x, y: 1.7, z: kayak.position.z }, { x: 4, y: 1.6, z: 2.5 });
    // Waterfront kiosks face the promenade with sheltered, legible fronts.
    for (const hut of [
      { x: cycle.position.x, z: cycle.position.z, width: 9, height: 3.6, label: 'CYCLE HUT', accent: 'sagePlaster' as const },
      { x: kayak.position.x, z: kayak.position.z, width: 8, height: 3.2, label: 'KAYAK LAUNCH', accent: 'terracottaPlaster' as const },
    ]) {
      const front = hut.z - 2.56;
      addBox(root, [hut.width + 0.45, 0.22, 5.6], [hut.x, 0.16, hut.z], this.materials.get('stone'));
      // A dark inset shop bay, counter and display props read as a working rental kiosk.
      addBox(root, [hut.width * 0.64, 2.05, 0.1], [hut.x, 1.35, front], this.materials.get('metalDark'), false);
      addBox(root, [hut.width * 0.64, 0.22, 0.68], [hut.x, 1.0, front - 0.32], this.materials.get('wood'));
      addBox(root, [hut.width * 0.64, 0.66, 0.12], [hut.x, 0.58, front - 0.62], this.materials.get(hut.accent), false);
      for (const edge of [-1, 1]) {
        addBox(root, [0.18, 2.45, 0.17], [hut.x + edge * hut.width * 0.34, 1.38, front - 0.08], this.materials.get('wood'));
        addBox(root, [0.3, 0.6, 0.6], [hut.x + edge * (hut.width * 0.48), 0.72, front - 0.38], this.materials.get('stone'));
      }
      addBox(root, [hut.width * 0.75, 0.17, 0.2], [hut.x, 2.55, front - 0.1], this.materials.get('wood'));
      addBox(root, [hut.width * 0.9, 0.12, 1.5], [hut.x, 2.94, front - 0.78], this.materials.get(hut.accent));
      // Put the sign on the outer fascia so the canopy does not hide it at eye height.
      addBox(root, [hut.width * 0.78, 0.62, 0.13], [hut.x, 2.94, front - 1.57], this.materials.get('wood'));
      const label = this.materials.createSign(hut.label, hut.width * 0.72, 0.53);
      label.position.set(hut.x, 2.94, front - 1.66);
      label.rotation.y = Math.PI;
      root.add(label);
      addBox(root, [hut.width * 0.62, 0.1, 0.58], [hut.x, 0.24, front - 0.4], this.materials.get('stone'), false);
      if (hut.label === 'CYCLE HUT') {
        for (const offsetX of [-1.65, 1.65]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.075, 8, 18), this.materials.get('sandstone'));
          wheel.position.set(hut.x + offsetX, 1.76, front - 0.18); root.add(wheel);
          addBox(root, [1.1, 0.07, 0.07], [hut.x + offsetX, 1.72, front - 0.25], this.materials.get('wood'), false);
        }
      } else {
        for (const offsetX of [-2.1, 2.1]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.09, 8, 16), this.materials.get('terracottaPlaster'));
          ring.position.set(hut.x + offsetX, 1.76, front - 0.18); root.add(ring);
          const paddle = addBox(root, [0.07, 1.54, 0.07], [hut.x + offsetX * 0.64, 1.73, front - 0.24], this.materials.get('wood'), false);
          paddle.rotation.z = offsetX < 0 ? -0.14 : 0.14;
        }
      }
    }
    // A parked scooter advertises the rental while leaving the counter approach open.
    const scooterX = cycle.position.x + 2.6;
    const scooterZ = cycle.position.z - 5.0;
    for (const wheelZ of [-0.88, 0.88]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.17, 14), this.materials.get('metalDark'));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(scooterX, 0.43, scooterZ + wheelZ);
      root.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.19, 12), this.materials.get('stone'));
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      root.add(hub);
    }
    addBox(root, [0.8, 0.18, 2.1], [scooterX, 0.9, scooterZ], this.materials.get('terracottaPlaster'));
    addBox(root, [0.82, 0.5, 0.72], [scooterX, 1.2, scooterZ + 0.45], this.materials.get('wood'));
    const handle = addBox(root, [0.1, 1.25, 0.1], [scooterX, 1.65, scooterZ - 0.82], this.materials.get('metalDark'));
    handle.rotation.x = -0.18;
    addBox(root, [1.0, 0.1, 0.12], [scooterX, 2.25, scooterZ - 0.96], this.materials.get('metalDark'));
    addBox(root, [0.45, 0.23, 0.09], [scooterX, 1.48, scooterZ - 1.04], this.materials.get('curtainWarm'), false);
    this.physics?.createFixedCuboid({ x: scooterX, y: 1.0, z: scooterZ }, { x: 0.55, y: 1.0, z: 1.3 });

    // One colourful hull remains in the player's left peripheral view at the kayak counter.
    const showcase = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), this.materials.get('terracottaPlaster'));
    showcase.scale.set(0.63, 0.2, 2.45);
    showcase.position.set(kayak.position.x + 3.0, 0.55, kayak.position.z - 4.0);
    root.add(showcase);
    for (const supportZ of [-1.25, 1.25]) {
      addBox(root, [1.45, 0.23, 0.18], [kayak.position.x + 3.0, 0.31, kayak.position.z - 4.0 + supportZ], this.materials.get('wood'));
    }
    addBox(root, [0.92, 0.06, 1.4], [kayak.position.x + 3.0, 0.74, kayak.position.z - 4.0], this.materials.get('wood'), false);
    this.physics?.createFixedCuboid({ x: kayak.position.x + 3.0, y: 0.5, z: kayak.position.z - 4.0 }, { x: 0.7, y: 0.5, z: 2.5 });
    // Keep the rental display beside the entrance so the launch prompt and glazed front stay legible.
    const rackX = kayak.position.x + 9;
    const rackZ = kayak.position.z - 4.5;
    for (const supportZ of [-1.35, 1.35]) {
      addBox(root, [3.9, 0.12, 0.15], [rackX, 0.49, rackZ + supportZ], this.materials.get('wood'));
    }
    for (let i = 0; i < 3; i += 1) {
      const boat = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), this.materials.get(i === 1 ? 'terracottaPlaster' : 'sagePlaster'));
      boat.scale.set(0.43, 0.2, 1.7);
      boat.position.set(rackX - 1.15 + i * 1.15, 0.66, rackZ);
      root.add(boat);
    }
    this.physics?.createFixedCuboid({ x: rackX, y: 0.52, z: rackZ }, { x: 2, y: 0.5, z: 1.8 });
    return root;
  }
  private createRainTreeLane(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:rain-tree-lane'; addDistrictDetails(root, 'rain', this.materials);
    const vegetation = new VegetationSystem(this.materials);
    for (let i = 0; i < 14; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const tree = vegetation.createTree({ species: 'rain_tree', seed: 700 + i, scale: 1.05 });
      const tx = -210 + side * (11 + (i % 3) * 2);
      const tz = -155 + i * 9.2;
      tree.position.set(tx, cityHeightAt(tx, tz), tz);
      root.add(tree);
    }
    const nursery = locationAnchor('rain_tree_nursery')!;
    const soilGeometry = new THREE.PlaneGeometry(15, 10, 10, 8);
    soilGeometry.rotateX(-Math.PI / 2);
    const soilVertices = soilGeometry.getAttribute('position');
    for (let vertex = 0; vertex < soilVertices.count; vertex += 1) {
      soilVertices.setY(vertex, cityHeightAt(nursery.position.x + soilVertices.getX(vertex), nursery.position.z + soilVertices.getZ(vertex)) + 0.035);
    }
    soilVertices.needsUpdate = true;
    soilGeometry.computeVertexNormals();
    const soil = new THREE.Mesh(soilGeometry, this.materials.get('soil'));
    soil.position.set(nursery.position.x, 0, nursery.position.z);
    soil.receiveShadow = true;
    root.add(soil);
    for (let i = 0; i < 9; i += 1) {
      const xx = nursery.position.x - 5 + (i % 3) * 5;
      const zz = nursery.position.z - 3 + Math.floor(i / 3) * 3;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.5, 9), this.materials.get('terracottaPlaster'));
      const py = cityHeightAt(xx, zz);
      pot.position.set(xx, py + 0.25, zz); root.add(pot);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), this.materials.get(i % 2 ? 'foliageMid' : 'foliageDeep'));
      crown.scale.set(0.8, 1.15, 0.8); crown.position.set(xx, py + 0.95, zz); root.add(crown);
    }
    return root;
  }
  private createCommon(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:the-common'; addDistrictDetails(root, 'common', this.materials); const y = cityHeightAt(215, -80);
    addBox(root, [38, 8, 25], [215, y + 4, -80], this.materials.get('warmPlaster'));
    addBox(root, [40, 0.34, 27], [215, y + 8.17, -80], this.materials.get('stone'));
    addBox(root, [40, 0.42, 27], [215, y + 0.21, -80], this.materials.get('stone'));
    addBox(root, [19, 1.2, 5], [215, y + 7.5, -93], this.materials.get('wood'));
    for (const x of [202, 210, 220, 228]) addBox(root, [4.2, 2.3, 0.18], [x, y + 3.3, -92.6], this.materials.get('windowGlaze'), false);
    // The square-facing side is the public library front, not a blank service wall.
    const libraryFront = -67.35;
    for (const windowX of [202, 210, 220, 228]) {
      // Shelves and books turn the square-facing glazing into a readable library display.
      addBox(root, [4.25, 2.5, 0.035], [windowX, y + 3.35, libraryFront - 0.075], this.materials.get('metalDark'), false);
      for (const shelfY of [2.63, 3.35, 4.07]) {
        addBox(root, [4.12, 0.08, 0.1], [windowX, y + shelfY, libraryFront - 0.025], this.materials.get('wood'), false);
        for (let volume = 0; volume < 8; volume += 1) {
          addBox(root, [0.3 + volume % 3 * 0.045, 0.48 + volume % 2 * 0.08, 0.055], [windowX - 1.65 + volume * 0.46, y + shelfY + 0.28, libraryFront + 0.045], this.materials.get(volume % 3 === 0 ? 'terracottaPlaster' : volume % 3 === 1 ? 'sagePlaster' : 'warmPlaster'), false);
        }
      }
      addBox(root, [4.3, 2.55, 0.12], [windowX, y + 3.35, libraryFront], this.materials.get('windowGlaze'), false);
      addBox(root, [4.65, 0.17, 0.38], [windowX, y + 2.02, libraryFront + 0.13], this.materials.get('stone'), false);
      addBox(root, [4.65, 0.16, 0.24], [windowX, y + 4.73, libraryFront + 0.11], this.materials.get('wood'), false);
    }
    addBox(root, [3.0, 2.55, 0.14], [215, y + 1.33, libraryFront], this.materials.get('windowGlaze'), false);
    addBox(root, [0.15, 2.6, 0.25], [215, y + 1.34, libraryFront + 0.13], this.materials.get('wood'), false);
    addBox(root, [8.8, 0.2, 1.65], [215, y + 2.86, libraryFront + 0.64], this.materials.get('wood'));
    addBox(root, [9.3, 0.78, 0.15], [215, y + 6.75, libraryFront + 0.07], this.materials.get('sagePlaster'), false);
    const librarySign = this.materials.createSign('AMAYA LIBRARY', 8.8, 0.68);
    librarySign.position.set(215, y + 6.75, libraryFront + 0.16);
    root.add(librarySign);
    this.physics?.createFixedCuboid({ x: 215, y: y + 4, z: -80 }, { x: 19, y: 4, z: 12.5 });
    const courtyard = addBox(root, [62, 0.16, 50], [215, y + 0.08, -45], this.materials.get('stone'), false); courtyard.receiveShadow = true;
    return root;
  }
  private createHillGarden(): THREE.Group {
    const root = new THREE.Group(); root.name = 'landmark:hill-garden'; addDistrictDetails(root, 'hill', this.materials);
    const teaX = 283, teaZ = 272, y = cityHeightAt(teaX, teaZ);
    // A compact terrace supports the tea hut without slicing across the adjacent golf greens.
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.5, 0.6, 24), this.materials.get('stone'));
    platform.position.set(teaX, y + 0.3, teaZ); platform.receiveShadow = true; root.add(platform);
    addBox(root, [13, 0.6, 10], [teaX, y + 0.3, teaZ], this.materials.get('stone'));
    addBox(root, [12, 4.2, 9], [teaX, y + 2.7, teaZ], this.materials.get('warmPlaster'));
    addBox(root, [14, 0.3, 11], [teaX, y + 4.85, teaZ], this.materials.get('wood'));
    this.physics?.createFixedCuboid({ x: teaX, y: y + 2.7, z: teaZ }, { x: 6, y: 2.1, z: 4.5 });
    const teaFront = teaZ - 4.58;
    addBox(root, [8.2, 2.2, 0.13], [teaX - 1, y + 1.87, teaFront], this.materials.get('metalDark'), false);
    for (const side of [-1, 1]) addBox(root, [0.2, 2.5, 0.22], [teaX - 1 + side * 4.1, y + 1.87, teaFront - 0.08], this.materials.get('wood'));
    addBox(root, [8.5, 0.2, 0.9], [teaX - 1, y + 1.5, teaFront - 0.44], this.materials.get('wood'));
    addBox(root, [8.5, 0.92, 0.15], [teaX - 1, y + 1.0, teaFront - 0.86], this.materials.get('terracottaPlaster'), false);
    for (let cup = 0; cup < 7; cup += 1) {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8), this.materials.get(cup % 2 ? 'warmPlaster' : 'sagePlaster'));
      mug.position.set(teaX - 4.1 + cup * 0.98, y + 1.72, teaFront - 0.42); root.add(mug);
    }
    for (const offsetX of [-3.5, 2.8]) {
      addBox(root, [1.1, 0.09, 0.28], [teaX + offsetX, y + 2.55, teaFront - 0.2], this.materials.get('wood'), false);
      for (let jar = 0; jar < 3; jar += 1) {
        const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.35, 8), this.materials.get('curtainWarm'));
        canister.position.set(teaX + offsetX - 0.32 + jar * 0.32, y + 2.77, teaFront - 0.2); root.add(canister);
      }
    }
    addBox(root, [2, 2.35, 0.16], [teaX + 4.5, y + 1.78, teaFront], this.materials.get('wood'));
    addBox(root, [11, 0.17, 1.45], [teaX, y + 3.45, teaFront - 0.68], this.materials.get('terracottaPlaster'));
    addBox(root, [9.4, 0.58, 0.14], [teaX, y + 3.43, teaFront - 1.45], this.materials.get('wood'));
    const teaSign = this.materials.createSign('HILL TEA HUT', 8.8, 0.5);
    teaSign.position.set(teaX, y + 3.43, teaFront - 1.54); teaSign.rotation.y = Math.PI; root.add(teaSign);
    const railRadius = 7.8;
    const railPoints: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 1.45 + 0.15;
      railPoints.push({ x: teaX + Math.cos(a) * railRadius, z: teaZ + Math.sin(a) * railRadius });
      addBox(root, [0.12, 1.2, 0.12], [teaX + Math.cos(a) * railRadius, y + 1.1, teaZ + Math.sin(a) * railRadius], this.materials.get('metalDark'));
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
    for (let hole = 0; hole < 6; hole += 1) {
      const hx = golf.position.x + (hole % 3) * 9 - 9;
      const hz = golf.position.z + Math.floor(hole / 3) * 11 - 5;
      const greenGeometry = new THREE.PlaneGeometry(7.2, 3.2, 6, 2);
      greenGeometry.rotateX(-Math.PI / 2);
      const greenVertices = greenGeometry.getAttribute('position');
      for (let vertex = 0; vertex < greenVertices.count; vertex += 1) {
        greenVertices.setY(vertex, cityHeightAt(hx + greenVertices.getX(vertex), hz + greenVertices.getZ(vertex)) + 0.045);
      }
      greenVertices.needsUpdate = true;
      greenGeometry.computeVertexNormals();
      const green = new THREE.Mesh(greenGeometry, this.materials.get('foliageMid'));
      green.position.set(hx, 0, hz);
      green.receiveShadow = true;
      root.add(green);
      for (const edgeX of [-3.55, 3.55]) {
        const edgeY = cityHeightAt(hx + edgeX, hz);
        addBox(root, [0.12, 0.09, 3.2], [hx + edgeX, edgeY + 0.075, hz], this.materials.get('sandstone'), false);
      }
      addBox(root, [0.65, 0.05, 0.8], [hx - 2.3, cityHeightAt(hx - 2.3, hz) + 0.055, hz], this.materials.get('stone'), false);
      const flagY = cityHeightAt(hx + 2.3, hz);
      addBox(root, [0.04, 1.2, 0.04], [hx + 2.3, flagY + 0.65, hz], this.materials.get('metalDark'));
      addBox(root, [0.55, 0.3, 0.04], [hx + 2.58, flagY + 1.05, hz], this.materials.get('terracottaPlaster'), false);
      const cup = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), this.materials.get('metalDark'));
      cup.rotation.x = -Math.PI / 2;
      cup.position.set(hx + 2.3, flagY + 0.053, hz);
      root.add(cup);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), this.materials.get('warmPlaster'));
      ball.position.set(hx - 2.3, cityHeightAt(hx - 2.3, hz) + 0.15, hz);
      root.add(ball);

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
