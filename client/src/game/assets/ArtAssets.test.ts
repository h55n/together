import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ArtAssets, type ArtAssetIndex } from './ArtAssets';

const index: ArtAssetIndex = { version: 1, assets: {
  body_average: { url: '/assets/models/characters/body_average.glb', family: 'characters', bytes: 1000 },
  tree_palm: { url: '/assets/models/vegetation/tree_palm.glb', family: 'vegetation', bytes: 2000 },
} };

describe('authored art resolver', () => {
  it('reports no art and returns null when the index is missing, so callers keep their fallback', async () => {
    const loadModel = vi.fn();
    const art = new ArtAssets(async () => null, { loadModel, clear: vi.fn() });
    expect(await art.tryLoad('body_average')).toBeNull();
    expect(art.has('body_average')).toBe(false);
    expect(loadModel).not.toHaveBeenCalled();
  });

  it('loads a known id once the index is read and lists ids by family', async () => {
    const model = new THREE.Group();
    const loadModel = vi.fn(async () => model);
    const art = new ArtAssets(async () => index, { loadModel, clear: vi.fn() });
    expect(await art.tryLoad('body_average')).toBe(model);
    expect(loadModel).toHaveBeenCalledWith({ id: 'body_average', url: '/assets/models/characters/body_average.glb', kind: 'model' });
    expect(art.ids('vegetation')).toEqual(['tree_palm']);
    expect(await art.tryLoad('unknown_id')).toBeNull();
  });

  it('stops offering an asset whose file fails to load instead of retrying every frame', async () => {
    const loadModel = vi.fn(async () => { throw new Error('bad glb'); });
    const art = new ArtAssets(async () => index, { loadModel, clear: vi.fn() });
    expect(await art.tryLoad('tree_palm')).toBeNull();
    expect(art.has('tree_palm')).toBe(false);
    expect(await art.tryLoad('tree_palm')).toBeNull();
    expect(loadModel).toHaveBeenCalledTimes(1);
  });
});
