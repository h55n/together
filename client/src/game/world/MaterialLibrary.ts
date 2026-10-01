import * as THREE from 'three';
import { AMAYA_BAY_VENUES } from '@together/shared';
import { makeSignAtlas } from './SignAtlas';
import { createSurfaceTexture } from './SurfaceTextures';

export type WorldMaterialKey =
  | 'sign'
  | 'asphalt'
  | 'asphaltPatch'
  | 'concrete'
  | 'warmPlaster'
  | 'terracottaPlaster'
  | 'sagePlaster'
  | 'wood'
  | 'metalDark'
  | 'glass'
  | 'windowGlaze'
  | 'windowRecess'
  | 'curtainWarm'
  | 'foliageDeep'
  | 'foliageMid'
  | 'foliageLight'
  | 'foliagePainted'
  | 'flowerCoral'
  | 'flowerGold'
  | 'grass'
  | 'soil'
  | 'stone'
  | 'sandstone'
  | 'water';

export class MaterialLibrary {
  private readonly materials = new Map<WorldMaterialKey, THREE.MeshStandardMaterial>();
  private readonly signLabels = [...new Set([...AMAYA_BAY_VENUES.map(venue => venue.displayName.toUpperCase()), 'CAFE ROSHAN', 'MOGRA COURT', 'LANTERN STREET', 'BAY STEPS', 'CYCLE HUT', 'KAYAK LAUNCH', 'AMAYA LIBRARY', 'AUTO STAND'])];
  private wetness = 0;
  private readonly dryColors = new Map<WorldMaterialKey, THREE.Color>();
  private readonly textures: THREE.Texture[] = [];
  private readonly disposalCallbacks: Array<() => void> = [];

  constructor() {
    this.materials.set('sign', this.make(0xffffff, 0.8, 0));
    const atlas = makeSignAtlas(this.signLabels);
    if (atlas) { this.textures.push(atlas); this.get('sign').map = atlas; }
    this.get('sign').emissive.set(0x72684f);
    this.get('sign').emissiveIntensity = 0.08;
    this.materials.set('asphalt', this.make(0x77736d, 0.9, 0.02));
    this.materials.set('asphaltPatch', this.make(0x696b67, 0.84, 0.02));
    this.materials.set('concrete', this.make(0xb7afa1, 0.88, 0.01));
    this.materials.set('warmPlaster', this.make(0xd7c8ae, 0.82, 0.01));
    this.materials.set('terracottaPlaster', this.make(0xa96550, 0.84, 0.01));
    this.materials.set('sagePlaster', this.make(0x849582, 0.86, 0.01));
    this.materials.set('wood', this.make(0x71513c, 0.72, 0.02));
    this.materials.set('metalDark', this.make(0x343936, 0.55, 0.32));
    this.materials.set('glass', new THREE.MeshStandardMaterial({ color: 0x79939d, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.58 }));
    this.materials.set('windowGlaze', new THREE.MeshStandardMaterial({ color: 0x527d8b, roughness: 0.38, metalness: 0.12 }));
    this.materials.set('windowRecess', this.make(0x263b3d, 0.94, 0));
    this.materials.set('curtainWarm', this.make(0xd8b78f, 0.95, 0));
    this.materials.set('foliageDeep', this.make(0x305d41, 0.94, 0));
    this.materials.set('foliageMid', this.make(0x4d8151, 0.94, 0));
    this.materials.set('foliageLight', this.make(0x8aa55c, 0.94, 0));
    this.materials.set('foliagePainted', new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.94 }));
    this.materials.set('flowerCoral', this.make(0xc77864, 0.96, 0));
    this.materials.set('flowerGold', this.make(0xe4bb75, 0.96, 0));
    this.materials.set('grass', this.make(0x7e9260, 0.98, 0));
    this.get('grass').vertexColors = true;
    this.materials.set('soil', this.make(0x5b4837, 0.97, 0));
    this.materials.set('stone', this.make(0x948d80, 0.9, 0.01));
    this.materials.set('sandstone', this.make(0xd9c6a6, 0.91, 0.01));
    this.materials.set('water', new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.26, metalness: 0.04, transparent: true, opacity: 0.9, emissive: 0x254b53, emissiveIntensity: 0.12 }));
    const mineral = createSurfaceTexture('mineral');
    const plaster = createSurfaceTexture('plaster');
    const wood = createSurfaceTexture('wood');
    const paving = createSurfaceTexture('paving');
    const grass = createSurfaceTexture('grass'), asphalt = createSurfaceTexture('asphalt');
    this.textures.push(mineral, plaster, wood, paving, grass, asphalt);
    for (const key of ['soil', 'stone', 'sandstone'] as const) this.get(key).map = mineral;
    for (const key of ['asphalt', 'asphaltPatch'] as const) this.get(key).map = asphalt;
    this.get('grass').map = grass;
    for (const key of ['warmPlaster', 'terracottaPlaster', 'sagePlaster'] as const) this.get(key).map = plaster;
    this.get('concrete').map = paving;
    this.get('wood').map = wood;
    this.get('warmPlaster').bumpMap = plaster; this.get('warmPlaster').bumpScale = .018;
    this.get('terracottaPlaster').bumpMap = plaster; this.get('terracottaPlaster').bumpScale = .018;
    this.get('sagePlaster').bumpMap = plaster; this.get('sagePlaster').bumpScale = .018;
    this.get('wood').bumpMap = wood; this.get('wood').bumpScale = .012;
    for (const [key, material] of this.materials) {
      material.userData.togetherShared = true;
      this.dryColors.set(key, material.color.clone());
    }
  }

  get(key: WorldMaterialKey): THREE.MeshStandardMaterial {
    const material = this.materials.get(key);
    if (!material) throw new Error(`Unknown world material: ${key}`);
    return material;
  }

  createSign(label: string, width: number, height: number): THREE.Mesh {
    const index = Math.max(0, this.signLabels.indexOf(label.toUpperCase()));
    const rows = Math.ceil(this.signLabels.length / 2);
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.getAttribute('uv');
    for (let i=0;i<uv.count;i+=1) uv.setXY(i,(index%2+uv.getX(i))/2,1-(Math.floor(index/2)+1-uv.getY(i))/rows);
    return new THREE.Mesh(geometry,this.get('sign'));
  }

  setTime(minutes: number): void {
    const hour = ((minutes / 60) % 24 + 24) % 24;
    const night = hour < 6 || hour > 18.5;
    this.get('glass').emissive.set(0xffbd75);
    this.get('glass').emissiveIntensity = night ? 0.55 : 0.015;
    this.get('windowGlaze').emissive.set(0xffbd75);
    this.get('windowGlaze').emissiveIntensity = night ? 0.28 : 0.015;
    this.get('sign').emissiveIntensity = night ? 0.4 : 0.08;
  }

  setWetness(value: number): void {
    this.wetness = THREE.MathUtils.clamp(value, 0, 1);
    for (const key of ['asphalt', 'asphaltPatch', 'concrete', 'stone', 'sandstone'] as const) {
      const material = this.get(key);
      material.color.copy(this.dryColors.get(key)!).multiplyScalar(1 - this.wetness * 0.32);
      material.roughness = Math.max(0.18, (key === 'asphalt' ? 0.9 : 0.86) - this.wetness * 0.6);
    }
  }

  getWetness(): number {
    return this.wetness;
  }

  dispose(): void {
    for (const dispose of this.disposalCallbacks) dispose();
    this.disposalCallbacks.length = 0;
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    for (const texture of this.textures) texture.dispose();
    this.textures.length = 0;
    this.dryColors.clear();
  }

  onDispose(callback: () => void): void { this.disposalCallbacks.push(callback); }

  private make(color: THREE.ColorRepresentation, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
}
