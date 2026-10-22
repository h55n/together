import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LightingSystem } from './LightingSystem';

describe('LightingSystem', () => {
  it.each([5, 7, 17, 18.75, 19.5, 22.5, 24])('keeps sky and fog colours continuous across %s:00', hour => {
    const scene = new THREE.Scene();
    const lighting = new LightingSystem(scene);
    const focus = new THREE.Vector3(0, 1.7, 0);
    try {
      lighting.update(hour * 60 - 0.001, focus);
      const sky = lighting.sky.color.clone();
      const fog = (scene.fog as THREE.FogExp2).color.clone();
      lighting.update(hour * 60 + 0.001, focus);
      const difference = (a: THREE.Color, b: THREE.Color) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
      expect(difference(sky, lighting.sky.color)).toBeLessThan(0.001);
      expect(difference(fog, (scene.fog as THREE.FogExp2).color)).toBeLessThan(0.001);
    } finally { lighting.dispose(); }
  });
  it('applies shadow quality without reallocating unchanged targets', () => {
    const lighting = new LightingSystem(new THREE.Scene());
    lighting.setShadowScale(0.7);
    const size = lighting.sun.shadow.mapSize.x;
    expect(size).toBeLessThan(2048);
    const target = new THREE.WebGLRenderTarget(size, size);
    lighting.sun.shadow.map = target;
    let disposed = 0;
    target.addEventListener('dispose', () => { disposed++; });
    lighting.setShadowScale(0.7);
    expect(disposed).toBe(0);
    lighting.setShadowScale(1);
    expect(disposed).toBe(1);
    expect(lighting.sun.shadow.map).toBeNull();
    expect(lighting.sun.shadow.mapSize.x).toBe(2048);
    lighting.dispose();
  });
  it('changes the visible sky and fog palette across the day', () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const lighting = new LightingSystem(scene);
    const focus = new THREE.Vector3(0, 1.7, 0);

    lighting.update(12 * 60, focus);
    const middayBackground = (scene.background as THREE.Color).getHex();
    const middayFog = scene.fog instanceof THREE.FogExp2 ? scene.fog.color.getHex() : null;
    const middayDensity = scene.fog instanceof THREE.FogExp2 ? scene.fog.density : null;

    lighting.update(18 * 60, focus);
    const goldenBackground = (scene.background as THREE.Color).getHex();

    lighting.update(2 * 60, focus);
    const nightBackground = (scene.background as THREE.Color).getHex();
    const nightFog = scene.fog instanceof THREE.FogExp2 ? scene.fog.color.getHex() : null;
    const nightDensity = scene.fog instanceof THREE.FogExp2 ? scene.fog.density : null;

    expect(goldenBackground).not.toBe(middayBackground);
    expect(nightBackground).not.toBe(middayBackground);
    expect(nightFog).not.toBe(middayFog);
    expect(nightDensity).toBeGreaterThan(middayDensity ?? 0);
    expect(lighting.sun.shadow.normalBias).toBeGreaterThan(0);
  });
});
