import * as THREE from 'three';

const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

export class InstancePool {
  readonly mesh: THREE.InstancedMesh;
  private readonly freeSlots: number[];
  private readonly activeSlots = new Set<number>();

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, private readonly capacity: number) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.freeSlots = Array.from({ length: capacity }, (_, index) => capacity - index - 1);
    for (let index = 0; index < capacity; index += 1) this.mesh.setMatrixAt(index, HIDDEN_MATRIX);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  allocate(matrix: THREE.Matrix4): number {
    const slot = this.freeSlots.pop();
    if (slot === undefined) throw new Error('Instance pool capacity exhausted');
    this.activeSlots.add(slot);
    this.mesh.setMatrixAt(slot, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    return slot;
  }

  setVisible(slot: number, visible: boolean, matrix?: THREE.Matrix4): void {
    this.assertActive(slot);
    this.mesh.setMatrixAt(slot, visible ? (matrix ?? HIDDEN_MATRIX) : HIDDEN_MATRIX);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  release(slot: number): void {
    this.assertActive(slot);
    this.activeSlots.delete(slot);
    this.mesh.setMatrixAt(slot, HIDDEN_MATRIX);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.freeSlots.push(slot);
  }

  metrics(): { capacity: number; active: number } {
    return { capacity: this.capacity, active: this.activeSlots.size };
  }

  private assertActive(slot: number): void {
    if (!this.activeSlots.has(slot)) throw new Error(`Inactive instance slot: ${slot}`);
  }
}
