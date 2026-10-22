import * as THREE from 'three';
import { cityHeightAt, type PicnicState } from '@together/shared';

const CENTER = { x: 168, z: 122 };
const FOOD_COLORS = { mangoes: 0xf3a52d, sandwiches: 0xb87d4d, samosas: 0xd99a44, idli: 0xf1ead4, chai: 0xb77742, lemon_soda: 0xc4d866 } as const;

/** Renders the persisted arrangement at the canonical Mogra Park lawn anchor. */
export class PicnicPresentation {
  readonly group = new THREE.Group();
  private revision = -1;
  private disposed = false;
  constructor(scene: THREE.Scene) { this.group.name = 'picnic-presentation'; scene.add(this.group); }

  update(state: PicnicState): void {
    if (this.disposed || state.revision <= this.revision) return;
    this.revision = state.revision;
    this.clearContents();
    if (state.mat) {
      const geometry = new THREE.BufferGeometry();
      const corners = [[-1.15, -1.05], [1.15, -1.05], [1.15, 1.05], [-1.15, 1.05]] as const;
      const heights = corners.map(([x, z]) => cityHeightAt(CENTER.x + state.mat!.x + x, CENTER.z + state.mat!.z + z));
      const base = heights.reduce((sum, height) => sum + height, 0) / heights.length;
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(([x, z], index) => [x, heights[index]! - base, z]), 3));
      geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
      const mat = this.mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb96f50, roughness: 0.95, side: THREE.DoubleSide }));
      mat.position.set(CENTER.x + state.mat.x, base + 0.025, CENTER.z + state.mat.z);
      // A pair of broad woven bands gives the cloth a readable top surface at a distance.
      for (const [offset, color] of [[-0.55, 0xe9c98e], [0.55, 0xe9c98e]] as const) {
        const stripe = this.mesh(new THREE.PlaneGeometry(2.16, 0.11), new THREE.MeshStandardMaterial({ color, roughness: 0.97, side: THREE.DoubleSide }));
        stripe.rotation.x = -Math.PI / 2;
        const worldX = CENTER.x + state.mat.x, worldZ = CENTER.z + state.mat.z + offset;
        stripe.position.set(worldX, cityHeightAt(worldX, worldZ) + 0.035, worldZ);
      }
    }
    state.items.forEach((item, index) => {
      const lift = 0.12 + index * 0.015;
      if (item.item === 'basket') {
        const body = this.mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x9b6841, roughness: 0.94 }));
        this.position(body, item.x, item.z, lift);
        const rim = this.mesh(new THREE.TorusGeometry(0.19, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc38d5a, roughness: 0.9 }));
        this.position(rim, item.x, item.z, lift + 0.12); rim.rotation.x = Math.PI / 2;
        const handle = this.mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0x805536, roughness: 0.9 }));
        this.position(handle, item.x, item.z, lift + 0.12); handle.rotation.x = Math.PI / 2;
      } else if (item.item === 'cups') {
        for (let cup = 0; cup < 3; cup++) {
          const mesh = this.mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.14, 9), new THREE.MeshStandardMaterial({ color: 0xf2e7d0, roughness: 0.55 }));
          this.position(mesh, item.x + ((cup % 2) - 0.5) * 0.1, item.z + (cup === 2 ? 0.07 : -0.04), lift + 0.06);
        }
      } else if (item.item === 'flowers') {
        const stem = this.mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), new THREE.MeshStandardMaterial({ color: 0x4d8054, roughness: 0.9 }));
        this.position(stem, item.x, item.z, lift + 0.13);
        const vase = this.mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xf0d9bd, roughness: 0.7 }));
        this.position(vase, item.x, item.z, lift + 0.07);
        for (let petal = 0; petal < 5; petal++) {
          const angle = petal * Math.PI * 2 / 5;
          const flower = this.mesh(new THREE.SphereGeometry(0.045, 7, 5), new THREE.MeshStandardMaterial({ color: 0xd7859e, roughness: 0.83 }));
          this.position(flower, item.x + Math.cos(angle) * 0.09, item.z + Math.sin(angle) * 0.09, lift + 0.29);
        }
      } else {
        const glow = new THREE.MeshStandardMaterial({ color: 0xf3c66c, emissive: 0x8b4f12, emissiveIntensity: 0.4, roughness: 0.55 });
        const frame = new THREE.MeshStandardMaterial({ color: 0x80613b, roughness: 0.84 });
        const body = this.mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), glow);
        this.position(body, item.x, item.z, lift + 0.13);
        for (const offset of [-0.11, 0.11]) {
          const rail = this.mesh(new THREE.BoxGeometry(0.025, 0.33, 0.025), frame);
          this.position(rail, item.x + offset, item.z + offset, lift + 0.13);
        }
        for (const height of [lift - 0.01, lift + 0.27]) {
          const cap = this.mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 8), frame);
          this.position(cap, item.x, item.z, height);
        }
      }
    });
    state.portions.slice(0, 24).forEach((portion, index) => {
      // Reuse eight compact platter spots; later shared portions sit neatly in small stacks.
      const spot = index % 8, stack = Math.floor(index / 8);
      const offsetX = ((spot % 4) - 1.5) * 0.39, offsetZ = (Math.floor(spot / 4) - 0.5) * 0.42;
      const plate = this.mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.8 }));
      this.position(plate, (state.mat?.x ?? 0) + offsetX, (state.mat?.z ?? 0) + offsetZ, 0.07 + stack * 0.065);
      const x = (state.mat?.x ?? 0) + offsetX, z = (state.mat?.z ?? 0) + offsetZ;
      const y = 0.14 + stack * 0.065;
      if (portion.food === 'chai' || portion.food === 'lemon_soda') {
        const cup = this.mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 9), new THREE.MeshStandardMaterial({ color: 0xf0e6d1, roughness: 0.55 }));
        this.position(cup, x, z, y);
        const drink = this.mesh(new THREE.CylinderGeometry(0.057, 0.052, 0.035, 9), new THREE.MeshStandardMaterial({ color: FOOD_COLORS[portion.food], roughness: 0.6 }));
        this.position(drink, x, z, y + 0.065);
        if (portion.food === 'lemon_soda') { const straw = this.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0xf7efdc })); this.position(straw, x + 0.025, z, y + 0.11); straw.rotation.z = -0.15; }
      } else if (portion.food === 'sandwiches' || portion.food === 'samosas') {
        const geometry = portion.food === 'sandwiches' ? new THREE.BoxGeometry(0.2, 0.08, 0.13) : new THREE.ConeGeometry(0.105, 0.13, 3);
        const food = this.mesh(geometry, new THREE.MeshStandardMaterial({ color: FOOD_COLORS[portion.food], roughness: 0.78 }));
        this.position(food, x, z, y + (portion.food === 'sandwiches' ? 0.06 : 0.08));
        if (portion.food === 'sandwiches') {
          const filling = this.mesh(new THREE.BoxGeometry(0.17, 0.018, 0.105), new THREE.MeshStandardMaterial({ color: 0x66834d, roughness: 0.9 }));
          this.position(filling, x, z, y + 0.035);
          food.rotation.y = index % 2 ? 0.28 : -0.28;
        }
      } else if (portion.food === 'idli') {
        const food = this.mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.045, 12), new THREE.MeshStandardMaterial({ color: FOOD_COLORS.idli, roughness: 0.88 }));
        this.position(food, x, z, y + 0.03);
      } else {
        const food = this.mesh(new THREE.SphereGeometry(0.09, 10, 7), new THREE.MeshStandardMaterial({ color: FOOD_COLORS.mangoes, roughness: 0.78 }));
        this.position(food, x, z, y + 0.045); food.scale.set(1.25, 0.8, 0.8);
      }
      if (portion.eatenBy) plate.scale.setScalar(0.74);
    });
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh); return mesh;
  }
  private position(mesh: THREE.Mesh, x: number, z: number, lift: number): void {
    const worldX = CENTER.x + x, worldZ = CENTER.z + z;
    mesh.position.set(worldX, cityHeightAt(worldX, worldZ) + lift, worldZ);
  }
  private clearContents(): void {
    for (const child of [...this.group.children]) {
      if (child instanceof THREE.Mesh) { child.geometry.dispose(); for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose(); }
    }
    this.group.clear();
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.clearContents(); this.group.removeFromParent(); }
}
