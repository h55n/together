import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createActivityState, createCafeState, createPicnicState, type ActivityState } from '@together/shared';
import { CafePresentation } from './CafePresentation';
import { PicnicPresentation } from './PicnicPresentation';
import { AmbientLeisurePresentation, type AmbientLeisureSession } from './AmbientLeisurePresentation';

function session(id: string, activityId: 'picnic' | 'cafe_hangout', revision = 0, createdAt = id): AmbientLeisureSession {
  const state: ActivityState = {
    ...createActivityState(activityId, 'a'),
    revision,
    ...(activityId === 'picnic' ? { picnic: { ...createPicnicState(['a']), revision, mat: revision ? { x: 0.5, z: -0.5, placedBy: 'a' } : null } } : { cafe: { ...createCafeState(['a']), revision } }),
  };
  return { id, activityId, state, createdAt };
}

describe('ambient leisure presentations', () => {
  it('keeps arrangements in the scene independently of any modal and reuses one presentation per spot', () => {
    const scene = new THREE.Scene(), registry = new AmbientLeisurePresentation(scene);
    registry.sync([session('pic-a', 'picnic', 1, '2026-z'), session('cafe-a', 'cafe_hangout', 1)]);
    expect(scene.children.map(child => child.name).sort()).toEqual(['cafe-presentation', 'picnic-presentation']);
    const picnic = scene.children.find(child => child.name === 'picnic-presentation');
    const cafe = scene.children.find(child => child.name === 'cafe-presentation');
    expect(picnic?.children.length).toBeGreaterThan(0);
    expect(cafe?.children.filter(child => child.name.startsWith('cafe-chair-'))).toHaveLength(6);
    registry.sync([session('pic-a', 'picnic', 2, '2026-z'), session('pic-b', 'picnic', 0, '2026-b'), session('cafe-a', 'cafe_hangout', 2)]);
    expect(scene.children).toHaveLength(2);
    expect(scene.children).toContain(picnic); expect(scene.children).toContain(cafe);
    expect(scene.children.find(child => child.name === 'picnic-presentation')).toBe(picnic);
    registry.dispose(); expect(scene.children).toHaveLength(0);
  });

  it('selects the newest active session for each canonical spot deterministically', () => {
    const scene = new THREE.Scene(), registry = new AmbientLeisurePresentation(scene);
    registry.sync([session('older', 'picnic', 2, '2026-01-01'), session('newer', 'picnic', 0, '2026-01-02')]);
    const view = scene.children[0]!;
    expect(view.name).toBe('picnic-presentation');
    // Newer session has no mat; older session has its accepted mat at revision 2.
    expect(view.children).toHaveLength(0);
    registry.dispose();
  });

  it('keeps a live arrangement selected when many completed historical sessions arrive', () => {
    const scene = new THREE.Scene(), registry = new AmbientLeisurePresentation(scene);
    const history = Array.from({ length: 40 }, (_, index) => {
      const item = session(`done-${index}`, 'picnic', 1, `2026-${index}`);
      return { ...item, state: { ...item.state, status: 'complete' as const } };
    });
    registry.sync([session('live', 'picnic', 1, '2025-01-01'), ...history]);
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]?.children.length).toBeGreaterThan(0);
    registry.dispose();
  });

  it('ignores stale outer and nested revisions and never rebuilds on an identical snapshot', () => {
    const scene = new THREE.Scene(), registry = new AmbientLeisurePresentation(scene);
    const first = session('pic', 'picnic', 2);
    registry.sync([first]);
    const view = scene.children[0]!;
    const update = vi.spyOn(PicnicPresentation.prototype, 'update');
    registry.upsert({ ...first, state: { ...first.state, revision: 3, picnic: { ...first.state.picnic!, revision: 1 } } });
    registry.upsert(first);
    expect(update).not.toHaveBeenCalled();
    expect(scene.children[0]).toBe(view);
    registry.dispose(); update.mockRestore();
  });

  it('disposes completed or removed presentations once, retains completion tombstones, and permits explicit reappearance', () => {
    const scene = new THREE.Scene(), registry = new AmbientLeisurePresentation(scene);
    const disposePicnic = vi.spyOn(PicnicPresentation.prototype, 'dispose');
    const disposeCafe = vi.spyOn(CafePresentation.prototype, 'dispose');
    const pic = session('pic', 'picnic', 1), cafe = session('cafe', 'cafe_hangout', 1);
    registry.sync([pic, cafe]);
    registry.sync([{ ...pic, state: { ...pic.state, status: 'complete' } }, cafe]);
    expect(disposePicnic).toHaveBeenCalledOnce();
    registry.sync([cafe]);
    expect(disposePicnic).toHaveBeenCalledOnce();
    registry.sync([]);
    registry.upsert(pic);
    expect(scene.children.filter(child => child.name === 'picnic-presentation')).toHaveLength(0);
    registry.remove('pic');
    registry.upsert(pic);
    expect(scene.children.filter(child => child.name === 'picnic-presentation')).toHaveLength(1);
    registry.dispose(); registry.dispose();
    expect(disposeCafe).toHaveBeenCalledOnce();
    expect(disposePicnic).toHaveBeenCalledTimes(2);
    expect(scene.children).toHaveLength(0);
    disposePicnic.mockRestore(); disposeCafe.mockRestore();
  });
});
