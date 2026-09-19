import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LightingSystem } from './LightingSystem';

describe('LightingSystem', () => {
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
