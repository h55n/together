import type * as THREE from 'three';
import type { SurfacePoint } from '@together/shared';

/** Shared per-walker patrol state for the stand-in crowd and the authored LOD layer. */
export type AmbientWalker = {
  position: THREE.Vector3;
  speed: number;
  path: readonly SurfacePoint[];
  lengths: readonly number[];
  pathLength: number;
  direction: 1 | -1;
  phase: number;
  patrolDistance: number;
  yaw: number;
  /** Stride phase in radians, advanced by measured displacement so blocked walkers stop stepping. */
  stride: number;
  swing: number;
  /** Smoothed sidestep (metres, right-positive) around people just ahead; presentation only. */
  dodge: number;
  /** Patrol ends that sit at a shop front: 1 = path end, -1 = path start. */
  doorEnds: Array<1 | -1>;
  indoorsUntil: number;
  lastDirection: 1 | -1;
};
