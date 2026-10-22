import * as THREE from 'three';
import { COASTAL_WATERLINE_Y } from '@together/shared';
import { shorelineZAt } from './CoastalShoreline';
import type { MaterialLibrary } from './MaterialLibrary';

/** A coastal surface whose landward edge follows the authored steps and cove. */
export class CoastalWater {
  readonly mesh: THREE.Mesh;
  private readonly foam: THREE.Mesh;
  private readonly waveBasis: Float32Array;
  private readonly foamBasis: Float32Array;
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
    this.waveBasis = waveBasis(positions);
    (positions as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    (geometry.getAttribute('normal') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.mesh = new THREE.Mesh(geometry, materials.get('water'));
    this.mesh.position.set(0, COASTAL_WATERLINE_Y, 0);
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
    const foamAttribute = foamGeometry.getAttribute('position');
    this.foamBasis = waveBasis(foamAttribute);
    (foamAttribute as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.foam = new THREE.Mesh(foamGeometry, new THREE.MeshBasicMaterial({ color: 0xe6f1df, vertexColors: true, transparent: true, opacity: 0.48, depthWrite: false }));
    this.foam.name = 'coastal-shore-foam';
    scene.add(this.foam);
  }

  update(delta: number, wetness: number, animateGeometry = true): void {
    this.elapsed += Number.isFinite(delta) ? Math.max(0, delta) : 0;
    if (!animateGeometry) return;
    const rain = Number.isFinite(wetness) ? THREE.MathUtils.clamp(wetness, 0, 1) : 0;
    const positions = this.mesh.geometry.getAttribute('position');
    const normals = this.mesh.geometry.getAttribute('normal');
    const amplitude = 0.045 + rain * 0.025;
    const broadSin = Math.sin(this.elapsed * 0.7), broadCos = Math.cos(this.elapsed * 0.7);
    const rippleSin = Math.sin(-this.elapsed * 0.9), rippleCos = Math.cos(-this.elapsed * 0.9);
    const positionArray = positions.array as Float32Array, normalArray = normals.array as Float32Array;
    for (let i = 0; i < positions.count; i += 1) {
      const basis = i * 4, vertex = i * 3;
      const broad = this.waveBasis[basis]! * broadCos + this.waveBasis[basis + 1]! * broadSin;
      const ripple = this.waveBasis[basis + 2]! * rippleCos + this.waveBasis[basis + 3]! * rippleSin;
      const broadSlope = this.waveBasis[basis + 1]! * broadCos - this.waveBasis[basis]! * broadSin;
      const rippleSlope = this.waveBasis[basis + 3]! * rippleCos - this.waveBasis[basis + 2]! * rippleSin;
      positionArray[vertex + 1] = broad * amplitude + ripple * 0.018;
      const dx = broadSlope * 0.095 * amplitude;
      const dz = broadSlope * 0.16 * amplitude + rippleSlope * 0.42 * 0.018;
      const inverseLength = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
      normalArray[vertex] = -dx * inverseLength;
      normalArray[vertex + 1] = inverseLength;
      normalArray[vertex + 2] = -dz * inverseLength;
    }
    positions.needsUpdate = true;
    normals.needsUpdate = true;
    const foamPositions = this.foam.geometry.getAttribute('position');
    const foamArray = foamPositions.array as Float32Array;
    for (let i = 0; i < foamPositions.count; i += 1) {
      const basis = i * 4;
      const broad = this.foamBasis[basis]! * broadCos + this.foamBasis[basis + 1]! * broadSin;
      const ripple = this.foamBasis[basis + 2]! * rippleCos + this.foamBasis[basis + 3]! * rippleSin;
      foamArray[i * 3 + 1] = -0.035 + broad * amplitude + ripple * 0.018;
    }
    foamPositions.needsUpdate = true;
    (this.foam.material as THREE.MeshBasicMaterial).opacity = 0.36 + 0.12 * Math.sin(this.elapsed * 0.55) ** 2 + rain * 0.1;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.foam.removeFromParent();
    this.foam.geometry.dispose();
    (this.foam.material as THREE.Material).dispose();
  }
}

/** Shoreline x/z coordinates are fixed; cache their phases once, then rotate by time. */
function waveBasis(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  const basis = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    const broad = positions.getX(i) * 0.095 + positions.getZ(i) * 0.16;
    const ripple = positions.getZ(i) * 0.42;
    basis[i * 4] = Math.sin(broad); basis[i * 4 + 1] = Math.cos(broad);
    basis[i * 4 + 2] = Math.sin(ripple); basis[i * 4 + 3] = Math.cos(ripple);
  }
  return basis;
}
