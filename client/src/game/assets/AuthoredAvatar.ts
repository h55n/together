import type { Group } from 'three';
import * as THREE from 'three';
import type { AvatarAppearance } from '../player/PlayerAvatar';

export type AuthoredAvatarRig = {
  root: Group;
  partRoots: Group[];
  clips: Record<string, THREE.AnimationClip>;
  bones: Map<string, THREE.Bone>;
  accessoryBones: Map<string, THREE.Bone>[];
  eyeHeight: number;
  dispose(): void;
};

export type AuthoredAvatarSource = {
  tryLoad(id: string): Promise<Group | null>;
  tryLoadWithClips?(id: string): Promise<{ group: Group; clips: THREE.AnimationClip[] } | null>;
};

const OUTFIT_IDS_BY_CONTEXT: Record<string, string> = {
  home: 'outfit_home',
  sleep: 'outfit_sleep',
  work: 'outfit_blue',
  outdoor: 'outfit_terracotta',
};

/**
 * Job uniform keywords from the shared wardrobe naming; matched by substring so
 * ids like job_cafe_barista map onto their authored uniform asset.
 */
const UNIFORM_KEYWORDS = ['barista', 'garden', 'delivery', 'market'];

function outfitIdFor(appearance: AvatarAppearance): string {
  const explicit = appearance.outfitId ?? '';
  if (explicit.startsWith('outfit_')) return explicit;
  switch (explicit) {
    case 'terracotta': return 'outfit_terracotta';
    case 'blue': return 'outfit_blue';
    case 'sage': return 'outfit_sage';
    case 'mustard': return 'outfit_mustard';
    case 'sleep': return 'outfit_sleep';
    case 'home': return 'outfit_home';
    default: break;
  }
  const uniform = UNIFORM_KEYWORDS.find((keyword) => explicit.includes(keyword));
  if (uniform) return `outfit_${uniform}`;
  return OUTFIT_IDS_BY_CONTEXT[appearance.outfitContext ?? 'outdoor'] ?? 'outfit_terracotta';
}

function bodyIdFor(appearance: AvatarAppearance): string {
  const width = appearance.bodyWidthScale ?? 1;
  if (width < 0.95) return 'body_slim';
  if (width > 1.06) return 'body_broad';
  return 'body_average';
}

function faceIdFor(appearance: AvatarAppearance): string {
  const variant = Number(appearance.faceBase?.match(/(\d+)$/)?.[1] ?? 3);
  return `face_0${THREE.MathUtils.clamp(variant || 3, 1, 3)}`;
}

function hairIdFor(appearance: AvatarAppearance): string {
  const variant = Number(appearance.hair?.match(/(\d+)$/)?.[1] ?? 4);
  return `hair_0${THREE.MathUtils.clamp(variant || 4, 1, 4)}`;
}

function collectBones(id: string, group: Group): Map<string, THREE.Bone> {
  const bones = new Map<string, THREE.Bone>();
  group.traverse((object) => {
    if (object instanceof THREE.Bone) bones.set(object.name, object);
  });
  if (bones.size === 0) throw new Error(`authored asset ${id} has no bones`);
  return bones;
}

/**
 * Optional accessories ride on the same rig but never block the avatar: a missing
 * or unrecognized asset is simply skipped.
 */
function accessoryIdsFor(appearance: AvatarAppearance): string[] {
  const ids: string[] = [];
  if (appearance.facialHair === 'beard_short') ids.push(appearance.facialHair);
  if (appearance.glasses === 'glasses_round') ids.push(appearance.glasses);
  return ids;
}

/**
 * Loads the authored skinned character pieces (body with clips plus face / hair / outfit)
 * for one avatar appearance. Returns null when any piece is missing so the caller keeps
 * its procedural body. The pieces share one rig layout and follow the pose bone by bone.
 */
export async function loadAuthoredAvatar(source: AuthoredAvatarSource, appearance: AvatarAppearance): Promise<AuthoredAvatarRig | null> {
  const ids = [bodyIdFor(appearance), faceIdFor(appearance), hairIdFor(appearance), outfitIdFor(appearance)];
  const accessoryIds = accessoryIdsFor(appearance);
  try {
    const groups: Group[] = [];
    let clips: THREE.AnimationClip[] = [];
    for (const [index, idEntry] of ids.entries()) {
      const id = idEntry;
      if (id === undefined) continue;
      if (index === 0 && source.tryLoadWithClips) {
        const loaded = await source.tryLoadWithClips(id);
        if (!loaded) return null;
        groups.push(loaded.group);
        clips = loaded.clips;
        continue;
      }
      const group = await source.tryLoad(id);
      if (!group) return null;
      groups.push(group);
    }
    if (groups.length < 4) return null;
    const [bodyRoot = null, facePart = null, hairPart = null, outfitPart = null] = groups;
    if (!bodyRoot || !facePart || !hairPart || !outfitPart) return null;
    const accessoryParts: Group[] = [];
    const accessoryBones = [
      collectBones(ids[1] ?? 'face', facePart),
      collectBones(ids[2] ?? 'hair', hairPart),
      collectBones(ids[3] ?? 'outfit', outfitPart),
    ];
    const bones = collectBones(ids[0] ?? 'body', bodyRoot);
    for (const id of accessoryIds) {
      const group = await source.tryLoad(id);
      if (!group) continue;
      groups.push(group);
      accessoryParts.push(group);
      accessoryBones.push(collectBones(id, group));
    }
    const head = bones.get('head');
    bodyRoot.updateWorldMatrix(true, true);
    const eyeHeight = head ? head.getWorldPosition(new THREE.Vector3()).y + 0.12 : 1.64;
    const clipRecord: Record<string, THREE.AnimationClip> = {};
    for (const clip of clips) clipRecord[clip.name] = clip;
    return {
      root: bodyRoot,
      partRoots: [facePart, hairPart, outfitPart, ...accessoryParts],
      clips: clipRecord,
      bones,
      accessoryBones,
      eyeHeight,
      dispose() {
        for (const group of groups) group.traverse(disposeOne);
      },
    };
  } catch {
    return null;
  }
}

function disposeOne(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    const material = object.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  }
}
