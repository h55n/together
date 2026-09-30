import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from './MaterialLibrary';

describe('weathered world materials', () => {
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
