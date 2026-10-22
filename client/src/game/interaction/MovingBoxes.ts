import * as THREE from 'three';
import { cityHeightAt } from '@together/shared';

export type PackedBox = { disposition: 'keep' | 'sell' | 'donate' };

const MAX_BOXES = 12;
const TAG_COLORS = { keep: null, sell: 0xd2453a, donate: 0x4e9a6a } as const;

/** Taped moving boxes stacked inside the front of the home while a household packs. Visual only. */
export class MovingBoxes {
  readonly root = new THREE.Group();
  private readonly cardboard = new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.92 });
  private readonly tape = new THREE.MeshStandardMaterial({ color: 0xe8d6a8, roughness: 0.6 });
  private readonly tags = new Map<number, THREE.MeshStandardMaterial>();
  private readonly box = new THREE.BoxGeometry(0.62, 0.46, 0.5);
  private readonly strip = new THREE.BoxGeometry(0.64, 0.012, 0.1);
  private readonly label = new THREE.BoxGeometry(0.18, 0.12, 0.012);
  private signature = '';

  constructor(scene: THREE.Scene) {
    this.root.name = 'moving-boxes';
    scene.add(this.root);
  }

  /** Rebuilds the stack only when the packed list changes; an empty list clears it. */
  set(origin: { x: number; z: number } | null, boxes: readonly PackedBox[]): void {
    const shown = origin ? boxes.slice(0, MAX_BOXES) : [];
    const signature = origin ? `${origin.x},${origin.z}:${shown.map(entry => entry.disposition).join(',')}` : '';
    if (signature === this.signature) return;
    this.signature = signature;
    this.root.clear();
    if (!origin) return;
    const groundY = cityHeightAt(origin.x, origin.z) + 0.18;
    shown.forEach((entry, index) => {
      // Rows of three, stacked two high, with a little hand-placed jitter.
      const column = index % 3, layer = Math.floor(index / 3) % 2, row = Math.floor(index / 6);
      const group = new THREE.Group();
      group.position.set(origin.x + (column - 1) * 0.68, groundY + 0.23 + layer * 0.47, origin.z + row * 0.58);
      group.rotation.y = ((index * 37) % 11 - 5) * 0.02;
      group.add(new THREE.Mesh(this.box, this.cardboard));
      const top = new THREE.Mesh(this.strip, this.tape); top.position.y = 0.235; group.add(top);
      const color = TAG_COLORS[entry.disposition];
      if (color !== null) {
        let material = this.tags.get(color);
        if (!material) { material = new THREE.MeshStandardMaterial({ color, roughness: 0.7 }); this.tags.set(color, material); }
        const tag = new THREE.Mesh(this.label, material); tag.position.set(0.12, 0.05, -0.256); group.add(tag);
      }
      group.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      this.root.add(group);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.clear();
    for (const geometry of [this.box, this.strip, this.label]) geometry.dispose();
    for (const material of [this.cardboard, this.tape, ...this.tags.values()]) material.dispose();
  }
}
