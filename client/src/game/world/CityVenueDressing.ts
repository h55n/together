import * as THREE from 'three';
import { cityHeightAt, venueVisualProfile, type CityVenueDefinition, type ResidencyRing } from '@together/shared';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MaterialLibrary, WorldMaterialKey } from './MaterialLibrary';

const ACCENTS: Record<ReturnType<typeof venueVisualProfile>['accent'], WorldMaterialKey> = {
  sage: 'sagePlaster',
  terracotta: 'terracottaPlaster',
  mustard: 'curtainWarm',
  timber: 'wood',
  charcoal: 'metalDark',
};

/**
 * Streamed authored shopfront dressing for the everyday venue network.
 * This is development geometry around a real data model; final GLBs can replace
 * individual venues without changing IDs, schedules or gameplay anchors.
 */
export function addVenueDressing(
  root: THREE.Group,
  venues: readonly CityVenueDefinition[],
  ring: Exclude<ResidencyRing, 'unloaded'>,
  materials: MaterialLibrary,
  physics?: PhysicsWorld,
): void {
  if (ring === 'horizon') return;
  const colliders: unknown[] = [];
  const previousDispose = root.userData.disposeChunk as (() => void) | undefined;

  for (const venue of venues) {
    const profile = venueVisualProfile(venue.category, Boolean(venue.hero));
    const width = Math.max(4.2, venue.frontageMetres);
    const depth = venue.hero ? 8.5 : profile.family === 'market' ? 7.2 : 6.4;
    const height = venue.hero ? 6.4 : profile.family === 'civic' ? 5.6 : 4.5;
    const y = cityHeightAt(venue.position.x, venue.position.z);
    const group = new THREE.Group();
    group.name = `venue:${venue.id}:${venue.category}`;
    group.position.set(venue.position.x, y, venue.position.z);
    // Keep fronts loosely oriented toward the city centre so they address streets rather than look random.
    group.rotation.y = Math.atan2(-venue.position.x, -venue.position.z);

    const bodyMaterial = profile.family === 'service'
      ? materials.get('concrete')
      : profile.family === 'hospitality'
        ? materials.get('warmPlaster')
        : profile.family === 'market'
          ? materials.get('sagePlaster')
          : materials.get('warmPlaster');

    const body = box(width, height, depth, bodyMaterial);
    body.position.y = height / 2;
    body.castShadow = ring === 'active';
    body.receiveShadow = true;
    group.add(body);

    const plinth = box(width + 0.36, 0.28, depth + 0.34, materials.get('stone'));
    plinth.position.y = 0.14;
    group.add(plinth);

    // Glazed shop opening and strong inset threshold create believable facade depth.
    const frontage = box(width * 0.72, 2.15, 0.09, materials.get('glass'));
    frontage.position.set(0, 1.3, -depth / 2 - 0.055);
    group.add(frontage);
    const threshold = box(width * 0.78, 0.12, 0.72, materials.get('stone'));
    threshold.position.set(0, 0.08, -depth / 2 - 0.34);
    group.add(threshold);

    const sign = box(width * Math.min(0.82, 0.6 * profile.signScale), 0.62 * profile.signScale, 0.14, materials.get(ACCENTS[profile.accent]));
    sign.position.set(0, Math.min(height - 0.72, 3.45), -depth / 2 - 0.13);
    group.add(sign);

    if (profile.canopy) {
      const canopy = box(width * 0.86, 0.12, 1.25, materials.get(ACCENTS[profile.accent]));
      canopy.position.set(0, 2.7, -depth / 2 - 0.58);
      canopy.rotation.x = -0.08;
      group.add(canopy);
    }

    if (ring === 'active') {
      addActiveDetail(group, venue, profile, width, depth, height, materials);
    }

    root.add(group);
    if (ring === 'active' && physics) {
      // Leave the front threshold navigable; the collider is pulled slightly backward.
      colliders.push(physics.createFixedCuboid(
        { x: venue.position.x, y: y + height / 2, z: venue.position.z },
        { x: width / 2, y: height / 2, z: Math.max(1.7, depth / 2 - 0.72) },
      ));
    }
  }

  if (physics && colliders.length > 0) {
    root.userData.disposeChunk = () => {
      previousDispose?.();
      for (const collider of colliders) physics.removeCollider(collider as never);
    };
  }
}

function addActiveDetail(
  group: THREE.Group,
  venue: CityVenueDefinition,
  profile: ReturnType<typeof venueVisualProfile>,
  width: number,
  depth: number,
  height: number,
  materials: MaterialLibrary,
): void {
  const frontZ = -depth / 2 - 0.12;
  for (let i = 0; i < profile.windowBands; i += 1) {
    const band = box(Math.max(0.7, width * 0.13), 0.95, 0.08, materials.get(profile.windowGlow ? 'curtainWarm' : 'glass'));
    band.position.set(-width * 0.28 + i * Math.min(width * 0.28, 1.45), Math.min(height - 1.25, 3.25), frontZ);
    group.add(band);
  }

  if (profile.serviceClutter) {
    for (let i = 0; i < Math.min(4, Math.max(2, Math.round(width / 3))); i += 1) {
      const crate = box(0.62, 0.48, 0.55, venue.category === 'plants' ? materials.get('terracottaPlaster') : materials.get('wood'));
      crate.position.set(-width * 0.32 + i * 0.82, 0.25, -depth / 2 - 0.72);
      group.add(crate);
      if (venue.category === 'plants') {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.28 + (i % 2) * 0.08, 7, 5), materials.get(i % 2 ? 'foliageMid' : 'foliageDeep'));
        crown.scale.set(0.85, 1.25, 0.85);
        crown.position.set(crate.position.x, 0.82, crate.position.z);
        group.add(crown);
      }
    }
  }

  // Door frame, utility box, drain and one street object keep the facade grounded.
  const door = box(Math.min(1.25, width * 0.18), 2.18, 0.11, materials.get('wood'));
  door.position.set(width * 0.32, 1.12, frontZ - 0.01);
  group.add(door);
  const conduit = box(0.08, 1.8, 0.08, materials.get('metalDark'));
  conduit.position.set(-width / 2 + 0.28, 1.15, frontZ - 0.02);
  group.add(conduit);
  const drain = box(width * 0.74, 0.06, 0.18, materials.get('metalDark'));
  drain.position.set(0, 0.035, -depth / 2 - 0.88);
  group.add(drain);

  if (venue.category === 'cafe' || venue.category === 'food') {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12), materials.get('wood'));
    table.position.set(-width * 0.28, 0.72, -depth / 2 - 1.45);
    group.add(table);
    const stem = box(0.06, 0.68, 0.06, materials.get('metalDark'));
    stem.position.set(table.position.x, 0.37, table.position.z);
    group.add(stem);
  }
}

function box(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}
