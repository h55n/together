import * as THREE from 'three';
import { cityHeightAt } from '@together/shared';

/** A softly glowing paper lantern hovering over the next place a household story asks you to visit. */
export class StoryMarker {
  readonly root = new THREE.Group();
  private readonly lantern: THREE.Mesh;
  private readonly glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8), toneMapped: false, fog: false });
  private readonly paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf6c56b, emissive: 0xffa040, emissiveIntensity: 0.9, roughness: 0.8, transparent: true, opacity: 0.92 });
  private readonly cordMaterial = new THREE.MeshBasicMaterial({ color: 0x6b4a2a });
  private target: { x: number; z: number } | null = null;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'story-marker';
    this.root.visible = false;
    this.lantern = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12).scale(1, 1.25, 1), this.paperMaterial);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), this.glowMaterial);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.1, 12), this.cordMaterial);
    cap.position.y = 0.55;
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 5), this.cordMaterial);
    tassel.position.y = -0.7;
    this.lantern.add(core, cap, tassel);
    this.root.add(this.lantern);
    scene.add(this.root);
  }

  /** Shows the lantern over a world point, or hides it with null. */
  setTarget(target: { x: number; z: number } | null): void {
    this.target = target ? { ...target } : null;
    this.root.visible = this.target !== null;
    if (this.target) this.root.position.set(this.target.x, cityHeightAt(this.target.x, this.target.z) + 3.2, this.target.z);
  }

  /** True once the player stands within `radius` metres of the marked place. */
  reached(position: THREE.Vector3, radius = 6): boolean {
    return this.target !== null && Math.hypot(position.x - this.target.x, position.z - this.target.z) <= radius;
  }

  update(deltaSeconds: number): void {
    if (!this.target) return;
    this.elapsed += Math.max(0, deltaSeconds);
    // A slow bob and sway, like a lantern on a warm evening breeze.
    this.lantern.position.y = Math.sin(this.elapsed * 1.4) * 0.18;
    this.lantern.rotation.z = Math.sin(this.elapsed * 0.9) * 0.08;
    this.lantern.rotation.y += deltaSeconds * 0.4;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    this.glowMaterial.dispose(); this.paperMaterial.dispose(); this.cordMaterial.dispose();
  }
}
