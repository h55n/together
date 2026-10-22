import { describe, expect, it, vi } from 'vitest';
import { MaterialLibrary } from './MaterialLibrary';
import * as THREE from 'three';

describe('weathered world materials', () => {
  it.each([6, 18.5, 24])('fades window and sign lights continuously across %s:00', hour => {
    const materials = new MaterialLibrary();
    try {
      materials.setTime(hour * 60 - 0.001);
      const before = ['glass', 'windowGlaze', 'sign'].map(key => materials.get(key as 'glass' | 'windowGlaze' | 'sign').emissiveIntensity);
      materials.setTime(hour * 60 + 0.001);
      for (const [index, key] of (['glass', 'windowGlaze', 'sign'] as const).entries()) {
        expect(Math.abs(materials.get(key).emissiveIntensity - before[index]!)).toBeLessThan(0.001);
      }
      materials.setTime(13 * 60);
      const day = materials.get('glass').emissiveIntensity;
      materials.setTime(23 * 60);
      expect(materials.get('glass').emissiveIntensity).toBeGreaterThan(day);
    } finally { materials.dispose(); }
  });
  it('restores each authored roughness exactly after rain dries', () => {
    const materials = new MaterialLibrary();
    const keys = ['asphalt', 'asphaltPatch', 'concrete', 'stone', 'sandstone'] as const;
    const dryValues = keys.map(key => materials.get(key).roughness);
    for (const [index, key] of keys.entries()) {
      materials.setWetness(1);
      materials.setWetness(0);
      expect(materials.get(key).roughness).toBe(dryValues[index]);
    }
    materials.dispose();
  });
  it('uses linear height data for relief separately from sRGB surface colour', () => {
    const materials = new MaterialLibrary();
    const plaster = materials.get('warmPlaster');
    expect(plaster.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(plaster.bumpMap?.colorSpace).toBe(THREE.NoColorSpace);
    expect(plaster.bumpMap).not.toBe(plaster.map);
    expect(materials.get('sagePlaster').bumpMap).toBe(plaster.bumpMap);
    const disposed = vi.fn();
    plaster.bumpMap?.addEventListener('dispose', disposed);
    materials.dispose();
    expect(disposed).toHaveBeenCalledOnce();
  });
  it('darkens porous surfaces in rain and restores their exact dry colour', () => {
    const materials = new MaterialLibrary();
    const asphalt = materials.get('asphalt');
    const dry = asphalt.color.clone();
    materials.setWetness(1);
    expect(asphalt.color.r).toBeLessThan(dry.r);
    materials.setWetness(0);
    expect(asphalt.color.equals(dry)).toBe(true);
    materials.dispose();
  });
  it('shares deterministic surface textures and releases them with the library', () => {
    const materials = new MaterialLibrary();
    const texture = materials.get('asphalt').map;
    expect(texture).not.toBeNull();
    expect(materials.get('asphalt').map).toBe(texture);
    let disposed = false;
    texture?.addEventListener('dispose', () => { disposed = true; });
    materials.dispose();
    expect(disposed).toBe(true);
  });
});
