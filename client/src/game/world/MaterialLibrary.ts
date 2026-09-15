import * as THREE from 'three';

export type WorldMaterialKey =
  | 'asphalt'
  | 'asphaltPatch'
  | 'concrete'
  | 'warmPlaster'
  | 'terracottaPlaster'
  | 'sagePlaster'
  | 'wood'
  | 'metalDark'
  | 'glass'
  | 'curtainWarm'
  | 'foliageDeep'
  | 'foliageMid'
  | 'foliageLight'
  | 'soil'
  | 'stone'
  | 'water';

export class MaterialLibrary {
  private readonly materials = new Map<WorldMaterialKey, THREE.MeshStandardMaterial>();
  private wetness = 0;

  constructor() {
    this.materials.set('asphalt', this.make(0x53514c, 0.9, 0.02));
    this.materials.set('asphaltPatch', this.make(0x454641, 0.84, 0.02));
    this.materials.set('concrete', this.make(0xb7afa1, 0.88, 0.01));
    this.materials.set('warmPlaster', this.make(0xd7c8ae, 0.82, 0.01));
    this.materials.set('terracottaPlaster', this.make(0xa96550, 0.84, 0.01));
    this.materials.set('sagePlaster', this.make(0x849582, 0.86, 0.01));
    this.materials.set('wood', this.make(0x71513c, 0.72, 0.02));
    this.materials.set('metalDark', this.make(0x343936, 0.55, 0.32));
    this.materials.set('glass', new THREE.MeshStandardMaterial({ color: 0x79939d, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.58 }));
    this.materials.set('curtainWarm', this.make(0xd8b78f, 0.95, 0));
    this.materials.set('foliageDeep', this.make(0x305d41, 0.94, 0));
    this.materials.set('foliageMid', this.make(0x4e7650, 0.94, 0));
    this.materials.set('foliageLight', this.make(0x6f8f5b, 0.94, 0));
    this.materials.set('soil', this.make(0x5b4837, 0.97, 0));
    this.materials.set('stone', this.make(0x948d80, 0.9, 0.01));
    this.materials.set('water', new THREE.MeshStandardMaterial({ color: 0x507b82, roughness: 0.25, metalness: 0.06, transparent: true, opacity: 0.86 }));
    for (const material of this.materials.values()) material.userData.togetherShared = true;
  }

  get(key: WorldMaterialKey): THREE.MeshStandardMaterial {
    const material = this.materials.get(key);
    if (!material) throw new Error(`Unknown world material: ${key}`);
    return material;
  }

  setWetness(value: number): void {
    this.wetness = THREE.MathUtils.clamp(value, 0, 1);
    for (const key of ['asphalt', 'asphaltPatch', 'concrete', 'stone'] as const) {
      const material = this.get(key);
      material.roughness = Math.max(0.18, (key === 'asphalt' ? 0.9 : 0.86) - this.wetness * 0.6);
    }
  }

  getWetness(): number {
    return this.wetness;
  }

  dispose(): void {
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }

  private make(color: THREE.ColorRepresentation, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
}
