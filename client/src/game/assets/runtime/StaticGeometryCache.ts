import * as THREE from 'three';

export class StaticGeometryCache {
  private readonly geometries = new Map<string, THREE.BoxGeometry>();

  box(width: number, height: number, depth: number): THREE.BoxGeometry {
    const key = `${width}:${height}:${depth}`;
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = new THREE.BoxGeometry(width, height, depth);
      geometry.userData.togetherShared = true;
      this.geometries.set(key, geometry);
    }
    return geometry;
  }

  metrics(): { geometries: number } {
    return { geometries: this.geometries.size };
  }

  dispose(): void {
    for (const geometry of this.geometries.values()) geometry.dispose();
    this.geometries.clear();
  }
}
