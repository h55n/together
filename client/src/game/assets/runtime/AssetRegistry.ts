import * as THREE from 'three';

export type CompiledAsset = {
  assetId: string;
  root: THREE.Object3D;
};

export type AssetRegistryMetrics = {
  compiledAssets: number;
  placements: number;
};

export class AssetRegistry {
  private readonly compiled = new Map<string, CompiledAsset>();
  private readonly placementAssets = new Map<string, string>();

  constructor(private readonly compile: (assetId: string) => CompiledAsset) {}

  acquire(assetId: string): CompiledAsset {
    let asset = this.compiled.get(assetId);
    if (!asset) {
      asset = this.compile(assetId);
      if (asset.assetId !== assetId) throw new Error(`Compiled asset id mismatch: expected ${assetId}, received ${asset.assetId}`);
      markShared(asset.root);
      this.compiled.set(assetId, asset);
    }
    return asset;
  }

  trackPlacement(placementId: string, assetId: string): void {
    if (!this.compiled.has(assetId)) throw new Error(`Cannot place an uncompiled asset: ${assetId}`);
    this.placementAssets.set(placementId, assetId);
  }

  releasePlacement(placementId: string): void {
    this.placementAssets.delete(placementId);
  }

  metrics(): AssetRegistryMetrics {
    return { compiledAssets: this.compiled.size, placements: this.placementAssets.size };
  }

  dispose(): void {
    for (const asset of this.compiled.values()) {
      asset.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
      });
    }
    this.compiled.clear();
    this.placementAssets.clear();
  }
}

function markShared(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    object.geometry.userData.togetherShared = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.userData.togetherShared = true;
  });
}
