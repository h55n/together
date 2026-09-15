import * as THREE from 'three';
import { AMAYA_BAY_CITY, cityHeightAt, createSeededRandom } from '@together/shared';

export class AmbientNPCSystem {
  readonly root = new THREE.Group();
  private readonly walkers: Array<{
    root: THREE.Group;
    speed: number;
    centerX: number;
    centerZ: number;
    axis: 'x' | 'z';
    extent: number;
    direction: 1 | -1;
    phase: number;
  }> = [];

  constructor(count = 32) {
    this.root.name = 'ambient-city-npcs-development';
    const clothing = [0x7c6658, 0x667a75, 0xa0705c, 0x596879, 0x8b775a, 0x6f6f91, 0x936b74];
    const random = createSeededRandom(918273);
    for (let i = 0; i < count; i += 1) {
      const district = AMAYA_BAY_CITY.districts[i % AMAYA_BAY_CITY.districts.length]!;
      const walker = this.createWalker(clothing[i % clothing.length]!);
      const axis: 'x' | 'z' = i % 2 === 0 ? 'x' : 'z';
      const extent = 20 + random() * Math.min(52, district.radius * 0.42);
      const offsetX = (random() - 0.5) * district.radius * 0.52;
      const offsetZ = (random() - 0.5) * district.radius * 0.52;
      const centerX = district.center.x + offsetX;
      const centerZ = district.center.z + offsetZ;
      const along = (random() - 0.5) * extent * 2;
      const x = centerX + (axis === 'x' ? along : 0);
      const z = centerZ + (axis === 'z' ? along : 0);
      walker.position.set(x, cityHeightAt(x, z), z);
      walker.userData.districtId = district.id;
      this.root.add(walker);
      this.walkers.push({
        root: walker,
        speed: 0.68 + random() * 0.72,
        centerX,
        centerZ,
        axis,
        extent,
        direction: random() > 0.5 ? 1 : -1,
        phase: random() * Math.PI * 2,
      });
    }
  }

  update(deltaSeconds: number, playerPosition: THREE.Vector3): void {
    const now = performance.now() * 0.001;
    for (const walker of this.walkers) {
      const distance = walker.root.position.distanceTo(playerPosition);
      if (distance > 115) {
        walker.root.visible = false;
        continue;
      }
      walker.root.visible = true;
      const updateScale = distance > 60 ? 0.38 : distance > 32 ? 0.68 : 1;
      const delta = walker.speed * walker.direction * deltaSeconds * updateScale;
      if (walker.axis === 'x') {
        walker.root.position.x += delta;
        if (walker.root.position.x > walker.centerX + walker.extent) walker.direction = -1;
        else if (walker.root.position.x < walker.centerX - walker.extent) walker.direction = 1;
        walker.root.rotation.y = walker.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        walker.root.position.z += delta;
        if (walker.root.position.z > walker.centerZ + walker.extent) walker.direction = -1;
        else if (walker.root.position.z < walker.centerZ - walker.extent) walker.direction = 1;
        walker.root.rotation.y = walker.direction === 1 ? 0 : Math.PI;
      }
      walker.root.position.y = cityHeightAt(walker.root.position.x, walker.root.position.z);
      const body = walker.root.children[0];
      if (body) body.rotation.z = Math.sin(now * 4.4 + walker.phase) * 0.025;
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
  }

  private createWalker(color: number): THREE.Group {
    const root = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xa97052, roughness: 0.82 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 7), cloth);
    body.position.y = 1.03;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), skin);
    head.position.y = 1.62;
    root.add(body, head);
    root.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    return root;
  }
}
