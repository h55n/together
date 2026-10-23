import type { Group } from 'three';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export type AssetRecord = { id: string; url: string; kind: 'model' | 'texture' };

export class AssetLoader {
  private readonly gltf = new GLTFLoader();
  private readonly modelCache = new Map<string, Group>();
  private readonly clipCache = new Map<string, THREE.AnimationClip[]>();

  async loadModel(asset: AssetRecord): Promise<Group> {
    if (asset.kind !== 'model') throw new Error(`Asset ${asset.id} is not a model`);
    const cached = this.modelCache.get(asset.id);
    if (cached) return cloneSkinned(cached) as Group;
    const gltf = await this.gltf.loadAsync(asset.url);
    this.modelCache.set(asset.id, gltf.scene);
    this.clipCache.set(asset.id, gltf.animations);
    return cloneSkinned(gltf.scene) as Group;
  }

  /** Same cache as loadModel, but also returns the file's animation clips (skinned character artwork). */
  async loadModelWithClips(asset: AssetRecord): Promise<{ group: Group; clips: THREE.AnimationClip[] }> {
    if (asset.kind !== 'model') throw new Error(`Asset ${asset.id} is not a model`);
    const cached = this.modelCache.get(asset.id);
    if (cached) return { group: cloneSkinned(cached) as Group, clips: this.clipCache.get(asset.id) ?? [] };
    const gltf = await this.gltf.loadAsync(asset.url);
    this.modelCache.set(asset.id, gltf.scene);
    this.clipCache.set(asset.id, gltf.animations);
    return { group: cloneSkinned(gltf.scene) as Group, clips: gltf.animations };
  }

  clear(): void {
    this.modelCache.clear();
    this.clipCache.clear();
  }
}
