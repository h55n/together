import * as THREE from 'three';
import { AMAYA_BAY_VENUES } from '@together/shared';
import { makeSignAtlas } from './SignAtlas';
import { createSurfaceTexture } from './SurfaceTextures';
import { createClothTextures } from './ClothTextures';

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
  | 'promenadePaving'
  | 'pastelYellow'
  | 'pastelBlue'
  | 'pastelPink'
  | 'mintPlaster'
  | 'creamPlaster'
  | 'roofTile'
  | 'roofSlate'
  | 'roofTeal'
  | 'roadPaint'
  | 'roadLine'
  | 'lampShade'
  | 'interiorPlaster'
  | 'water';

export class MaterialLibrary {
  private readonly materials = new Map<WorldMaterialKey, THREE.MeshStandardMaterial>();
  private readonly signLabels = [...new Set([...AMAYA_BAY_VENUES.map(venue => venue.displayName.toUpperCase()), 'CAFE ROSHAN', 'MOGRA COURT', 'LANTERN STREET', 'BAY STEPS', 'CYCLE HUT', 'KAYAK LAUNCH', 'AMAYA LIBRARY', 'AUTO STAND'])];
  private wetness = 0;
  private readonly dryColors = new Map<WorldMaterialKey, THREE.Color>();
  private readonly dryRoughness = new Map<WorldMaterialKey, number>();
  private readonly textures: THREE.Texture[] = [];
  private readonly disposalCallbacks: Array<() => void> = [];

  constructor() {
    this.materials.set('sign', this.make(0xffffff, 0.8, 0));
    const atlas = makeSignAtlas(this.signLabels);
    if (atlas) { this.textures.push(atlas); this.get('sign').map = atlas; }
    this.get('sign').emissive.set(0x72684f);
    this.get('sign').emissiveIntensity = 0.08;
    this.materials.set('asphalt', this.make(0x5a6068, 0.9, 0.02));
    this.materials.set('asphaltPatch', this.make(0x696b67, 0.84, 0.02));
    this.materials.set('concrete', this.make(0xcfc8bb, 0.88, 0.01));
    this.materials.set('warmPlaster', this.make(0xecdab6, 0.82, 0.01));
    this.materials.set('terracottaPlaster', this.make(0xd27b5c, 0.84, 0.01));
    this.materials.set('sagePlaster', this.make(0x9fc2a3, 0.86, 0.01));
    this.materials.set('wood', this.make(0x71513c, 0.72, 0.02));
    this.materials.set('metalDark', this.make(0x343936, 0.55, 0.32));
    this.materials.set('glass', new THREE.MeshStandardMaterial({ color: 0x79939d, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.58 }));
    this.materials.set('windowGlaze', new THREE.MeshStandardMaterial({ color: 0x527d8b, roughness: 0.38, metalness: 0.12 }));
    this.materials.set('windowRecess', this.make(0x263b3d, 0.94, 0));
    this.materials.set('curtainWarm', this.make(0xd8b78f, 0.95, 0));
    this.materials.set('foliageDeep', this.make(0x1f5a3a, 0.94, 0));
    this.materials.set('foliageMid', this.make(0x3c8c46, 0.94, 0));
    this.materials.set('foliageLight', this.make(0x9ccb4f, 0.94, 0));
    this.materials.set('foliagePainted', new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.94 }));
    this.materials.set('flowerCoral', this.make(0xe8604a, 0.96, 0));
    this.materials.set('flowerGold', this.make(0xf2c24a, 0.96, 0));
    this.materials.set('grass', this.make(0x62a046, 0.98, 0));
    this.get('grass').vertexColors = true;
    this.materials.set('soil', this.make(0x5b4837, 0.97, 0));
    this.materials.set('stone', this.make(0x948d80, 0.9, 0.01));
    this.materials.set('sandstone', this.make(0xd9c6a6, 0.91, 0.01));
    this.materials.set('promenadePaving', this.make(0xb88470, 0.86, 0.01));
    // Painterly anime street palette: pastel walls, saturated tiled roofs and crisp road paint.
    this.materials.set('pastelYellow', this.make(0xf3d98e, 0.84, 0.01));
    this.materials.set('pastelBlue', this.make(0xa8cbe3, 0.84, 0.01));
    this.materials.set('pastelPink', this.make(0xecb5a5, 0.84, 0.01));
    this.materials.set('mintPlaster', this.make(0xb7dcc0, 0.84, 0.01));
    this.materials.set('creamPlaster', this.make(0xf4ead4, 0.84, 0.01));
    this.materials.set('roofTile', this.make(0xc4513c, 0.72, 0.02));
    this.materials.set('roofSlate', this.make(0x4a6479, 0.7, 0.04));
    this.materials.set('roofTeal', this.make(0x3c8a84, 0.72, 0.02));
    this.materials.set('roadPaint', this.make(0xf0c24f, 0.7, 0));
    this.materials.set('roadLine', this.make(0xf2eee4, 0.7, 0));
    // Warm paper that glows from the bulb inside; double-sided so an open shade reads from any angle.
    // Home walls and ceilings: warm white with a faint self-glow standing in for bounced daylight.
    this.materials.set('interiorPlaster', new THREE.MeshStandardMaterial({ color: 0xf6eedc, emissive: 0x6b5a44, emissiveIntensity: 0.32, roughness: 0.9 }));
    this.materials.set('lampShade', new THREE.MeshStandardMaterial({ color: 0xf6dfb0, emissive: 0xffb45e, emissiveIntensity: 0.6, roughness: 0.85, side: THREE.DoubleSide }));
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
    for (const key of ['warmPlaster', 'terracottaPlaster', 'sagePlaster', 'interiorPlaster', 'pastelYellow', 'pastelBlue', 'pastelPink', 'mintPlaster', 'creamPlaster'] as const) this.get(key).map = plaster;
    for (const key of ['roofTile', 'roofSlate', 'roofTeal'] as const) this.get(key).map = wood;
    this.get('concrete').map = paving;
    // The bay promenade is one long slab: its own repeat keeps bricks about half a metre long.
    const promenadePaving = paving.clone();
    promenadePaving.repeat.set(110, 11);
    promenadePaving.needsUpdate = true;
    this.textures.push(promenadePaving);
    this.get('promenadePaving').map = promenadePaving;
    this.get('wood').map = wood;
    // Height is numerical surface data. Keep its sampling independent of the
    // colour texture's sRGB decoding while sharing the deterministic pattern.
    const plasterHeight = plaster.clone(), woodHeight = wood.clone();
    plasterHeight.colorSpace = woodHeight.colorSpace = THREE.NoColorSpace;
    plasterHeight.needsUpdate = woodHeight.needsUpdate = true;
    this.textures.push(plasterHeight, woodHeight);
    this.get('warmPlaster').bumpMap = plasterHeight; this.get('warmPlaster').bumpScale = .018;
    this.get('terracottaPlaster').bumpMap = plasterHeight; this.get('terracottaPlaster').bumpScale = .018;
    this.get('sagePlaster').bumpMap = plasterHeight; this.get('sagePlaster').bumpScale = .018;
    this.get('wood').bumpMap = woodHeight; this.get('wood').bumpScale = .012;
    const cloth = createClothTextures('cotton');
    this.textures.push(cloth.color, cloth.height);
    this.get('curtainWarm').map = cloth.color;
    this.get('curtainWarm').bumpMap = cloth.height;
    this.get('curtainWarm').bumpScale = .0015;
    for (const [key, material] of this.materials) {
      material.userData.togetherShared = true;
      this.dryColors.set(key, material.color.clone());
      this.dryRoughness.set(key, material.roughness);
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
    const night = 1 - THREE.MathUtils.smoothstep(hour, 5.5, 6.5) + THREE.MathUtils.smoothstep(hour, 18, 19);
    this.get('glass').emissive.set(0xffbd75);
    this.get('glass').emissiveIntensity = THREE.MathUtils.lerp(0.015, 0.55, night);
    this.get('windowGlaze').emissive.set(0xffbd75);
    this.get('windowGlaze').emissiveIntensity = THREE.MathUtils.lerp(0.015, 0.28, night);
    this.get('sign').emissiveIntensity = THREE.MathUtils.lerp(0.08, 0.4, night);
  }

  setWetness(value: number): void {
    this.wetness = THREE.MathUtils.clamp(value, 0, 1);
    for (const key of ['asphalt', 'asphaltPatch', 'concrete', 'stone', 'sandstone', 'promenadePaving'] as const) {
      const material = this.get(key);
      material.color.copy(this.dryColors.get(key)!).multiplyScalar(1 - this.wetness * 0.32);
      material.roughness = Math.max(0.18, this.dryRoughness.get(key)! - this.wetness * 0.6);
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
    this.dryRoughness.clear();
  }

  onDispose(callback: () => void): void { this.disposalCallbacks.push(callback); }

  private make(color: THREE.ColorRepresentation, roughness: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
}
