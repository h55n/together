import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CoastalSky } from './CoastalSky';

function cloudsOf(sky: CoastalSky): THREE.InstancedMesh {
  return sky.root.getObjectByName('painted-coastal-clouds') as THREE.InstancedMesh;
}

describe('painted coastal cloud composition', () => {
  it('lets opaque lobes occlude each other while retaining a depth-free background dome', () => {
    const sky = new CoastalSky(new THREE.Scene());
    try {
      const clouds = cloudsOf(sky), material = clouds.material as THREE.MeshBasicMaterial;
      expect(material.transparent).toBe(false);
      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(true);
      expect(material.fog).toBe(false);
      expect(material.toneMapped).toBe(false);
      const dome = sky.root.children.find(child => child !== clouds) as THREE.Mesh;
      expect((dome.material as THREE.MeshBasicMaterial).depthWrite).toBe(false);
      expect(dome.renderOrder).toBeLessThan(clouds.renderOrder);
      expect(clouds.renderOrder).toBeLessThan(0);
    } finally { sky.dispose(); }
  });

  it('varies cluster shapes repeatably without increasing instance or geometry counts', () => {
    const first = new CoastalSky(new THREE.Scene()), second = new CoastalSky(new THREE.Scene());
    const authored = new THREE.IcosahedronGeometry(1, 2);
    try {
      const clouds = cloudsOf(first), other = cloudsOf(second);
      expect(clouds.count).toBe(28 * 12);
      expect(first.root.children.filter(child => child instanceof THREE.InstancedMesh)).toHaveLength(1);
      expect(Array.from(clouds.geometry.getAttribute('position').array)).toEqual(Array.from(authored.getAttribute('position').array));
      expect(clouds.geometry.index?.array).toEqual(authored.index?.array);
      expect(Array.from(clouds.instanceMatrix.array)).toEqual(Array.from(other.instanceMatrix.array));
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
      const widths = new Set<string>();
      for (let cluster = 0; cluster < 28; cluster++) {
        clouds.getMatrixAt(cluster * 12, matrix);
        matrix.decompose(position, rotation, scale);
        widths.add(scale.x.toFixed(3));
      }
      expect(widths.size).toBeGreaterThanOrEqual(21);
      expect(Array.from(clouds.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      clouds.computeBoundingBox();
      // Cloud depth belongs to elevated cloud volumes, never an opaque sky
      // dome at the horizon that could mask foreground streets/buildings.
      expect(clouds.boundingBox!.min.y).toBeGreaterThan(50);
      expect(clouds.boundingBox!.max.y).toBeLessThan(155);
    } finally { first.dispose(); second.dispose(); authored.dispose(); }
  });

  it('shades undersides a light lavender-blue rather than dark grey sphere bottoms', () => {
    const sky = new CoastalSky(new THREE.Scene());
    try {
      const clouds = cloudsOf(sky), positions = clouds.geometry.getAttribute('position'), colors = clouds.geometry.getAttribute('color');
      let undersideCount = 0;
      for (let i = 0; i < positions.count; i++) {
        const rgb = [colors.getX(i), colors.getY(i), colors.getZ(i)];
        expect(rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
        if (positions.getY(i) < -0.75) {
          undersideCount++;
          // Painterly cumulus: cool but light, with blue the strongest channel.
          expect(Math.min(...rgb)).toBeGreaterThan(0.3);
          expect(rgb[2]).toBeGreaterThanOrEqual(Math.max(rgb[0]!, rgb[1]!));
        }
      }
      expect(undersideCount).toBeGreaterThan(0);
    } finally { sky.dispose(); }
  });

  it('retains smooth day/dusk/rain tint updates without rewriting the cloud instances', () => {
    const sky = new CoastalSky(new THREE.Scene());
    try {
      const clouds = cloudsOf(sky), before = Array.from(clouds.instanceMatrix.array);
      const material = clouds.material as THREE.MeshBasicMaterial;
      for (const hour of [0, 5, 6.5, 9, 15, 17.8, 19.1, 21, 24]) {
        sky.update(hour * 60 - 0.001, new THREE.Vector3(12, 0, -80), 0.5);
        const color = material.color.clone();
        sky.update(hour * 60 + 0.001, new THREE.Vector3(12, 0, -80), 0.5);
        expect(Math.max(Math.abs(color.r - material.color.r), Math.abs(color.g - material.color.g), Math.abs(color.b - material.color.b))).toBeLessThan(0.001);
      }
      sky.update(17.8 * 60, new THREE.Vector3(12, 0, -80), 1);
      expect(Array.from(clouds.instanceMatrix.array)).toEqual(before);
      expect(sky.root.position.toArray()).toEqual([12, 0, -80]);
    } finally { sky.dispose(); }
  });

  it('releases owned cloud/dome resources once without leaving the sky in the scene', () => {
    const scene = new THREE.Scene(), sky = new CoastalSky(scene);
    const clouds = cloudsOf(sky), dome = sky.root.children.find(child => child !== clouds) as THREE.Mesh;
    const resources: Array<{ addEventListener(type: 'dispose', listener: () => void): void }> = [clouds, clouds.geometry, clouds.material as THREE.Material, dome.geometry, dome.material as THREE.Material];
    const releases = resources.map(resource => { const released = vi.fn(); resource.addEventListener('dispose', released); return released; });
    sky.dispose();
    expect(scene.children).not.toContain(sky.root);
    for (const released of releases) expect(released).toHaveBeenCalledOnce();
  });
});
