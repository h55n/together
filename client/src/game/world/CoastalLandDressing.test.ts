import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import * as coast from './CoastalShoreline';
import { addChunkDressing } from './NeighborhoodDressing';
import { MaterialLibrary } from './MaterialLibrary';
import { disposeGroup } from './WorldStreamer';
import { createAmayaBayChunkFactory } from './AmayaBayChunkFactory';
import { VegetationSystem, type TreePlacement } from './VegetationSystem';

describe('procedural coastal land dressing', () => {
  it('uses the curved shore and carved stair terrain rather than a flat z cutoff', () => {
    const allows = (coast as unknown as { pointAllowsLandDressing?: (x: number, z: number, margin?: number) => boolean }).pointAllowsLandDressing;
    expect(allows).toBeTypeOf('function');
    expect(allows?.(70, -322, 1)).toBe(false);
    expect(allows?.(70, -298, 1)).toBe(false);
    expect(allows?.(-150, -320, 1)).toBe(true);
    expect(allows?.(70, -270, 1)).toBe(true);
    const edge = coast.shorelineZAt(-150) + 10;
    expect(allows?.(-150, edge + 0.5, 0)).toBe(true);
    expect(allows?.(-150, edge + 0.5, 1)).toBe(false);
    expect(allows?.(NaN, -270, 1)).toBe(false);
    expect(allows?.(70, -270, -1)).toBe(false);
  });

  it('omits loose offshore/foreshore props while retaining ordinary inland dressing', () => {
    const materials = new MaterialLibrary(), root = new THREE.Group();
    try {
      addChunkDressing(root, { buildings: [], props: [
        { id: 'offshore', kind: 'lamp', x: 70, z: -322, rotationY: 0, scale: 1 },
        { id: 'stairs', kind: 'bicycle', x: 70, z: -298, rotationY: 0, scale: 1 },
        { id: 'outer-land', kind: 'bench', x: -150, z: -320, rotationY: 0, scale: 1 },
        { id: 'inland', kind: 'bin', x: 70, z: -270, rotationY: 0, scale: 1 },
      ] }, 0, 0, 'active', materials);
      expect(root.getObjectByName('prop:lamp:offshore')).toBeUndefined();
      expect(root.getObjectByName('prop:bicycle:stairs')).toBeUndefined();
      expect(root.getObjectByName('prop:bench:outer-land')).toBeDefined();
      expect(root.getObjectByName('prop:bin:inland')).toBeDefined();
    } finally { disposeGroup(root); materials.dispose(); }
  });
  it('keeps compiled random tree roots on supported land in coastal chunks', () => {
    const captured: TreePlacement[] = [];
    const trees = vi.spyOn(VegetationSystem.prototype, 'prepareTreeCluster').mockImplementation(function* (placements: readonly TreePlacement[]): Generator<void, THREE.Group, void> {
      captured.push(...placements);
      yield;
      return new THREE.Group();
    });
    const materials = new MaterialLibrary();
    try {
      const factory = createAmayaBayChunkFactory(materials);
      for (const [x, z] of [[0, -3], [1, -3], [1, -2], [-3, 1]] as const) {
        const root = factory(x, z, 'visual', 'far');
        disposeGroup(root);
      }
      expect(captured.length).toBeGreaterThan(0);
      for (const { position } of captured) {
        expect(position.z - 1.5).toBeGreaterThanOrEqual(coast.shorelineZAt(position.x) + 10);
        expect(coast.coastalTerrainLowering(position.x, position.z - 1.5)).toBeLessThanOrEqual(0.05);
      }
    } finally { trees.mockRestore(); materials.dispose(); }
  });
});
