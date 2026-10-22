import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { acceptCafeCommand, acceptPicnicCommand, createCafeState, createPicnicState, cityHeightAt } from '@together/shared';
import { CafePresentation } from './CafePresentation';
import { PicnicPresentation } from './PicnicPresentation';

describe('persistent picnic and café scene presentations', () => {
  it('rebuilds a terrain-conforming picnic arrangement only for a new accepted revision', () => {
    const scene = new THREE.Scene(), view = new PicnicPresentation(scene);
    const empty = createPicnicState(['a']); view.update(empty); expect(view.group.children).toHaveLength(0);
    let state = acceptPicnicCommand(empty, 'a', ['a'], { key: 'mat', expectedRevision: 0, kind: 'place_mat', x: 0.5, z: -0.5 });
    state = acceptPicnicCommand(state, 'a', ['a'], { key: 'food', expectedRevision: 1, kind: 'bring_food', food: 'mangoes' });
    view.update(state);
    expect(view.group.name).toBe('picnic-presentation'); expect(view.group.children.length).toBeGreaterThan(2);
    const mat = view.group.children[0] as THREE.Mesh;
    expect(mat.geometry.getAttribute('position').count).toBe(4);
    const positions = mat.geometry.getAttribute('position');
    expect(positions.getY(0)).not.toBe(positions.getY(1));
    const count = view.group.children.length; view.update(empty); expect(view.group.children).toHaveLength(count);
    const foodMesh = view.group.children.at(-1) as THREE.Mesh;
    const release = vi.spyOn(foodMesh.geometry, 'dispose'); view.dispose(); view.dispose();
    expect(release).toHaveBeenCalledOnce(); expect(scene.children).toHaveLength(0);
  });

  it('places Café Roshan furniture at the accessible frontage with cups on the table', () => {
    const scene = new THREE.Scene(), view = new CafePresentation(scene);
    let state = createCafeState(['a']);
    state = acceptCafeCommand(state, 'a', ['a'], { key: 'seat', expectedRevision: 0, kind: 'choose_seat', seat: 1 });
    state = acceptCafeCommand(state, 'a', ['a'], { key: 'order', expectedRevision: 1, kind: 'order_drink', drink: 'chai' });
    view.update(state);
    expect(view.group.name).toBe('cafe-presentation');
    expect(view.group.children.filter(child => child.name.startsWith('cafe-chair-'))).toHaveLength(6);
    const tabletop = view.group.children[0] as THREE.Mesh;
    expect(tabletop.position.x).toBe(-36.5); expect(tabletop.position.z).toBe(60);
    expect(tabletop.position.y).toBeGreaterThan(cityHeightAt(-36.5, 60));
    view.group.updateMatrixWorld(true);
    const cups: THREE.Mesh[] = [];
    view.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry && child.geometry.parameters.radiusTop === 0.115) cups.push(child);
    });
    expect(cups).toHaveLength(1);
    const tableBounds = new THREE.Box3().setFromObject(tabletop);
    const cupBounds = new THREE.Box3().setFromObject(cups[0]!);
    expect(cupBounds.min.x).toBeGreaterThan(tableBounds.min.x);
    expect(cupBounds.max.x).toBeLessThan(tableBounds.max.x);
    expect(cupBounds.min.z).toBeGreaterThan(tableBounds.min.z);
    expect(cupBounds.max.z).toBeLessThan(tableBounds.max.z);
    expect(cupBounds.min.y).toBeGreaterThanOrEqual(tableBounds.max.y - 0.01);
    view.dispose(); expect(scene.children).toHaveLength(0);
  });

  it('keeps a full picnic service within the cloth footprint and caps rendered portions', () => {
    const scene = new THREE.Scene(), view = new PicnicPresentation(scene);
    let state = acceptPicnicCommand(createPicnicState(['a']), 'a', ['a'], { key: 'mat', expectedRevision: 0, kind: 'place_mat', x: 0, z: 0 });
    for (let index = 0; index < 24; index++) state = acceptPicnicCommand(state, 'a', ['a'], { key: `food-${index}`, expectedRevision: state.revision, kind: 'bring_food', food: index % 2 ? 'chai' : 'sandwiches' });
    view.update(state);
    const plates = view.group.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry && child.geometry.parameters.radiusTop === 0.16);
    expect(plates).toHaveLength(24);
    expect(plates.every(plate => Math.abs(plate.position.x - 168) < 0.8 && Math.abs(plate.position.z - 122) < 0.5 && plate.position.y - cityHeightAt(plate.position.x, plate.position.z) >= 0.06 && plate.position.y - cityHeightAt(plate.position.x, plate.position.z) < 0.27)).toBe(true);
    expect(view.group.children.length).toBeLessThan(120);
    view.dispose();
  });
});
