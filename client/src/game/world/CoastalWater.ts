import * as THREE from 'three';
import { shorelineZAt } from './CoastalShoreline';
import type { MaterialLibrary } from './MaterialLibrary';

/** A coastal surface whose landward edge follows the authored steps and cove. */
export class CoastalWater {
  readonly mesh: THREE.Mesh;
  private readonly foam: THREE.Mesh;
  private elapsed = 0;

  constructor(scene: THREE.Scene, materials: MaterialLibrary) {
    const geometry = new THREE.PlaneGeometry(1500, 900, 120, 72);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const shallow = new THREE.Color(0x8fbdb5), deep = new THREE.Color(0x356f8b), tint = new THREE.Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const shoreFraction = (positions.getZ(i) + 450) / 900;
      positions.setZ(i, -1250 + shoreFraction * (shorelineZAt(x) + 1250));
      const depth = shorelineZAt(x) - positions.getZ(i);
      tint.copy(shallow).lerp(deep, 1 - Math.exp(-depth / 150));
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    this.mesh = new THREE.Mesh(geometry, materials.get('water'));
    this.mesh.position.set(0, -0.05, 0);
    this.mesh.name = 'coastal-water';
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    const foamPositions: number[] = [], foamColors: number[] = [];
    for (let i = 0; i < 180; i += 1) {
      const x = -450 + i * 5;
      const width = 0.28 + (Math.sin(i * 2.7) + 1) * 0.18;
      const corners = [[x, 0], [x + 3.8, 0], [x + 3.8, width], [x, width]];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const [xx, offset] = corners[index]!;
        foamPositions.push(xx!, 0, shorelineZAt(xx!) - 0.9 - offset!);
        const value = 0.62 + (Math.sin(i * 1.9) + 1) * 0.16;
        foamColors.push(value, value, value * 0.94);
      }
    }
    const foamGeometry = new THREE.BufferGeometry();
    foamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
    foamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(foamColors, 3));
    foamGeometry.computeVertexNormals();
    this.foam = new THREE.Mesh(foamGeometry, new THREE.MeshBasicMaterial({ color: 0xe6f1df, vertexColors: true, transparent: true, opacity: 0.48, depthWrite: false }));
    this.foam.name = 'coastal-shore-foam';
    scene.add(this.foam);
  }

  update(delta: number, wetness: number, animateGeometry = true): void {
    this.elapsed += delta;
    if (!animateGeometry) return;
    const positions = this.mesh.geometry.getAttribute('position');
    const normals = this.mesh.geometry.getAttribute('normal');
    const amplitude = 0.045 + wetness * 0.025;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const broadPhase = x * 0.095 + z * 0.16 + this.elapsed * 0.7;
      const ripplePhase = z * 0.42 - this.elapsed * 0.9;
      positions.setY(i, Math.sin(broadPhase) * amplitude + Math.sin(ripplePhase) * 0.018);
      const dx = Math.cos(broadPhase) * 0.095 * amplitude;
      const dz = Math.cos(broadPhase) * 0.16 * amplitude + Math.cos(ripplePhase) * 0.42 * 0.018;
      const inverseLength = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
      normals.setXYZ(i, -dx * inverseLength, inverseLength, -dz * inverseLength);
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
    const foamPositions = this.foam.geometry.getAttribute('position');
    for (let i = 0; i < foamPositions.count; i += 1) {
      const x = foamPositions.getX(i), z = foamPositions.getZ(i);
      foamPositions.setY(i, -0.05 + Math.sin(x * 0.095 + z * 0.16 + this.elapsed * 0.7) * amplitude
        + Math.sin(z * 0.42 - this.elapsed * 0.9) * 0.018 + 0.015);
    }
    foamPositions.needsUpdate = true;
    (this.foam.material as THREE.MeshBasicMaterial).opacity = 0.36 + 0.12 * Math.sin(this.elapsed * 0.55) ** 2 + wetness * 0.1;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.foam.removeFromParent();
    this.foam.geometry.dispose();
    (this.foam.material as THREE.Material).dispose();
  }
}
