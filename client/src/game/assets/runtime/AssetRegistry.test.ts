import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssetRegistry } from './AssetRegistry';

describe('AssetRegistry', () => {
  it('compiles an asset key once while tracking independent placements', () => {
    let compilations = 0;
    const registry = new AssetRegistry((assetId) => {
      compilations += 1;
      return { assetId, root: new THREE.Group() };
    });

    const compiled = registry.acquire('tree:rain_tree:0:lod0');
    expect(registry.acquire('tree:rain_tree:0:lod0')).toBe(compiled);
    registry.trackPlacement('chunk:0:0:tree:1', compiled.assetId);
    registry.trackPlacement('chunk:0:0:tree:2', compiled.assetId);

    expect(compilations).toBe(1);
    expect(registry.metrics()).toMatchObject({ compiledAssets: 1, placements: 2 });
  });

  it('releases placement ownership without disposing a shared compiled asset', () => {
    const registry = new AssetRegistry((assetId) => ({ assetId, root: new THREE.Group() }));
    registry.acquire('tree:rain_tree:0:lod0');
    registry.trackPlacement('chunk:0:0:tree:1', 'tree:rain_tree:0:lod0');
    registry.releasePlacement('chunk:0:0:tree:1');

    expect(registry.metrics()).toMatchObject({ compiledAssets: 1, placements: 0 });
  });
});
