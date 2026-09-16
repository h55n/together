import { describe, expect, it } from 'vitest';
import { propertyRoofSpec } from './propertyShell';

describe('propertyRoofSpec', () => {
  it('clears the player camera and overhangs the couple studio walls', () => {
    const roof = propertyRoofSpec(11, 9, 3);
    expect(roof.width).toBeGreaterThan(11);
    expect(roof.depth).toBeGreaterThan(9);
    expect(roof.centerY).toBeGreaterThan(3);
    expect(roof.thickness).toBeGreaterThanOrEqual(0.16);
  });

  it('scales with larger architectural shells', () => {
    const small = propertyRoofSpec(11, 9, 3);
    const large = propertyRoofSpec(18, 15, 3);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.depth).toBeGreaterThan(small.depth);
    expect(large.centerY).toBe(small.centerY);
  });
});
