import * as THREE from 'three';
import { AMAYA_BAY_CITY, cityHeightAt, createSeededRandom } from '@together/shared';

type AmbientWalker = {
  position: THREE.Vector3;
  speed: number;
  centerX: number;
  centerZ: number;
  axis: 'x' | 'z';
  extent: number;
  direction: 1 | -1;
  phase: number;
};

const BODY_HEIGHT = 1.03;
const HEAD_HEIGHT = 1.62;
const CULL_DISTANCE = 115;

export class AmbientNPCSystem {
  readonly root = new THREE.Group();

  private readonly walkers: AmbientWalker[] = [];
  private readonly bodies: THREE.InstancedMesh;
  private readonly heads: THREE.InstancedMesh;
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  private readonly skinMaterial = new THREE.MeshStandardMaterial({ color: 0xa97052, roughness: 0.82 });
  private readonly bodyMatrix = new THREE.Matrix4();
  private readonly headMatrix = new THREE.Matrix4();
  private readonly bodyPosition = new THREE.Vector3();
  private readonly headPosition = new THREE.Vector3();
  private readonly bodyQuaternion = new THREE.Quaternion();
  private readonly headingQuaternion = new THREE.Quaternion();
  private readonly tiltQuaternion = new THREE.Quaternion();
  private readonly visibleScale = new THREE.Vector3(1, 1, 1);
  private readonly hiddenScale = new THREE.Vector3(0, 0, 0);
  private readonly yAxis = new THREE.Vector3(0, 1, 0);
  private readonly zAxis = new THREE.Vector3(0, 0, 1);

  constructor(count = 32) {
    this.root.name = 'ambient-city-npcs-development';

    this.bodies = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.22, 0.5, 4, 7),
      this.bodyMaterial,
      count,
    );
    this.bodies.name = 'ambient-npc-bodies';
    this.bodies.castShadow = true;
    this.bodies.frustumCulled = false;
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.15, 8, 7),
      this.skinMaterial,
      count,
    );
    this.heads.name = 'ambient-npc-heads';
    this.heads.castShadow = true;
    this.heads.frustumCulled = false;
    this.heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.root.add(this.bodies, this.heads);

    const clothing = [0x7c6658, 0x667a75, 0xa0705c, 0x596879, 0x8b775a, 0x6f6f91, 0x936b74];
    const random = createSeededRandom(918273);
    for (let i = 0; i < count; i += 1) {
      const district = AMAYA_BAY_CITY.districts[i % AMAYA_BAY_CITY.districts.length]!;
      const axis: 'x' | 'z' = i % 2 === 0 ? 'x' : 'z';
      const extent = 20 + random() * Math.min(52, district.radius * 0.42);
      const offsetX = (random() - 0.5) * district.radius * 0.52;
      const offsetZ = (random() - 0.5) * district.radius * 0.52;
      const centerX = district.center.x + offsetX;
      const centerZ = district.center.z + offsetZ;
      const along = (random() - 0.5) * extent * 2;
      const x = centerX + (axis === 'x' ? along : 0);
      const z = centerZ + (axis === 'z' ? along : 0);
      const walker: AmbientWalker = {
        position: new THREE.Vector3(x, cityHeightAt(x, z), z),
        speed: 0.68 + random() * 0.72,
        centerX,
        centerZ,
        axis,
        extent,
        direction: random() > 0.5 ? 1 : -1,
        phase: random() * Math.PI * 2,
      };
      this.walkers.push(walker);
      this.bodies.setColorAt(i, new THREE.Color(clothing[i % clothing.length]!));
      this.writeWalkerMatrices(i, walker, true, 0);
    }

    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }

  update(deltaSeconds: number, playerPosition: THREE.Vector3): void {
    const now = performance.now() * 0.001;
    for (let index = 0; index < this.walkers.length; index += 1) {
      const walker = this.walkers[index]!;
      const distance = walker.position.distanceTo(playerPosition);
      if (distance > CULL_DISTANCE) {
        this.writeWalkerMatrices(index, walker, false, now);
        continue;
      }

      const updateScale = distance > 60 ? 0.38 : distance > 32 ? 0.68 : 1;
      const delta = walker.speed * walker.direction * deltaSeconds * updateScale;
      if (walker.axis === 'x') {
        walker.position.x += delta;
        if (walker.position.x > walker.centerX + walker.extent) walker.direction = -1;
        else if (walker.position.x < walker.centerX - walker.extent) walker.direction = 1;
      } else {
        walker.position.z += delta;
        if (walker.position.z > walker.centerZ + walker.extent) walker.direction = -1;
        else if (walker.position.z < walker.centerZ - walker.extent) walker.direction = 1;
      }

      walker.position.y = cityHeightAt(walker.position.x, walker.position.z);
      this.writeWalkerMatrices(index, walker, true, now);
    }

    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.bodies.geometry.dispose();
    this.heads.geometry.dispose();
    this.bodyMaterial.dispose();
    this.skinMaterial.dispose();
    this.root.clear();
  }

  private writeWalkerMatrices(index: number, walker: AmbientWalker, visible: boolean, now: number): void {
    const heading = walker.axis === 'x'
      ? (walker.direction === 1 ? Math.PI / 2 : -Math.PI / 2)
      : (walker.direction === 1 ? 0 : Math.PI);

    this.headingQuaternion.setFromAxisAngle(this.yAxis, heading);
    this.tiltQuaternion.setFromAxisAngle(this.zAxis, Math.sin(now * 4.4 + walker.phase) * 0.025);
    this.bodyQuaternion.copy(this.headingQuaternion).multiply(this.tiltQuaternion);

    this.bodyPosition.set(walker.position.x, walker.position.y + BODY_HEIGHT, walker.position.z);
    this.headPosition.set(walker.position.x, walker.position.y + HEAD_HEIGHT, walker.position.z);
    const scale = visible ? this.visibleScale : this.hiddenScale;

    this.bodyMatrix.compose(this.bodyPosition, this.bodyQuaternion, scale);
    this.headMatrix.compose(this.headPosition, this.headingQuaternion, scale);
    this.bodies.setMatrixAt(index, this.bodyMatrix);
    this.heads.setMatrixAt(index, this.headMatrix);
  }
}
