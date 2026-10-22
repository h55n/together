import * as THREE from 'three';

export type SpatialBatchOptions = { cellSize?: number; minVertices?: number };

export function geometryCellSize(geometry: THREE.BufferGeometry, options: SpatialBatchOptions): number | undefined {
  return (geometry.getAttribute('position')?.count ?? 0) >= (options.minVertices ?? 0) ? options.cellSize : undefined;
}

export function validateCellSize(cellSize: number | undefined): void {
  if (cellSize !== undefined && (!Number.isFinite(cellSize) || cellSize <= 0)) throw new Error('Batch cell size must be finite and positive');
}

export function spatialCellKey(position: { x: number; z: number }, cellSize: number | undefined): string {
  return cellSize === undefined ? '' : `${Math.floor(position.x / cellSize)},${Math.floor(position.z / cellSize)}`;
}

/** Geometry has already been transformed into the owning root's coordinates. */
export function* prepareGeometryCellKey(geometry: THREE.BufferGeometry, cellSize: number | undefined): Generator<void, string, void> {
  if (cellSize === undefined) return '';
  if (!geometry.boundingBox) {
    const positions = geometry.getAttribute('position');
    const box = new THREE.Box3(), point = new THREE.Vector3();
    for (let start = 0; start < positions.count; start += 2048) {
      for (let index = start; index < Math.min(positions.count, start + 2048); index++) box.expandByPoint(point.fromBufferAttribute(positions, index));
      yield;
    }
    geometry.boundingBox = box;
  }
  return spatialCellKey(geometry.boundingBox.getCenter(new THREE.Vector3()), cellSize);
}
