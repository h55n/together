import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import {
  cityHeightAt,
  furnitureById,
  layoutRoomZone,
  mapRoomPlacementToShell,
  starterPropertyById,
  type FurnitureDefinition,
  type Placement2D,
} from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary } from './MaterialLibrary';
import { PROPERTY_WORLD_PLACEMENTS } from './PropertyLocations';

export type HomeObjectView = {
  objectId: string;
  definitionId: string;
  roomId: string;
  transform: {
    position: { x: number; y: number; z: number };
    rotationY: number;
    scale: number;
  };
};

type RenderedFurniture = { group: THREE.Group; collider: RAPIER.Collider | null };

/**
 * Development furniture renderer. Save transforms remain room-local; this maps
 * them into the authored property shell so persistence is independent of city coordinates.
 * Final GLB assets can replace buildFurnitureVisual without changing save data.
 */
export class HomeDecorationRenderer {
  readonly root = new THREE.Group();
  private readonly rendered = new Map<string, RenderedFurniture>();
  private preview: THREE.Group | null = null;
  private readonly surfaceVisuals = new Map<string, THREE.Object3D>();

  constructor(
    private readonly propertyId: string,
    private readonly center: { x: number; z: number },
    private readonly materials: MaterialLibrary,
    private readonly physics: PhysicsWorld,
  ) {
    this.root.name = `home-decor:${propertyId}`;
    this.root.position.y = cityHeightAt(center.x, center.z);
  }

  sync(objects: readonly HomeObjectView[], surfaces: Readonly<Record<string, string>> = {}): void {
    const nextIds = new Set(objects.map((object) => object.objectId));
    for (const [id, rendered] of this.rendered) {
      if (nextIds.has(id)) continue;
      this.removeRendered(rendered);
      this.rendered.delete(id);
    }
    for (const object of objects) this.upsert(object);
    this.syncSurfaces(surfaces);
  }

  setPreview(definitionId: string, roomId: string, placement: Placement2D): void {
    this.clearPreview();
    const definition = furnitureById(definitionId);
    if (!definition) return;
    const world = this.toWorld(roomId, placement);
    if (!world) return;
    const group = buildFurnitureVisual(definition, this.materials, true);
    group.position.set(world.x, 0.02, world.z);
    group.rotation.y = placement.rotationY;
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = clonePreviewMaterial(object.material);
    });
    this.preview = group;
    this.root.add(group);
  }

  clearPreview(): void {
    if (!this.preview) return;
    this.root.remove(this.preview);
    disposePreviewMaterials(this.preview);
    disposeGeometries(this.preview);
    this.preview = null;
  }

  dispose(): void {
    this.clearPreview();
    for (const rendered of this.rendered.values()) this.removeRendered(rendered);
    this.rendered.clear();
    for (const object of this.surfaceVisuals.values()) { this.root.remove(object); disposeGeometries(object); disposeOwnedMaterials(object); }
    this.surfaceVisuals.clear();
  }


  private syncSurfaces(surfaces: Readonly<Record<string, string>>): void {
    const next = new Set(Object.keys(surfaces));
    for (const [id, visual] of this.surfaceVisuals) {
      if (next.has(id)) continue;
      this.root.remove(visual); disposeGeometries(visual); disposeOwnedMaterials(visual); this.surfaceVisuals.delete(id);
    }
    const property = starterPropertyById(this.propertyId);
    if (!property) return;
    const shell = PROPERTY_WORLD_PLACEMENTS[property.id];
    for (const [surfaceId, finishId] of Object.entries(surfaces)) {
      if (this.surfaceVisuals.has(surfaceId)) continue;
      const roomId = surfaceId.split(':')[0] ?? '';
      const room = property.roomBounds[roomId];
      if (!room) continue;
      const zone = layoutRoomZone(property, roomId, shell.width, shell.depth);
      const color = finishColor(finishId);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
      material.userData.togetherSurface = true;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, zone.maxX - zone.minX), 2.45, 0.035), material);
      panel.position.set(this.center.x + (zone.minX + zone.maxX) / 2, 1.225, this.center.z + zone.maxZ - 0.03);
      panel.receiveShadow = true;
      panel.name = `surface:${surfaceId}:${finishId}`;
      this.root.add(panel); this.surfaceVisuals.set(surfaceId, panel);
    }
  }

  private upsert(object: HomeObjectView): void {
    const definition = furnitureById(object.definitionId);
    if (!definition) return;
    const roomPlacement: Placement2D = {
      x: object.transform.position.x,
      z: object.transform.position.z,
      rotationY: object.transform.rotationY,
    };
    const world = this.toWorld(object.roomId, roomPlacement);
    if (!world) return;
    const existing = this.rendered.get(object.objectId);
    if (existing) {
      existing.group.position.set(world.x, object.transform.position.y, world.z);
      existing.group.rotation.y = object.transform.rotationY;
      existing.group.scale.setScalar(object.transform.scale);
      if (existing.collider) this.physics.removeCollider(existing.collider);
      existing.collider = this.createCollider(definition, world.x, world.z, object.transform.position.y, object.transform.rotationY, object.transform.scale);
      return;
    }
    const group = buildFurnitureVisual(definition, this.materials, false);
    group.name = `furniture:${object.objectId}:${object.definitionId}`;
    group.position.set(world.x, object.transform.position.y, world.z);
    group.rotation.y = object.transform.rotationY;
    group.scale.setScalar(object.transform.scale);
    this.root.add(group);
    const collider = this.createCollider(definition, world.x, world.z, object.transform.position.y, object.transform.rotationY, object.transform.scale);
    this.rendered.set(object.objectId, { group, collider });
  }

  private createCollider(
    definition: FurnitureDefinition,
    x: number,
    z: number,
    y: number,
    rotationY: number,
    scale: number,
  ): RAPIER.Collider | null {
    // Rotation-aware authoritative overlap validation happens server-side. Runtime
    // collider is a conservative cuboid sized to the placed footprint.
    const cos = Math.abs(Math.cos(rotationY));
    const sin = Math.abs(Math.sin(rotationY));
    const width = (definition.footprint.width * cos + definition.footprint.depth * sin) * scale;
    const depth = (definition.footprint.width * sin + definition.footprint.depth * cos) * scale;
    const height = furnitureHeight(definition) * scale;
    return this.physics.createFixedCuboid(
      { x, y: this.root.position.y + y + height / 2, z },
      { x: Math.max(0.08, width / 2), y: Math.max(0.08, height / 2), z: Math.max(0.08, depth / 2) },
    );
  }

  private toWorld(roomId: string, placement: Placement2D): Placement2D | null {
    const property = starterPropertyById(this.propertyId);
    if (!property) return null;
    const room = property.roomBounds[roomId];
    const shell = PROPERTY_WORLD_PLACEMENTS[property.id];
    if (!room || !shell) return null;
    const zone = layoutRoomZone(property, roomId, shell.width, shell.depth);
    const mapped = mapRoomPlacementToShell(room, zone, placement);
    return { x: this.center.x + mapped.x, z: this.center.z + mapped.z, rotationY: mapped.rotationY };
  }

  private removeRendered(rendered: RenderedFurniture): void {
    this.root.remove(rendered.group);
    if (rendered.collider) this.physics.removeCollider(rendered.collider);
    disposeGeometries(rendered.group);
  }
}

function buildFurnitureVisual(definition: FurnitureDefinition, materials: MaterialLibrary, preview: boolean): THREE.Group {
  const group = new THREE.Group();
  const width = definition.footprint.width;
  const depth = definition.footprint.depth;
  const accent = preview ? materials.get('sagePlaster') : materials.get(definition.category === 'plant' ? 'terracottaPlaster' : definition.category === 'lighting' ? 'metalDark' : 'wood');
  const soft = materials.get(definition.category === 'seat' || definition.category === 'bed' ? 'curtainWarm' : 'warmPlaster');
  switch (definition.category) {
    case 'seat': {
      addBox(group, [width, 0.42, depth], [0, 0.21, 0], soft);
      addBox(group, [width, 0.58, 0.12], [0, 0.66, depth / 2 - 0.06], accent);
      break;
    }
    case 'bed': {
      addBox(group, [width, 0.34, depth], [0, 0.17, 0], materials.get('wood'));
      addBox(group, [width * 0.94, 0.18, depth * 0.9], [0, 0.43, -depth * 0.02], soft);
      addBox(group, [width, 0.72, 0.1], [0, 0.68, depth / 2 - 0.05], accent);
      break;
    }
    case 'table': {
      addBox(group, [width, 0.09, depth], [0, 0.75, 0], accent);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(group, [0.08, 0.72, 0.08], [sx * width * 0.4, 0.36, sz * depth * 0.38], materials.get('wood'));
      break;
    }
    case 'storage': {
      addBox(group, [width, 0.72, depth], [0, 0.36, 0], accent);
      addBox(group, [width * 0.88, 0.035, depth * 0.82], [0, 0.52, 0], materials.get('warmPlaster'));
      break;
    }
    case 'lighting': {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.25, 10), accent);
      stem.position.y = 0.68; group.add(stem);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(Math.min(width, depth) * 0.46, 0.42, 18, 1, true), soft);
      shade.position.y = 1.38; shade.rotation.x = Math.PI; group.add(shade);
      break;
    }
    case 'plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.35, width * 0.3, 0.36, 12), materials.get('terracottaPlaster'));
      pot.position.y = 0.18; group.add(pot);
      for (let i = 0; i < 7; i += 1) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(width * 0.24, 7, 5), materials.get(i % 2 ? 'foliageMid' : 'foliageDeep'));
        const angle = i / 7 * Math.PI * 2;
        leaf.scale.set(0.55, 1.25, 0.35);
        leaf.position.set(Math.cos(angle) * width * 0.22, 0.55 + (i % 3) * 0.08, Math.sin(angle) * depth * 0.22);
        group.add(leaf);
      }
      break;
    }
    case 'decor': {
      const rug = addBox(group, [width, 0.035, depth], [0, 0.018, 0], soft);
      rug.receiveShadow = true;
      break;
    }
  }
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) { object.castShadow = definition.category !== 'decor'; object.receiveShadow = true; }
  });
  return group;
}

function furnitureHeight(definition: FurnitureDefinition): number {
  switch (definition.category) {
    case 'lighting': return 1.62;
    case 'storage': return 0.72;
    case 'bed': return 0.78;
    case 'seat': return 0.95;
    case 'table': return 0.8;
    case 'plant': return 0.95;
    case 'decor': return 0.04;
  }
}

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function clonePreviewMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) return material.map((entry) => cloneOne(entry));
  return cloneOne(material);
}
function cloneOne(material: THREE.Material): THREE.Material {
  const clone = material.clone();
  clone.transparent = true;
  clone.opacity = 0.55;
  clone.depthWrite = false;
  return clone;
}
function disposePreviewMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material.dispose();
  });
}
function disposeGeometries(root: THREE.Object3D): void {
  root.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
}
function disposeOwnedMaterials(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (material.userData.togetherSurface) material.dispose();
  });
}
function finishColor(finishId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < finishId.length; index += 1) { hash ^= finishId.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  const palette = [0xc9b79c, 0x9cae9d, 0xa99a8a, 0xc6c0b1, 0x8e9a9d, 0xb89b7d];
  return palette[Math.abs(hash) % palette.length]!;
}
