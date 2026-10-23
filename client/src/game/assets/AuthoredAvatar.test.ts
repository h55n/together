import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { AvatarAppearance } from '../player/PlayerAvatar';
import { loadAuthoredAvatar, type AuthoredAvatarRig, type AuthoredAvatarSource } from './AuthoredAvatar';

function makePart(id: string): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  const bone = new THREE.Bone();
  bone.name = 'head';
  group.add(bone);
  return group;
}

type FakeSource = AuthoredAvatarSource & { requested: string[] };

function makeSource(ids: Record<string, THREE.Group | null>): FakeSource {
  const requested: string[] = [];
  return {
    requested,
    async tryLoad(id: string) {
      requested.push(id);
      return ids[id] ?? null;
    },
    async tryLoadWithClips(id: string) {
      requested.push(id);
      const group = ids[id];
      if (!group) return null;
      const clip = new THREE.AnimationClip('idle', 1, []);
      return { group, clips: [clip] };
    },
  };
}

function baseAppearance(overrides: Partial<AvatarAppearance>): AvatarAppearance {
  return { outfitContext: 'outdoor', ...overrides } as AvatarAppearance;
}

describe('authored avatar loading', () => {
  it('attaches optional facial hair and glasses parts when the appearance asks for them', async () => {
    const source = makeSource({
      body_average: makePart('body_average'),
      face_03: makePart('face_03'),
      hair_04: makePart('hair_04'),
      outfit_terracotta: makePart('outfit_terracotta'),
      beard_short: makePart('beard_short'),
      glasses_round: makePart('glasses_round'),
    });
    const rig = await loadAuthoredAvatar(source, baseAppearance({
      facialHair: 'beard_short',
      glasses: 'glasses_round',
    }));
    expect(rig).not.toBeNull();
    expect(source.requested).toContain('beard_short');
    expect(source.requested).toContain('glasses_round');
    if (!rig) return;
    expect(rig.partRoots).toHaveLength(5);
    expect(rig.accessoryBones).toHaveLength(5);
  });

  it('skips a missing optional accessory instead of failing the whole avatar', async () => {
    const source = makeSource({
      body_average: makePart('body_average'),
      face_03: makePart('face_03'),
      hair_04: makePart('hair_04'),
      outfit_terracotta: makePart('outfit_terracotta'),
    });
    const rig = await loadAuthoredAvatar(source, baseAppearance({
      facialHair: 'beard_short',
      glasses: 'glasses_round',
    }));
    expect(rig).not.toBeNull();
    expect(source.requested).toContain('beard_short');
    if (!rig) return;
    expect(rig.partRoots).toHaveLength(3);
    expect(rig.accessoryBones).toHaveLength(3);
  });

  it('ignores appearance ids that are not authored accessory variants', async () => {
    const source = makeSource({
      body_average: makePart('body_average'),
      face_03: makePart('face_03'),
      hair_04: makePart('hair_04'),
      outfit_terracotta: makePart('outfit_terracotta'),
    });
    const rig = await loadAuthoredAvatar(source, baseAppearance({
      facialHair: 'beard_wizard',
      glasses: 'monocle_gold',
    }));
    expect(rig).not.toBeNull();
    expect(source.requested).not.toContain('beard_wizard');
    expect(source.requested).not.toContain('monocle_gold');
  });

  it('maps named job uniforms onto their authored outfit assets', async () => {
    for (const [outfitId, expected] of [
      ['barista', 'outfit_barista'],
      ['job_cafe_barista', 'outfit_barista'],
      ['garden', 'outfit_garden'],
      ['work_garden', 'outfit_garden'],
      ['delivery', 'outfit_delivery'],
      ['market', 'outfit_market'],
    ] as const) {
      const source = makeSource({
        body_average: makePart('body_average'),
        face_03: makePart('face_03'),
        hair_04: makePart('hair_04'),
        [expected]: makePart(expected),
      });
      const rig = await loadAuthoredAvatar(source, baseAppearance({ outfitId }));
      expect(rig).not.toBeNull();
      expect(source.requested).toContain(expected);
    }
  });
});
