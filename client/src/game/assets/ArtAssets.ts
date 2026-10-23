import type * as THREE from 'three';
import type { Group } from 'three';
import { AssetLoader } from './AssetLoader';

export type ArtAssetEntry = { url: string; family: string; bytes: number };
export type ArtAssetIndex = { version: 1; assets: Record<string, ArtAssetEntry> };

type IndexFetcher = () => Promise<ArtAssetIndex | null>;
type ModelLoader = Pick<AssetLoader, 'loadModel' | 'clear'>;

const defaultFetcher: IndexFetcher = async () => {
  try {
    const response = await fetch('/assets/index.json', { cache: 'no-cache' });
    if (!response.ok) return null;
    const data = await response.json() as ArtAssetIndex;
    return data?.version === 1 && data.assets ? data : null;
  } catch { return null; }
};

/**
 * Resolves authored GLB art by stable id. Systems ask `tryLoad(id)`; a null result means
 * "no authored asset yet", and the caller keeps its code-built model. Nothing here can break startup.
 */
export class ArtAssets {
  private index: ArtAssetIndex | null = null;
  private ready: Promise<void> | null = null;
  private readonly failed = new Set<string>();

  constructor(private readonly fetchIndex: IndexFetcher = defaultFetcher, private readonly loader: ModelLoader = new AssetLoader()) {}

  /** Reads the asset index once; a missing or invalid index simply means no authored art. */
  load(): Promise<void> {
    this.ready ??= this.fetchIndex().then((index) => { this.index = index; });
    return this.ready;
  }

  has(id: string): boolean { return !!this.index?.assets[id] && !this.failed.has(id); }

  ids(family?: string): string[] {
    return Object.entries(this.index?.assets ?? {}).filter(([id, entry]) => !this.failed.has(id) && (!family || entry.family === family)).map(([id]) => id);
  }

  /** A fresh clone of the authored model, or null when it does not exist or fails to load. */
  async tryLoad(id: string): Promise<Group | null> {
    await this.load();
    const entry = this.index?.assets[id];
    if (!entry || this.failed.has(id)) return null;
    try { return await this.loader.loadModel({ id, url: entry.url, kind: 'model' }); }
    catch { this.failed.add(id); return null; }
  }

  /** Authored model plus its animation clips; null when the loader errors. */
  async tryLoadWithClips(id: string): Promise<{ group: Group; clips: THREE.AnimationClip[] } | null> {
    await this.load();
    const entry = this.index?.assets[id];
    if (!entry || this.failed.has(id)) return null;
    const loader = this.loader as { loadModelWithClips?: (asset: { id: string; url: string; kind: 'model' }) => Promise<{ group: Group; clips: THREE.AnimationClip[] }> };
    if (!loader.loadModelWithClips) return null;
    try { return await loader.loadModelWithClips({ id, url: entry.url, kind: 'model' }); }
    catch { this.failed.add(id); return null; }
  }

  dispose(): void { this.loader.clear(); }
}
