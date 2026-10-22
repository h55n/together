import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { acceptGolfShot, cityHeightAt, createGolfRound, MINI_GOLF_HOLES } from '@together/shared';
import { GolfPresentation } from './GolfPresentation';

describe('owned golf presentation', () => {
  it('places a settled ball on canonical terrain and replays only a new accepted stroke', () => {
    const scene = new THREE.Scene(), view = new GolfPresentation(scene);
    const round = createGolfRound(['solo']); view.update(round, 0);
    const ball = view.group.children.find(child => child instanceof THREE.Mesh)!;
    const hole = MINI_GOLF_HOLES[0]!;
    expect(ball.position.x).toBe(hole.center.x + hole.tee.x);
    expect(ball.position.y).toBeGreaterThan(cityHeightAt(ball.position.x, ball.position.z));
    const next = acceptGolfShot(round, 'solo', { key: 'miss', expectedRevision: 0, angle: 0, power: 0.1 });
    view.update(next, 0); expect(view.rolling).toBe(true);
    view.update(next, 20); expect(view.rolling).toBe(false);
    expect(ball.position.x).toBe(hole.center.x + next.balls.solo!.x);
    view.update(round, 0); expect(ball.position.x).toBe(hole.center.x + next.balls.solo!.x);
    view.dispose();
  });
  it('disposing twice releases each owned resource once and leaves successor untouched', () => {
    const scene = new THREE.Scene(), old = new GolfPresentation(scene), next = new GolfPresentation(scene);
    const round = createGolfRound(['solo']); old.update(round, 0); next.update(round, 0);
    const ball = old.group.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh;
    const release = vi.spyOn(ball.geometry, 'dispose');
    old.dispose(); old.dispose(); old.update(round, 1);
    expect(release).toHaveBeenCalledOnce(); expect(scene.children).toEqual([next.group]);
    next.update(round, 0); expect(next.group.children.length).toBe(2); next.dispose();
  });
});
