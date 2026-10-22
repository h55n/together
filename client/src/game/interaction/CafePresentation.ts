import * as THREE from 'three';
import { cityHeightAt, type CafeState } from '@together/shared';

// The main building sits farther up the block. This is its accessible outdoor frontage.
export const CAFE_PRESENTATION_CENTER = { x: -36.5, z: 60 } as const;
const CENTER = CAFE_PRESENTATION_CENTER;
const SEATS = Array.from({ length: 6 }, (_, index) => {
  const angle = Math.PI * 2 * index / 6;
  return { x: Math.cos(angle) * 1.75, z: Math.sin(angle) * 1.75 };
});
/** World placement of a café chair: guests sit facing the shared table. */
export function cafeSeatTransform(seat: number): { x: number; z: number; seatTop: number; yaw: number } | null {
  const point = SEATS[seat - 1];
  if (!point) return null;
  const x = CENTER.x + point.x, z = CENTER.z + point.z;
  return { x, z, seatTop: cityHeightAt(x, z) + 0.535, yaw: Math.atan2(point.x, point.z) };
}
const DRINK_COLORS = { chai: 0x96603d, filter_coffee: 0x70442e, cold_coffee: 0x9f6d4e, lemon_soda: 0xb5c95e } as const;

/** Shows saved seat choices and drinks on Café Roshan's shared table. */
export class CafePresentation {
  readonly group = new THREE.Group();
  private revision = -1;
  private disposed = false;
  constructor(scene: THREE.Scene) { this.group.name = 'cafe-presentation'; scene.add(this.group); }

  update(state: CafeState): void {
    if (this.disposed || state.revision <= this.revision) return;
    this.revision = state.revision;
    this.clearContents();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8c6548, roughness: 0.85 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x46544e, roughness: 0.78 });
    const table = this.mesh(new THREE.CylinderGeometry(0.78, 0.76, 0.13, 20), wood);
    this.place(table, 0, 0, 1.05);
    this.mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.88, 10), metal).position.copy(table.position).add(new THREE.Vector3(0, -0.49, 0));
    for (let leg = 0; leg < 4; leg++) {
      const angle = Math.PI / 4 + leg * Math.PI / 2;
      const foot = this.mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.84, 6), metal);
      this.place(foot, Math.cos(angle) * 0.48, Math.sin(angle) * 0.48, 0.48);
    }
    for (let seat = 1; seat <= SEATS.length; seat++) {
      const point = SEATS[seat - 1]!;
      const chairGroup = new THREE.Group(); chairGroup.name = `cafe-chair-${seat}`;
      const worldX = CENTER.x + point.x, worldZ = CENTER.z + point.z;
      chairGroup.position.set(worldX, cityHeightAt(worldX, worldZ), worldZ);
      chairGroup.rotation.y = -Math.atan2(point.z, point.x) - Math.PI / 2;
      this.group.add(chairGroup);
      const local = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
        const part = this.mesh(geometry, material); part.position.set(x, y, z); chairGroup.add(part); return part;
      };
      const occupied = Object.values(state.seats).includes(seat);
      const seatMaterial = new THREE.MeshStandardMaterial({ color: occupied ? (seat % 2 ? 0x4d7463 : 0xb77954) : 0x68746c, roughness: 0.9 });
      local(new THREE.BoxGeometry(0.52, 0.11, 0.52), seatMaterial, 0, 0.48, 0);
      local(new THREE.BoxGeometry(0.52, 0.55, 0.1), seatMaterial, 0, 0.78, -0.2);
      const feet: readonly [number, number][] = [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]];
      for (const [dx, dz] of feet)
        local(new THREE.CylinderGeometry(0.025, 0.035, 0.46, 6), metal, dx, 0.24, dz);
    }
    state.orders.slice(0, 24).forEach((order, index) => {
      const point = { x: ((index % 5) - 2) * 0.235, z: (Math.floor(index / 5) - 2) * 0.235 };
      const cup = this.mesh(new THREE.CylinderGeometry(0.115, 0.095, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xf1e7d3, roughness: 0.45 }));
      this.place(cup, point.x, point.z, 1.18);
      cup.position.y = table.position.y + 0.065 + 0.1;
      const liquid = this.mesh(new THREE.CylinderGeometry(0.084, 0.078, 0.025, 12), new THREE.MeshStandardMaterial({ color: DRINK_COLORS[order.drink], roughness: 0.5 }));
      this.place(liquid, point.x, point.z, 1.29);
      liquid.position.y = cup.position.y + 0.09;
      if (order.sippedBy) liquid.scale.set(0.58, 1, 0.58);
    });
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh); return mesh;
  }
  private place(mesh: THREE.Mesh, x: number, z: number, lift: number): void {
    const worldX = CENTER.x + x, worldZ = CENTER.z + z;
    mesh.position.set(worldX, cityHeightAt(worldX, worldZ) + lift, worldZ);
  }
  private clearContents(): void {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    this.group.clear();
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.clearContents(); this.group.removeFromParent(); }
}
