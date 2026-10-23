import * as THREE from 'three';
import type { Group } from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { AmbientWalker } from './ambient-walker';

/** Stand-in capsule height the authored townies should match. */
const CROWD_STAND_IN_HEIGHT = 1.75;
const SLOT_COUNT = 6;
const ASSIGN_RADIUS = 18;
const CROWD_IDS = ['crowd_01', 'crowd_02', 'crowd_03', 'crowd_04', 'crowd_05'] as const;

export type AuthoredCrowdSource = {
  tryLoadWithClips(id: string): Promise<{ group: Group; clips: THREE.AnimationClip[] } | null>;
};

type CrowdTemplate = {
  model: Group;
  clips: Record<'idle' | 'walk', THREE.AnimationClip>;
  scale: number;
};

type CrowdSlot = {
  walkerIndex: number;
  root: Group;
  template: CrowdTemplate;
  mixer: THREE.AnimationMixer;
  walk: THREE.AnimationAction;
  idle: THREE.AnimationAction;
  active: 'walk' | 'idle';
};

export type CrowdLodChange = { hidden: readonly number[]; shown: readonly number[] };

/**
 * Proximity detail: people near the player swap from the instanced stand-in crowd
 * to one of the authored skinned townies. Farther walkers keep the instanced draw,
 * and everything falls back to the stand-in when the GLBs are unavailable.
 */
export class AmbientCrowdLod {
  private templates: CrowdTemplate[] | null = null;
  private loading: Promise<CrowdTemplate[] | null> | null = null;
  private readonly slots = new Map<number, CrowdSlot>();
  /** Previously hidden indices, used to compute this frame's hidden/shown diff. */
  private readonly previouslyHidden = new Set<number>();
  private readonly pool = new Map<CrowdTemplate, Group[]>();

  constructor(private readonly source: AuthoredCrowdSource) {}

  /**
   * Loads the five authored townies once. Any missing file or idle/walk clip
   * disables the whole authored layer and callers keep the instanced crowd.
   */
  async attach(): Promise<boolean> {
    this.loading ??= this.loadTemplates();
    this.templates = await this.loading;
    return !!this.templates;
  }

  private async loadTemplates(): Promise<CrowdTemplate[] | null> {
    const templates: CrowdTemplate[] = [];
    for (const id of CROWD_IDS) {
      const loaded = await this.source.tryLoadWithClips(id);
      if (!loaded) return null;
      const clips: Partial<Record<'idle' | 'walk', THREE.AnimationClip>> = {};
      for (const clip of loaded.clips) if (clip.name === 'idle' || clip.name === 'walk') clips[clip.name] = clip;
      if (!clips.idle || !clips.walk) return null;
      const model = loaded.group;
      model.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(model);
      const height = Math.max(0.4, bounds.max.y - bounds.min.y);
      templates.push({
        model,
        clips: { idle: clips.idle, walk: clips.walk },
        scale: THREE.MathUtils.clamp(CROWD_STAND_IN_HEIGHT / height, 0.85, 1.1),
      });
    }
    return templates;
  }

  /**
   * Reconciles the near-player slots and drives the authored townies. Returns the
   * stand-in instances that must be newly hidden and the ones restored this frame;
   * the caller rewrites exactly those stand-in matrices.
   */
  update(playerPosition: THREE.Vector3, walkers: readonly AmbientWalker[], visible: Uint8Array, deltaSeconds: number): CrowdLodChange {
    if (this.templates) this.reconcile(playerPosition, walkers, visible);
    const hidden: number[] = [];
    const shown: number[] = [];
    for (const index of this.slots.keys()) if (!this.previouslyHidden.has(index)) hidden.push(index);
    for (const index of this.previouslyHidden) if (!this.slots.has(index)) shown.push(index);
    this.previouslyHidden.clear();
    for (const index of this.slots.keys()) this.previouslyHidden.add(index);
    for (const slot of this.slots.values()) this.drive(slot, walkers[slot.walkerIndex]!, deltaSeconds);
    return { hidden, shown };
  }

  private reconcile(playerPosition: THREE.Vector3, walkers: readonly AmbientWalker[], visible: Uint8Array): void {
    const candidates: Array<{ index: number; distance: number }> = [];
    for (let index = 0; index < walkers.length; index += 1) {
      if (!visible[index]) continue;
      const walker = walkers[index]!;
      const distance = Math.hypot(walker.position.x - playerPosition.x, walker.position.z - playerPosition.z);
      if (distance < ASSIGN_RADIUS) candidates.push({ index, distance });
    }
    candidates.sort((a, b) => a.distance - b.distance);

    const wanted = new Set<number>();
    for (let rank = 0; rank < SLOT_COUNT && rank < candidates.length; rank += 1) wanted.add(candidates[rank]!.index);
    for (const index of [...this.slots.keys()]) if (!wanted.has(index)) this.release(index);
    for (const index of wanted) this.assign(index, walkers[index]!);
  }

  private drive(slot: CrowdSlot, walker: AmbientWalker, deltaSeconds: number): void {
    const walking = walker.swing > 0.12;
    if (walking !== (slot.active === 'walk')) {
      (walking ? slot.walk : slot.idle).reset().fadeIn(0.22).play();
      (walking ? slot.idle : slot.walk).fadeOut(0.22);
      slot.active = walking ? 'walk' : 'idle';
    }
    // Walk time is phase-locked to the shared stride so stand-in swaps never resync a step.
    slot.walk.paused = true;
    slot.idle.paused = slot.active !== 'idle';
    if (slot.active === 'walk') slot.walk.time = (((walker.stride / (Math.PI * 2)) % 1) + 1) % 1 * slot.walk.getClip().duration;
    slot.mixer.update(deltaSeconds);
    const sideX = -Math.cos(walker.yaw) * walker.dodge, sideZ = Math.sin(walker.yaw) * walker.dodge;
    slot.root.position.set(walker.position.x + sideX, walker.position.y, walker.position.z + sideZ);
    slot.root.rotation.y = walker.yaw;
  }

  isAssigned(index: number): boolean { return this.slots.has(index); }

  /** Development visual review only: which walkers currently wear an authored townie. */
  assignedIndices(): number[] { return [...this.slots.keys()]; }

  dispose(): void {
    for (const slot of this.slots.values()) {
      slot.mixer.stopAllAction();
      slot.mixer.uncacheRoot(slot.root);
      slot.root.visible = false;
      slot.root.removeFromParent();
    }
    this.slots.clear();
    this.previouslyHidden.clear();
    this.pool.clear();
    this.templates = null;
  }

  private release(index: number): void {
    const slot = this.slots.get(index);
    if (!slot) return;
    slot.mixer.stopAllAction();
    slot.mixer.uncacheRoot(slot.root);
    slot.root.visible = false;
    slot.root.removeFromParent();
    let pool = this.pool.get(slot.template);
    if (!pool) this.pool.set(slot.template, pool = []);
    pool.push(slot.root);
    this.slots.delete(index);
  }

  /** A stable per-walker pick: patrol index decides which townie appear; release+reassign keeps it. */
  private pickTemplate(walkerIndex: number): CrowdTemplate {
    const choices = this.templates!;
    return choices[walkerIndex % choices.length]!;
  }

  private assign(index: number, walker: AmbientWalker | undefined): void {
    if (!walker || !this.templates || this.slots.has(index)) return;
    const template = this.pickTemplate(index);
    let pool = this.pool.get(template);
    const root = (pool && pool.length > 0 ? pool.pop() : null) ?? this.createClone(template);
    if (!root) return;
    root.visible = true;
    root.scale.setScalar(template.scale);
    root.position.set(walker.position.x, walker.position.y, walker.position.z);
    root.rotation.y = walker.yaw;
    const mixer = new THREE.AnimationMixer(root);
    const idle = mixer.clipAction(template.clips.idle);
    const walk = mixer.clipAction(template.clips.walk);
    idle.play();
    walk.play();
    walk.paused = true;
    walk.setEffectiveWeight(0);
    this.slots.set(index, { walkerIndex: index, root, template, mixer, walk, idle, active: 'idle' });
  }

  private createClone(template: CrowdTemplate): Group {
    const root = cloneSkinned(template.model) as Group;
    root.name = 'ambient-npc-authored';
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.updateWorldMatrix(false, false);
      }
    });
    return root;
  }
}
