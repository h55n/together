import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type AssetRecord = { id: string; url: string; kind: 'model' | 'texture' };

export class AssetLoader {
  private readonly gltf = new GLTFLoader();
  private readonly modelCache = new Map<string, THREE.Group>();

  async loadModel(asset: AssetRecord): Promise<THREE.Group> {
    if (asset.kind !== 'model') throw new Error(`Asset ${asset.id} is not a model`);
    const cached = this.modelCache.get(asset.id);
    if (cached) return cached.clone(true);
    const gltf = await this.gltf.loadAsync(asset.url);
    this.modelCache.set(asset.id, gltf.scene);
    return gltf.scene.clone(true);
  }

  clear(): void {
    this.modelCache.clear();
  }
}
