import * as THREE from 'three';
import { avatarAppearanceFromConfig, interpolationAlpha, lerpAngle, type AvatarAction, type AvatarConfig, type PlayerSnapshot } from '@together/shared';
import { PlayerAvatar } from '../player/PlayerAvatar';

type RemoteState = {
  avatar: PlayerAvatar;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  currentYaw: number;
  targetYaw: number;
  animation: string;
  transport: PlayerSnapshot['transport'];
};

export class RemotePlayerSystem {
  readonly root = new THREE.Group();
  private readonly players = new Map<string, RemoteState>();
  private readonly profiles = new Map<string, AvatarConfig>();

  constructor() {
    this.root.name = 'remote-household-members';
  }

  applySnapshot(userId: string, snapshot: PlayerSnapshot): void {
    let state = this.players.get(userId);
    if (!state) {
      const appearance = this.appearanceForUser(userId);
      const avatar = new PlayerAvatar(appearance);
      avatar.setFirstPerson(false);
      this.root.add(avatar.root);
      const initial = new THREE.Vector3(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      state = {
        avatar,
        currentPosition: initial.clone(),
        targetPosition: initial,
        currentYaw: snapshot.yaw,
        targetYaw: snapshot.yaw,
        animation: snapshot.animation,
        transport: snapshot.transport,
      };
      this.players.set(userId, state);
    } else {
      state.targetPosition.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      state.targetYaw = snapshot.yaw;
      state.animation = snapshot.animation;
      state.transport = snapshot.transport;
    }
  }


  setProfile(userId: string, avatarConfig: AvatarConfig): void {
    this.profiles.set(userId, avatarConfig);
    const state = this.players.get(userId);
    if (!state) return;
    const replacement = new PlayerAvatar(this.appearanceForUser(userId));
    replacement.setFirstPerson(false);
    replacement.setTransform(state.currentPosition, state.currentYaw);
    this.root.remove(state.avatar.root);
    state.avatar.dispose();
    state.avatar = replacement;
    this.root.add(replacement.root);
  }

  update(deltaSeconds: number): void {
    const alpha = interpolationAlpha(12, deltaSeconds);
    for (const state of this.players.values()) {
      state.currentPosition.lerp(state.targetPosition, alpha);
      state.currentYaw = lerpAngle(state.currentYaw, state.targetYaw, alpha);
      state.avatar.setTransform(state.currentPosition, state.currentYaw);
      animateProceduralBody(state.avatar, state.animation, state.transport, deltaSeconds);
    }
  }

  getPosition(userId: string): THREE.Vector3 | null {
    const state = this.players.get(userId);
    return state ? state.currentPosition.clone() : null;
  }

  userIds(): string[] { return [...this.players.keys()]; }

  private appearanceForUser(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) return fallbackAppearanceForUser(userId);
    const appearance = avatarAppearanceFromConfig(profile, 'outdoor');
    return {
      height: appearance.height,
      bodyWidthScale: appearance.bodyWidthScale,
      skinTone: appearance.skinColor,
      shirtColor: appearance.shirtColor,
      trouserColor: appearance.trouserColor,
      hairColor: appearance.hairColor,
    };
  }

  remove(userId: string): void {
    const state = this.players.get(userId);
    if (!state) return;
    this.root.remove(state.avatar.root);
    state.avatar.dispose();
    this.players.delete(userId);
  }

  dispose(): void {
    for (const id of [...this.players.keys()]) this.remove(id);
    this.root.clear();
  }
}

function fallbackAppearanceForUser(userId: string): { shirtColor: number; trouserColor: number; skinTone: number } {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i += 1) hash = Math.imul(hash ^ userId.charCodeAt(i), 16777619);
  const shirts = [0x536f68, 0xa66855, 0x536c83, 0x806a55, 0x6c5975, 0x4d7764];
  const skins = [0xd8a078, 0xc98c66, 0xb77a5e, 0x9a644b, 0x80513e, 0x613b30];
  const index = Math.abs(hash) % shirts.length;
  return { shirtColor: shirts[index]!, skinTone: skins[index]!, trouserColor: 0x394246 };
}

const AVATAR_ACTIONS = new Set<AvatarAction>([
  'idle','walk','jog','pick_up','place','carry','pour','scrub','wipe','wash','cut','stir','fold','water',
  'hand_over','receive','sit','sleep','cycle','scooter','kayak','type','wave','point','laugh','nod','high_five',
]);

function animateProceduralBody(avatar: PlayerAvatar, animation: string, transport: PlayerSnapshot['transport'], deltaSeconds: number): void {
  const action: AvatarAction = AVATAR_ACTIONS.has(animation as AvatarAction) ? animation as AvatarAction : 'idle';
  avatar.setTransportMode(transport === 'auto' ? 'auto_rickshaw' : action === 'cycle' ? 'bicycle' : action === 'scooter' ? 'scooter' : action === 'kayak' ? 'kayak' : 'on_foot');
  avatar.updateMotion(deltaSeconds, action);
}
