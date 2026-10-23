import * as THREE from 'three';
import { avatarGaitFrequency, sampleAvatarMotion, type AvatarAction } from '@together/shared';
import { gazeAngles } from './gazeMath';
import type { LocomotionSample } from './movementMath';
import { createClothTextures } from '../world/ClothTextures';
import { TransportSafetyEquipment } from './TransportSafetyEquipment';
import { loadAuthoredAvatar, type AuthoredAvatarRig, type AuthoredAvatarSource } from '../assets/AuthoredAvatar';

export type AvatarAppearance = {
  skinTone?: THREE.ColorRepresentation;
  shirtColor?: THREE.ColorRepresentation;
  trouserColor?: THREE.ColorRepresentation;
  height?: number;
  bodyWidthScale?: number;
  hairColor?: THREE.ColorRepresentation;
  faceBase?: string;
  hair?: string;
  facialHair?: string;
  glasses?: string;
  outfitId?: string;
  outfitContext?: 'home' | 'outdoor' | 'sleep' | 'work';
};

/**
 * Procedural development avatar with a unified first/third-person body and
 * procedural micro-animation hooks. Replace meshes with the authored humanoid
 * GLB while preserving these action interfaces.
 */
export class PlayerAvatar {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly hands: { left: THREE.Object3D; right: THREE.Object3D };
  private standingEyeHeight: number;
  private readonly body = new THREE.Group();
  private readonly safetyEquipment = new TransportSafetyEquipment();
  get eyeHeight(): number { return this.standingEyeHeight + this.body.position.y * this.root.scale.y; }
  readonly placeholder = true;

  private readonly skin: THREE.MeshStandardMaterial;
  private readonly shirt: THREE.MeshStandardMaterial;
  private readonly trousers: THREE.MeshStandardMaterial;
  private readonly shoes = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.62 });
  private readonly hair: THREE.MeshStandardMaterial;
  private readonly blinkTargets: { mesh: THREE.Mesh; scaleY: number }[] = [];
  private outfitContext: NonNullable<AvatarAppearance['outfitContext']> = 'outdoor';
  private outfitId = 'outdoor_01';
  private readonly textures: THREE.Texture[] = [];
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftElbowPivot = new THREE.Group();
  private readonly rightElbowPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly leftKneePivot = new THREE.Group();
  private readonly rightKneePivot = new THREE.Group();
  private readonly leftAnklePivot = new THREE.Group();
  private readonly rightAnklePivot = new THREE.Group();
  private readonly anklePosition = new THREE.Vector3();
  private readonly lowerLegOrientation = new THREE.Quaternion();
  private readonly soleOrientation = new THREE.Quaternion();
  private readonly leftActionProps = new THREE.Group();
  private readonly rightActionProps = new THREE.Group();
  private readonly propMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xe7ddd0, roughness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: 0x7b8586, roughness: 0.48, metalness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: 0xb86f52, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0x67886c, roughness: 0.9 }),
  ] as const;
  private lastPropAction: AvatarAction | null = null;
  private elapsed = 0;
  private motionAction: AvatarAction | null = null;
  private actionElapsed = 0;
  private disposed = false;
  private gaitPhase = 0;
  private readonly leftHandTarget = new THREE.Vector3();
  private readonly rightHandTarget = new THREE.Vector3();
  private readonly bicycle = new THREE.Group();
  private readonly scooter = new THREE.Group();
  private readonly kayak = new THREE.Group();
  private kayakPaddle!: THREE.Mesh;
  private paddleAmplitude = 0;
  private readonly armDown = new THREE.Vector3(0, -1, 0);
  private readonly gripTarget = new THREE.Vector3();
  private readonly armDirection = new THREE.Vector3();
  private readonly elbowPole = new THREE.Vector3();
  private readonly upperDirection = new THREE.Vector3();
  private readonly forearmDirection = new THREE.Vector3();
  private readonly forearmOrientation = new THREE.Quaternion();
  private readonly autoRickshaw = new THREE.Group();
  private readonly basketItems: THREE.Mesh[] = [];
  private transportMode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw' = 'on_foot';
  private authored: AuthoredAvatarRig | null = null;
  private authoredMixer: THREE.AnimationMixer | null = null;
  private authoredAction: THREE.AnimationAction | null = null;
  private handProxyRest: {
    left: { parent: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion };
    right: { parent: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion };
  } | null = null;

  constructor(appearance: AvatarAppearance = {}) {
    this.outfitContext = appearance.outfitContext ?? inferOutfitContext(appearance.outfitId);
    this.outfitId = appearance.outfitId ?? `${this.outfitContext}_01`;
    const heightScale = THREE.MathUtils.clamp((appearance.height ?? 1.72) / 1.72, 0.92, 1.08);
    this.standingEyeHeight = 1.64 * heightScale;
    this.root.name = 'player-avatar-placeholder';
    this.root.scale.y = heightScale;
    const bodyWidth = THREE.MathUtils.clamp(appearance.bodyWidthScale ?? 1, 0.86, 1.16);
    this.torso.scale.x = bodyWidth;

    this.skin = new THREE.MeshStandardMaterial({ color: appearance.skinTone ?? 0xb77a5e, roughness: 0.82 });
    this.hair = new THREE.MeshStandardMaterial({ color: appearance.hairColor ?? 0x2f211b, roughness: 0.9 });
    this.shirt = new THREE.MeshStandardMaterial({ color: appearance.shirtColor ?? 0x536f68, roughness: 0.9 });
    this.trousers = new THREE.MeshStandardMaterial({ color: appearance.trouserColor ?? 0x394246, roughness: 0.92 });
    const cotton = createClothTextures('cotton'), denim = createClothTextures('denim');
    this.textures.push(cotton.color, cotton.height, denim.color, denim.height);
    this.shirt.map = cotton.color;
    this.shirt.bumpMap = cotton.height;
    this.shirt.bumpScale = 0.0012;
    this.trousers.map = denim.color;
    this.trousers.bumpMap = denim.height;
    this.trousers.bumpScale = 0.001;

    const pelvis = this.part(new THREE.CapsuleGeometry(0.1, 0.26, 6, 16).rotateZ(Math.PI / 2).scale(1, 1, 1.25), this.trousers, [0, 0.86, 0]);
    pelvis.name = 'avatar:pelvis';
    pelvis.scale.x = bodyWidth;
    this.root.add(pelvis);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.2, 8, 20), this.shirt);
    torsoMesh.name = 'avatar:shirt-body';
    torsoMesh.position.y = 1.18;
    torsoMesh.scale.set(1.1, 1, 0.82);
    this.torso.add(torsoMesh);
    const shoulderLine = this.part(new THREE.CapsuleGeometry(0.065, 0.55, 6, 14), this.shirt, [0, 1.4, 0]);
    shoulderLine.rotation.z = Math.PI / 2;
    shoulderLine.scale.y = bodyWidth;
    this.torso.add(shoulderLine);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 7, 20), this.shirt);
    collar.name = 'avatar:shirt:collar';
    collar.position.set(0, 1.505, -0.005);
    collar.rotation.x = Math.PI / 2;
    this.torso.add(collar);
    this.root.add(this.torso);
    this.buildOutfitSilhouette();

    this.root.add(this.part(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 8), this.skin, [0, 1.53, 0]));
    const faceShape = appearance.faceBase ?? 'face_01';
    const faceVariant = Number(faceShape.match(/(\d+)$/)?.[1] ?? 1);
    const faceWidth = faceVariant === 2 ? 0.91 : faceVariant === 3 ? 0.82 : 0.86;
    const faceHeight = faceVariant === 3 ? 1.13 : 1.08;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 24), this.skin);
    headMesh.name = 'avatar:face:base';
    headMesh.scale.set(faceWidth, faceHeight, 0.92);
    this.head.position.y = 1.53;
    headMesh.position.y = .14;
    headMesh.castShadow = true;
    this.head.add(headMesh);
    this.buildFace(appearance.faceBase ?? 'face_01');
    this.buildHair(appearance.hair ?? 'hair_01');
    if (appearance.facialHair) this.buildFacialHair(appearance.facialHair);
    if (appearance.glasses) this.buildGlasses(appearance.glasses);
    const nose = this.part(new THREE.SphereGeometry(0.026, 10, 8), this.skin, [0, 0.122, -0.188]);
    nose.name = 'avatar:face:nose';
    nose.scale.set(0.72, 1.5, 0.82);
    nose.rotation.x = Math.PI / 2;
    this.head.add(nose);
    const earGeometry = new THREE.SphereGeometry(0.036, 10, 8);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeometry, this.skin);
      ear.name = `avatar:face:ear-${side < 0 ? 'left' : 'right'}`;
      ear.position.set(side * 0.151, 0.13, -0.005);
      ear.scale.set(0.58, 0.9, 0.55);
      this.head.add(ear);
    }
    this.root.add(this.head);

    // Arms sit snug against the torso so the silhouette reads as one body rather than floating limbs.
    const shoulderX = 0.325 * bodyWidth;
    const leftArm = this.createArm(this.leftArmPivot, this.leftElbowPivot, -shoulderX, 'left');
    const rightArm = this.createArm(this.rightArmPivot, this.rightElbowPivot, shoulderX, 'right');
    this.root.add(this.leftArmPivot, this.rightArmPivot);
    this.hands = { left: leftArm, right: rightArm };
    this.leftActionProps.name = 'avatar:left-action-props';
    this.rightActionProps.name = 'avatar:right-action-props';
    this.hands.left.add(this.leftActionProps);
    this.hands.right.add(this.rightActionProps);
    this.buildActionProps();

    const hipX = 0.14 * bodyWidth;
    this.createLeg(this.leftLegPivot, this.leftKneePivot, this.leftAnklePivot, -hipX, 'left');
    this.createLeg(this.rightLegPivot, this.rightKneePivot, this.rightAnklePivot, hipX, 'right');
    this.root.add(this.leftLegPivot, this.rightLegPivot);
    this.body.name = 'avatar:body';
    for (const part of [...this.root.children]) this.body.add(part);
    this.root.add(this.body);
    this.buildBicycleVisual();
    this.buildScooterVisual();
    this.buildKayakVisual();
    this.buildAutoRickshawVisual();
    this.root.add(this.bicycle, this.scooter, this.kayak, this.autoRickshaw);
    this.bicycle.visible = false;
    this.scooter.visible = false;
    this.kayak.visible = false;
    this.autoRickshaw.visible = false;

    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  setFirstPerson(firstPerson: boolean): void {
    this.head.visible = !firstPerson;
    const headBone = this.authored?.bones.get('head');
    if (headBone) headBone.scale.setScalar(firstPerson ? 0.001 : 1);
  }

  setTransportMode(mode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw'): void {
    this.transportMode = mode;
    if (this.safetyEquipment.lifeJacketRoot.parent !== this.body) {
      this.safetyEquipment.lifeJacketRoot.position.set(0, 1.18, 0);
      this.body.add(this.safetyEquipment.lifeJacketRoot);
      this.head.add(this.safetyEquipment.helmetRoot);
    }
    this.safetyEquipment.setMode(mode);
    this.body.position.y = mode === 'kayak' ? -0.37 : 0;
    this.bicycle.visible = mode === 'bicycle';
    this.scooter.visible = mode === 'scooter';
    this.kayak.visible = mode === 'kayak';
    this.autoRickshaw.visible = mode === 'auto_rickshaw';
  }

  /**
   * Opt-in swap from the procedural body to the authored skinned GLB pieces.
   * All-or-nothing: any missing piece keeps the procedural body. Returns false
   * when nothing was attached (no index, missing file, load error).
   */
  async attachAuthored(source: AuthoredAvatarSource, appearance: AvatarAppearance = {}): Promise<boolean> {
    const rig = await loadAuthoredAvatar(source, appearance);
    if (!rig) return false;
    this.authoredSetup(rig);
    return true;
  }

  private authoredSetup(rig: AuthoredAvatarRig): void {
    this.authored = rig;
    rig.root.name = 'avatar:authored-body';
    rig.root.scale.setScalar(THREE.MathUtils.clamp(this.standingEyeHeight / Math.max(0.5, rig.eyeHeight), 0.85, 1.1));
    this.root.add(rig.root);
    for (const [index, part] of rig.partRoots.entries()) {
      part.name = `avatar:authored-part-${index}`;
      part.scale.copy(rig.root.scale);
      this.root.add(part);
      part.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }
    this.authoredMixer = new THREE.AnimationMixer(rig.root);
    rig.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const restOf = (proxy: THREE.Object3D) => ({
      parent: proxy.parent ?? this.body,
      position: proxy.position.clone(),
      quaternion: proxy.quaternion.clone(),
    });
    this.handProxyRest = { left: restOf(this.hands.left), right: restOf(this.hands.right) };
    const leftHandBone = rig.bones.get('hand.L');
    const rightHandBone = rig.bones.get('hand.R');
    if (leftHandBone && rightHandBone) {
      leftHandBone.add(this.hands.left);
      rightHandBone.add(this.hands.right);
      this.hands.left.position.set(0, 0, 0);
      this.hands.right.position.set(0, 0, 0);
      this.hands.left.quaternion.identity();
      this.hands.right.quaternion.identity();
    }
    this.body.visible = false;
  }

  /** Shows or hides the authored rig, and routes the hand proxies between authored bones and the procedural arms. */
  private setAuthoredMode(active: boolean): void {
    const rig = this.authored;
    if (!rig) return;
    rig.root.visible = active;
    for (const part of rig.partRoots) part.visible = active;
    this.body.visible = !active;
    if (this.handProxyRest) {
      for (const side of ['left', 'right'] as const) {
        const rest = this.handProxyRest[side];
        const proxy = this.hands[side];
        const bone = rig.bones.get(side === 'left' ? 'hand.L' : 'hand.R');
        const wantsParent = active && bone ? bone : rest.parent;
        if (proxy.parent !== wantsParent && wantsParent) {
          wantsParent.add(proxy);
          proxy.position.copy(active && bone ? new THREE.Vector3() : rest.position);
          proxy.quaternion.copy(active && bone ? new THREE.Quaternion() : rest.quaternion);
        }
      }
    }
  }

  /** Plays the matching authored clip and copies the pose onto the accessory rigs. False when no clip exists. */
  private authoredPose(delta: number, action: AvatarAction, speed: number, referenceSpeed: number): boolean {
    const rig = this.authored;
    const mixer = this.authoredMixer;
    if (!rig || !mixer) return false;
    const clipName = action === 'walk' ? 'walk' : action === 'jog' ? 'jog' : action === 'sit' ? 'sit' : 'idle';
    const clip = rig.clips[clipName];
    if (!clip) return false;
    const next = mixer.clipAction(clip);
    if (this.authoredAction !== next) {
      next.reset().fadeIn(0.18).play();
      if (this.authoredAction) this.authoredAction.fadeOut(0.18);
      this.authoredAction = next;
    }
    const gait = clipName === 'walk' || clipName === 'jog' ? avatarGaitFrequency(clipName) : 0;
    next.timeScale = gait > 0 ? gait * Math.min(1.5, Math.max(0.2, speed / referenceSpeed)) * clip.duration : 1;
    mixer.update(delta);
    for (const accessory of rig.accessoryBones) {
      for (const [name, bone] of accessory) {
        const lead = rig.bones.get(name);
        if (lead) {
          bone.quaternion.copy(lead.quaternion);
          bone.position.copy(lead.position);
        }
      }
    }
    return true;
  }

  setTransform(position: { x: number; y: number; z: number }, yaw: number, deltaSeconds = 0): void {
    this.root.position.set(position.x, position.y - 0.87, position.z);
    const turn = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
    this.root.rotation.y = deltaSeconds > 0 ? this.root.rotation.y + turn * (1 - Math.exp(-deltaSeconds * 10)) : yaw;
  }

  updateGaze(cameraYaw: number, cameraPitch: number, deltaSeconds: number): void {
    const target = gazeAngles(cameraYaw, cameraPitch, this.root.rotation.y);
    const blend = 1 - Math.exp(-Math.max(0, deltaSeconds) * 14);
    this.head.rotation.y += (target.yaw - this.head.rotation.y) * blend;
    this.head.rotation.x += (target.pitch - this.head.rotation.x) * blend;
  }

  updateMotion(deltaSeconds: number, action: AvatarAction, locomotion?: LocomotionSample): void {
    const delta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    this.elapsed += delta;
    this.updateExpression(action);
    if (this.motionAction !== action) {
      this.motionAction = action;
      this.actionElapsed = 0;
    }
    this.actionElapsed += delta;
    const referenceSpeed = action === 'jog' ? 3.2 : 1.6;
    const requestedSpeed = locomotion?.speed ?? (action === 'jog' ? 3.2 : action === 'walk' ? 1.6 : 0);
    const speed = Number.isFinite(requestedSpeed) ? Math.max(0, requestedSpeed) : 0;
    // Authored mode covers the on-foot basics; every other action or transport keeps the procedural body.
    const authoredActive = !!this.authored && this.transportMode === 'on_foot'
      && (action === 'idle' || action === 'walk' || action === 'jog' || action === 'sit');
    this.setAuthoredMode(authoredActive);
    if (authoredActive && this.authoredPose(delta, action, speed, referenceSpeed)) return;
    if (authoredActive) this.setAuthoredMode(false);
    let motionElapsed = action === 'idle' ? this.elapsed : this.actionElapsed;
    if (action === 'walk' || action === 'jog') {
      const frequency = avatarGaitFrequency(action);
      this.gaitPhase += delta * frequency * Math.min(1.5, speed / referenceSpeed);
      motionElapsed = this.gaitPhase / frequency;
    }
    const pose = sampleAvatarMotion({
      action,
      elapsedSeconds: motionElapsed,
      speed,
      ...(locomotion ? { directionX: locomotion.directionX, directionZ: locomotion.directionZ } : {}),
    });
    const blend = 1 - Math.exp(-delta * 16);
    if (action !== 'kayak') {
      this.leftArmPivot.rotation.y *= 1 - blend;
      this.rightArmPivot.rotation.y *= 1 - blend;
      this.leftElbowPivot.rotation.y *= 1 - blend;
      this.leftElbowPivot.rotation.z *= 1 - blend;
      this.rightElbowPivot.rotation.y *= 1 - blend;
      this.rightElbowPivot.rotation.z *= 1 - blend;
    }
    this.leftArmPivot.rotation.x += (pose.leftArmPitch - this.leftArmPivot.rotation.x) * blend;
    this.leftArmPivot.rotation.z += (pose.leftArmRoll - this.leftArmPivot.rotation.z) * blend;
    this.rightArmPivot.rotation.x += (pose.rightArmPitch - this.rightArmPivot.rotation.x) * blend;
    this.rightArmPivot.rotation.z += (pose.rightArmRoll - this.rightArmPivot.rotation.z) * blend;
    this.leftLegPivot.rotation.x += (pose.leftLegPitch - this.leftLegPivot.rotation.x) * blend;
    this.rightLegPivot.rotation.x += (pose.rightLegPitch - this.rightLegPivot.rotation.x) * blend;
    this.leftLegPivot.rotation.z += (pose.leftLegRoll - this.leftLegPivot.rotation.z) * blend;
    this.rightLegPivot.rotation.z += (pose.rightLegRoll - this.rightLegPivot.rotation.z) * blend;
    this.torso.rotation.x += (pose.torsoPitch - this.torso.rotation.x) * blend;
    this.torso.rotation.y += (pose.torsoYaw - this.torso.rotation.y) * blend;
    this.torso.position.y += (pose.breath - this.torso.position.y) * blend;

    this.updateActionProps(action);
    const bends = jointBends(action, motionElapsed, pose.leftLegPitch, pose.rightLegPitch);
    this.leftElbowPivot.rotation.x += (bends.leftElbow + Math.max(0, -pose.leftHandZ) * 0.22 - this.leftElbowPivot.rotation.x) * blend;
    this.rightElbowPivot.rotation.x += (bends.rightElbow + Math.max(0, -pose.rightHandZ) * 0.22 - this.rightElbowPivot.rotation.x) * blend;
    this.leftKneePivot.rotation.x += (bends.leftKnee - this.leftKneePivot.rotation.x) * blend;
    this.rightKneePivot.rotation.x += (bends.rightKnee - this.rightKneePivot.rotation.x) * blend;
    const groundContact = action === 'idle' || action === 'walk' || action === 'jog';
    this.updateAnkle(this.leftLegPivot, this.leftKneePivot, this.leftAnklePivot, groundContact);
    this.updateAnkle(this.rightLegPivot, this.rightKneePivot, this.rightAnklePivot, groundContact);

    const leftHandX = pose.leftHandX + 0.35;
    const rightHandX = pose.rightHandX - 0.35;
    this.leftHandTarget.set(leftHandX * 0.18, -0.34 + pose.leftHandY * 0.12, pose.leftHandZ * 0.1);
    this.rightHandTarget.set(rightHandX * 0.18, -0.34 + pose.rightHandY * 0.12, pose.rightHandZ * 0.1);
    this.hands.left.position.lerp(this.leftHandTarget, blend);
    this.hands.right.position.lerp(this.rightHandTarget, blend);
    if (action === 'kayak' && this.kayak.visible) {
      this.paddleAmplitude += (Math.min(1, speed / 2.4) - this.paddleAmplitude) * blend;
      this.kayakPaddle.rotation.z = Math.sin(this.actionElapsed * 3.8) * 0.75 * this.paddleAmplitude;
      this.solvePaddleArm(this.leftArmPivot, this.leftElbowPivot, this.hands.left, -0.35);
      this.solvePaddleArm(this.rightArmPivot, this.rightElbowPivot, this.hands.right, 0.35);
    } else {
      this.paddleAmplitude = 0;
    }
  }

  private solvePaddleArm(shoulder: THREE.Group, elbow: THREE.Group, hand: THREE.Object3D, gripX: number): void {
    // Both grips follow the same rigid shaft. Solve in body coordinates so
    // height scaling, world yaw and the seated offset cannot detach the hands.
    this.gripTarget.set(gripX, 0, 0).applyQuaternion(this.kayakPaddle.quaternion)
      .add(this.kayakPaddle.position).add(this.kayak.position).sub(this.body.position);
    this.armDirection.copy(this.gripTarget).sub(shoulder.position);
    const distance = THREE.MathUtils.clamp(this.armDirection.length(), 0.040001, 0.719999);
    this.armDirection.normalize();
    this.elbowPole.set(Math.sign(gripX), -0.5, 0);
    this.elbowPole.addScaledVector(this.armDirection, -this.elbowPole.dot(this.armDirection)).normalize();
    const cosine = THREE.MathUtils.clamp((0.38 ** 2 + distance ** 2 - 0.34 ** 2) / (2 * 0.38 * distance), -1, 1);
    this.upperDirection.copy(this.armDirection).multiplyScalar(cosine)
      .addScaledVector(this.elbowPole, Math.sqrt(1 - cosine * cosine));
    shoulder.quaternion.setFromUnitVectors(this.armDown, this.upperDirection);
    this.forearmDirection.copy(this.armDirection).multiplyScalar(distance)
      .addScaledVector(this.upperDirection, -0.38).normalize();
    this.forearmOrientation.setFromUnitVectors(this.armDown, this.forearmDirection);
    elbow.quaternion.copy(shoulder.quaternion).invert().multiply(this.forearmOrientation);
    hand.position.set(0, -0.34, 0);
  }

  getFootfallSerial(): number { return Math.floor((this.gaitPhase + Math.PI / 2) / Math.PI); }
  /** Increments each time a paddle blade reaches the water; null while the paddle is at rest. */
  getPaddleStrokeSerial(): number | null {
    return this.paddleAmplitude > 0.25 ? Math.floor((this.actionElapsed * 3.8 + Math.PI / 2) / Math.PI) : null;
  }

  private updateAnkle(hip: THREE.Group, knee: THREE.Group, ankle: THREE.Group, groundContact: boolean): void {
    if (!groundContact) { ankle.quaternion.identity(); return; }
    this.anklePosition.copy(ankle.position).applyQuaternion(knee.quaternion).add(knee.position)
      .applyQuaternion(hip.quaternion).add(hip.position);
    this.lowerLegOrientation.copy(hip.quaternion).multiply(knee.quaternion);
    const angle = 2 * Math.acos(Math.min(1, Math.abs(this.lowerLegOrientation.w)));
    const clearance = Math.max(0, this.anklePosition.y - 0.055);
    // A shoe vertex is at most 0.26m from the ankle. Limit swing tilt by
    // available clearance; near support the sole becomes level without
    // lifting the hips, stretching the shin or changing the stride phase.
    const swing = angle > 1e-6 ? Math.min(1, clearance / (0.28 * angle)) : 1;
    this.soleOrientation.identity().slerp(this.lowerLegOrientation, swing);
    ankle.quaternion.copy(this.lowerLegOrientation).invert().multiply(this.soleOrientation);
  }

  dispose(): void {
    this.safetyEquipment.dispose();
    if (this.disposed) return;
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>([this.skin, this.shirt, this.trousers, this.shoes, this.hair, ...this.propMaterials]);
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const geometry of geometries) if (!geometry.userData.togetherShared) geometry.dispose();
    for (const material of materials) if (!material.userData.togetherShared) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }

  private buildFace(faceBase: string): void {
    const whites = new THREE.MeshStandardMaterial({ color: 0xf2e8dc, roughness: 0.52 });
    const iris = new THREE.MeshStandardMaterial({ color: 0x49352b, roughness: 0.38 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x171514, roughness: 0.3 });
    const brow = new THREE.MeshStandardMaterial({ color: 0x382a24, roughness: 0.9 });
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x75463e, roughness: 0.82 });
    const variant = Number(faceBase.match(/(\d+)$/)?.[1] ?? 1);
    for (const side of [-1, 1]) {
      const suffix = side < 0 ? 'left' : 'right';
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), whites);
      eye.name = `avatar:face:eye-white-${suffix}`;
      eye.position.set(side * 0.064, 0.16, -0.151);
      eye.scale.set(1.12, variant === 3 ? 0.8 : 0.92, 0.42);
      this.blinkTargets.push({ mesh: eye, scaleY: eye.scale.y });
      this.head.add(eye);
      const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 9), iris);
      irisMesh.name = `avatar:face:iris-${suffix}`;
      irisMesh.position.set(side * 0.064, 0.159, -0.166);
      irisMesh.scale.z = 0.5;
      this.blinkTargets.push({ mesh: irisMesh, scaleY: irisMesh.scale.y });
      this.head.add(irisMesh);
      const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), pupil);
      pupilMesh.name = `avatar:face:pupil-${suffix}`;
      pupilMesh.position.set(side * 0.064, 0.159, -0.172);
      pupilMesh.scale.z = 0.5;
      this.blinkTargets.push({ mesh: pupilMesh, scaleY: pupilMesh.scale.y });
      this.head.add(pupilMesh);
      const eyebrow = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.045, 3, 7), brow);
      eyebrow.name = `avatar:face:brow-${suffix}`;
      eyebrow.position.set(side * 0.064, 0.202, -0.154);
      eyebrow.rotation.z = side * -0.08;
      eyebrow.rotation.x = Math.PI / 2;
      this.head.add(eyebrow);
    }
    const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.033, 3, 8), mouthMaterial);
    mouth.name = 'avatar:face:mouth';
    mouth.position.set(0, 0.067, -0.168);
    mouth.rotation.z = Math.PI / 2;
    mouth.rotation.x = Math.PI / 2;
    this.head.add(mouth);
    const openMouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x482b2a, roughness: 0.75 }),
    );
    openMouth.name = 'avatar:face:mouth-open';
    openMouth.position.set(0, 0.066, -0.169);
    openMouth.scale.set(1, 0.8, 0.3);
    openMouth.visible = false;
    this.head.add(openMouth);
  }

  private buildHair(hairStyle: string): void {
    const variant = Number(hairStyle.match(/(\d+)$/)?.[1] ?? 1);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.53), this.hair);
    cap.name = 'avatar:hair:cap';
    cap.scale.set(0.94, 1.02, 1);
    cap.position.y = 0.165;
    this.head.add(cap);

    const fringeGeometry = variant === 2
      ? new THREE.SphereGeometry(0.094, 14, 10)
      : variant === 3
        ? new THREE.CapsuleGeometry(0.048, 0.06, 4, 10)
        : new THREE.SphereGeometry(variant === 4 ? 0.108 : 0.073, 14, 10);
    const fringe = new THREE.Mesh(fringeGeometry, this.hair);
    fringe.name = 'avatar:hair:fringe';
    fringe.position.set(variant === 2 ? 0.035 : 0, variant === 3 ? 0.19 : 0.205, -0.137);
    fringe.scale.set(variant === 2 ? 1.15 : 1.18, variant === 3 ? 1.25 : 0.58, 0.55);
    if (variant === 2) fringe.rotation.z = -0.28;
    if (variant === 3) fringe.rotation.z = Math.PI / 2;
    this.head.add(fringe);

    const back = new THREE.Mesh(
      variant === 3 ? new THREE.CapsuleGeometry(0.105, 0.16, 5, 10) : new THREE.SphereGeometry(0.15, 16, 12),
      this.hair,
    );
    back.name = 'avatar:hair:back';
    back.position.set(0, variant === 3 ? 0.015 : 0.075, 0.07);
    back.scale.set(variant === 3 ? 1 : 0.92, variant === 3 ? 1 : 0.83, 0.62);
    this.head.add(back);

    if (variant === 3) {
      for (const side of [-1, 1]) {
        const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.12, 4, 8), this.hair);
        lock.name = `avatar:hair:side-lock-${side < 0 ? 'left' : 'right'}`;
        lock.position.set(side * 0.148, 0.04, 0.025);
        lock.rotation.z = side * -0.1;
        this.head.add(lock);
      }
    }
    if (variant === 4) {
      const curls: readonly (readonly [number, number, number])[] = [
        [-0.12, 0.23, -0.015], [-0.06, 0.27, 0.02], [0, 0.28, 0.035],
        [0.07, 0.27, 0.02], [0.13, 0.23, -0.01], [-0.15, 0.18, 0.03], [0.15, 0.18, 0.03],
      ];
      for (const [index, [x, y, z]] of curls.entries()) {
        const curl = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), this.hair);
        curl.name = `avatar:hair:curl-${index + 1}`;
        curl.position.set(x, y, z);
        this.head.add(curl);
      }
    }
  }

  private buildFacialHair(style: string): void {
    if (/^(none|clean|clean_shaven)$/i.test(style)) return;
    const variant = Number(style.match(/(\d+)$/)?.[1] ?? 1);
    const facialHair = new THREE.MeshStandardMaterial({ color: this.hair.color, roughness: 0.94 });
    if (/beard|goatee|facial.?hair/i.test(style)) {
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.087, 14, 10), facialHair);
      beard.name = 'avatar:facial-hair:beard';
      beard.position.set(0, 0.025, -0.126);
      beard.scale.set(0.94, variant === 2 ? 0.68 : 0.52, 0.62);
      this.head.add(beard);
    }
    if (/mustache|moustache|beard|goatee|facial.?hair/i.test(style)) {
      const moustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, variant === 3 ? 0.05 : 0.035, 3, 8), facialHair);
      moustache.name = 'avatar:facial-hair:mustache';
      moustache.position.set(0, 0.082, -0.169);
      moustache.rotation.z = Math.PI / 2;
      moustache.rotation.x = Math.PI / 2;
      this.head.add(moustache);
    }
  }

  private buildGlasses(style: string): void {
    const frame = new THREE.MeshStandardMaterial({ color: 0x332b28, roughness: 0.42, metalness: 0.12 });
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0xa9c2c5, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.18 });
    const round = /round|circle/i.test(style);
    for (const side of [-1, 1]) {
      const suffix = side < 0 ? 'left' : 'right';
      const radius = round ? 0.043 : 0.038;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0045, 6, round ? 20 : 4), frame);
      rim.name = `avatar:glasses:${suffix}-rim`;
      rim.position.set(side * 0.063, 0.16, -0.178);
      if (!round) rim.scale.set(1.12, 0.82, 1);
      this.head.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.004, 16), lensMaterial);
      lens.name = `avatar:glasses:${suffix}-lens`;
      lens.position.set(side * 0.063, 0.16, -0.177);
      this.head.add(lens);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.09, 2, 5), frame);
      arm.name = `avatar:glasses:${suffix}-temple`;
      arm.position.set(side * 0.132, 0.16, -0.113);
      arm.rotation.x = Math.PI / 2;
      this.head.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.035, 2, 5), frame);
    bridge.name = 'avatar:glasses:bridge';
    bridge.position.set(0, 0.16, -0.18);
    bridge.rotation.z = Math.PI / 2;
    bridge.rotation.x = Math.PI / 2;
    this.head.add(bridge);
  }

  private buildOutfitSilhouette(): void {
    if (this.outfitContext === 'home') {
      const hem = new THREE.Mesh(new THREE.TorusGeometry(0.208, 0.012, 6, 24), this.shirt);
      hem.name = 'avatar:outfit:home:hem';
      hem.position.y = 0.9;
      hem.rotation.x = Math.PI / 2;
      this.torso.add(hem);
      return;
    }
    if (this.outfitContext === 'outdoor') {
      const layer = new THREE.Mesh(new THREE.CapsuleGeometry(0.239, 0.19, 5, 12), this.shirt);
      layer.name = 'avatar:outfit:outdoor:layer';
      layer.position.set(0, 1.18, 0.005);
      layer.scale.set(1.09, 1, 0.9);
      this.torso.add(layer);
      return;
    }
    if (this.outfitContext === 'sleep') {
      const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.247, 0.21, 5, 12), this.shirt);
      top.name = 'avatar:outfit:sleep:top';
      top.position.set(0, 1.17, 0.005);
      top.scale.set(1.08, 1.04, 0.9);
      this.torso.add(top);
      return;
    }

    const repairUniform = /repair|mechanic|maintenance/i.test(this.outfitId);
    const front = new THREE.Mesh(
      repairUniform ? new THREE.BoxGeometry(0.38, 0.34, 0.035) : new THREE.BoxGeometry(0.3, 0.35, 0.032),
      this.trousers,
    );
    front.name = repairUniform ? 'avatar:outfit:work:utility-front' : 'avatar:outfit:work:apron-front';
    front.position.set(0, 1.055, -0.206);
    this.torso.add(front);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.14, 0.028), this.trousers);
    bib.name = repairUniform ? 'avatar:outfit:work:utility-chest' : 'avatar:outfit:work:apron-bib';
    bib.position.set(0, 1.3, -0.198);
    this.torso.add(bib);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.075, 0.016), this.shirt);
    pocket.name = 'avatar:outfit:work:pocket';
    pocket.position.set(0, 1.08, -0.23);
    this.torso.add(pocket);
  }

  private updateExpression(action: AvatarAction): void {
    const phase = (this.elapsed + 0.01) % 3.8;
    const blink = phase < 0.18 ? Math.sin(Math.PI * phase / 0.18) ** 2 : 0;
    for (const { mesh, scaleY } of this.blinkTargets) mesh.scale.y = scaleY * (1 - 0.94 * blink);
    const mouth = this.root.getObjectByName('avatar:face:mouth');
    const openMouth = this.root.getObjectByName('avatar:face:mouth-open');
    if (mouth) mouth.visible = action !== 'laugh';
    if (openMouth) openMouth.visible = action === 'laugh';
  }

  private createArm(
    pivot: THREE.Group,
    elbowPivot: THREE.Group,
    x: number,
    side: 'left' | 'right',
  ): THREE.Object3D {
    pivot.name = `avatar:${side}-shoulder`;
    pivot.position.set(x, 1.39, 0);

    const sleeveLength = this.outfitContext === 'home' ? 0.12
      : this.outfitContext === 'sleep' ? 0.34
        : this.outfitContext === 'work' ? 0.28 : 0.22;
    const upper = this.part(new THREE.CapsuleGeometry(0.072, sleeveLength, 6, 14), this.shirt, [0, -0.19, 0]);
    upper.name = `avatar:${side}-upper-arm`;
    pivot.add(upper);

    elbowPivot.name = `avatar:${side}-elbow`;
    elbowPivot.position.set(0, -0.38, 0);
    pivot.add(elbowPivot);

    const forearm = this.part(new THREE.CapsuleGeometry(0.062, 0.2, 6, 14), this.skin, [0, -0.17, 0]);
    forearm.name = `avatar:${side}-forearm`;
    elbowPivot.add(forearm);

    const hand = this.part(new THREE.SphereGeometry(0.078, 16, 12), this.skin, [0, -0.34, 0.01]);
    hand.name = `avatar:${side}-hand`;
    hand.scale.set(0.82, 1.05, 0.72);
    elbowPivot.add(hand);
    for (let finger = 0; finger < 4; finger += 1) {
      const digit = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.035, 3, 6), this.skin);
      digit.name = `avatar:${side}-hand:finger-${finger + 1}`;
      digit.position.set((finger - 1.5) * 0.025, -0.045 - Math.abs(finger - 1.5) * 0.004, -0.006);
      digit.rotation.z = (finger - 1.5) * 0.045;
      hand.add(digit);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.036, 3, 6), this.skin);
    thumb.name = `avatar:${side}-hand:thumb`;
    thumb.position.set(side === 'left' ? -0.064 : 0.064, -0.014, -0.002);
    thumb.rotation.z = side === 'left' ? -0.7 : 0.7;
    hand.add(thumb);
    return hand;
  }

  private createLeg(
    pivot: THREE.Group,
    kneePivot: THREE.Group,
    anklePivot: THREE.Group,
    x: number,
    side: 'left' | 'right',
  ): void {
    pivot.name = `avatar:${side}-hip`;
    pivot.position.set(x, 0.87, 0);

    const thigh = this.part(new THREE.CapsuleGeometry(0.09, 0.25, 6, 14), this.trousers, [0, -0.21, 0]);
    thigh.name = `avatar:${side}-thigh`;
    pivot.add(thigh);

    kneePivot.name = `avatar:${side}-knee`;
    kneePivot.position.set(0, -0.43, 0);
    pivot.add(kneePivot);

    const shin = this.part(new THREE.CapsuleGeometry(0.078, 0.22, 6, 14), this.trousers, [0, -0.19, 0]);
    shin.name = `avatar:${side}-shin`;
    kneePivot.add(shin);

    anklePivot.name = `avatar:${side}-ankle`;
    anklePivot.position.set(0, -0.385, 0);
    kneePivot.add(anklePivot);
    const shoeGeometry = new THREE.CapsuleGeometry(0.055, 0.21, 6, 14).rotateX(Math.PI / 2).scale(0.19 / 0.11, 1, 1);
    // Tessellated caps sit fractionally above the ideal radius; seat the sole exactly on the ankle baseline.
    shoeGeometry.computeBoundingBox();
    shoeGeometry.translate(0, -0.055 - shoeGeometry.boundingBox!.min.y, 0);
    const shoe = this.part(shoeGeometry, this.shoes, [0, 0, -0.075]);
    shoe.name = `avatar:${side}-shoe`;
    anklePivot.add(shoe);
  }

  private buildActionProps(): void {
    const [ceramic, metal, warm, green] = this.propMaterials;

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.018, 16), ceramic);
    dish.name = 'avatar:prop:dish';
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, -0.02, -0.1);
    this.leftActionProps.add(dish);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.1, 10), ceramic);
    cup.name = 'avatar:prop:cup';
    cup.position.set(0.02, -0.02, -0.09);
    this.leftActionProps.add(cup);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.075, 0.07, 12), ceramic);
    bowl.name = 'avatar:prop:bowl';
    bowl.position.set(0.02, -0.02, -0.1);
    this.leftActionProps.add(bowl);

    const produce = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), green);
    produce.name = 'avatar:prop:produce';
    produce.scale.set(1.25, 0.75, 1);
    produce.position.set(0, -0.02, -0.1);
    this.leftActionProps.add(produce);

    const knife = new THREE.Group();
    knife.name = 'avatar:prop:knife';
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.2, 0.09), metal);
    blade.position.y = -0.1;
    const knifeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.055), warm);
    knifeHandle.position.y = 0.055;
    knife.add(blade, knifeHandle);
    knife.rotation.z = -0.1;
    knife.position.set(0, -0.04, -0.08);
    this.rightActionProps.add(knife);

    const sponge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.08), warm);
    sponge.name = 'avatar:prop:sponge';
    sponge.position.set(0, -0.03, -0.08);
    this.rightActionProps.add(sponge);

    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.13), green);
    cloth.name = 'avatar:prop:cloth';
    cloth.position.set(0, -0.025, -0.08);
    cloth.rotation.z = 0.18;
    this.rightActionProps.add(cloth);

    const spoon = new THREE.Group();
    spoon.name = 'avatar:prop:spoon';
    const spoonHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), metal);
    spoonHandle.position.y = -0.11;
    const spoonHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 5), metal);
    spoonHead.scale.set(0.8, 1.25, 0.45);
    spoonHead.position.y = -0.24;
    spoon.add(spoonHandle, spoonHead);
    spoon.position.set(0, -0.02, -0.08);
    this.rightActionProps.add(spoon);

    const jug = new THREE.Group();
    jug.name = 'avatar:prop:jug';
    const jugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.14, 10), metal);
    jugBody.position.y = -0.06;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.12, 7), metal);
    spout.rotation.z = Math.PI / 2.6;
    spout.position.set(-0.075, -0.03, 0);
    jug.add(jugBody, spout);
    jug.position.set(0, -0.02, -0.08);
    this.rightActionProps.add(jug);

    const wateringCan = new THREE.Group();
    wateringCan.name = 'avatar:prop:watering-can';
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.15, 10), green);
    canBody.position.y = -0.07;
    const canSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.19, 7), green);
    canSpout.rotation.z = Math.PI / 2.35;
    canSpout.position.set(-0.105, -0.05, 0);
    wateringCan.add(canBody, canSpout);
    wateringCan.position.set(0, -0.02, -0.08);
    this.rightActionProps.add(wateringCan);

    const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.18, 0.2), warm);
    parcel.name = 'avatar:prop:parcel';
    parcel.position.set(0, -0.05, -0.13);
    this.rightActionProps.add(parcel);

    for (const root of [this.leftActionProps, this.rightActionProps]) {
      for (const child of root.children) child.visible = false;
    }
  }

  private updateActionProps(action: AvatarAction): void {
    if (this.lastPropAction === action) return;
    this.lastPropAction = action;
    for (const root of [this.leftActionProps, this.rightActionProps]) {
      for (const child of root.children) child.visible = false;
    }

    const show = (name: string) => {
      const prop = this.root.getObjectByName(name);
      if (prop) prop.visible = true;
    };

    switch (action) {
      case 'cut':
        show('avatar:prop:knife');
        show('avatar:prop:produce');
        break;
      case 'wash':
      case 'scrub':
        show('avatar:prop:dish');
        show('avatar:prop:sponge');
        break;
      case 'wipe':
      case 'fold':
        show('avatar:prop:cloth');
        break;
      case 'stir':
        show('avatar:prop:bowl');
        show('avatar:prop:spoon');
        break;
      case 'pour':
        show('avatar:prop:cup');
        show('avatar:prop:jug');
        break;
      case 'water':
        show('avatar:prop:watering-can');
        break;
      case 'pick_up':
      case 'place':
      case 'carry':
      case 'hand_over':
      case 'receive':
        show('avatar:prop:parcel');
        break;
      default:
        break;
    }
  }

  private buildBicycleVisual(): void {
    this.bicycle.name = 'transport:bicycle-development';
    const metal = new THREE.MeshStandardMaterial({ color: 0x35413f, roughness: 0.55, metalness: 0.3 });
    const paint = new THREE.MeshStandardMaterial({ color: 0xc8453a, roughness: 0.55, metalness: 0.15 });
    const wicker = new THREE.MeshStandardMaterial({ color: 0xc9a36a, roughness: 0.92 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 });
    for (const z of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.028, 8, 28), metal);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.35, z);
      this.bicycle.add(wheel);
      // Thin spokes read as a real wheel from close up.
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.64, 4), metal);
        rod.rotation.x = spoke / 8 * Math.PI;
        rod.position.set(0, 0.35, z);
        this.bicycle.add(rod);
      }
    }
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.92, 8), paint);
    frame.rotation.x = Math.PI / 2;
    frame.position.set(0, 0.52, 0);
    this.bicycle.add(frame);
    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.62, 8), paint);
    downTube.rotation.x = Math.PI / 2 - 0.62;
    downTube.position.set(0, 0.5, -0.2);
    this.bicycle.add(downTube);
    const chainGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.5), paint);
    chainGuard.position.set(0.06, 0.34, 0.22);
    this.bicycle.add(chainGuard);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.58, 8), metal);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0.86, -0.45);
    this.bicycle.add(handle);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.26), leather);
    seat.position.set(0, 0.8, 0.18);
    this.bicycle.add(seat);
    // Wicker front basket; produce appears when the household has fresh groceries.
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.2, 12, 1, true), wicker);
    basket.name = 'transport:bicycle-basket';
    basket.position.set(0, 0.78, -0.66);
    this.bicycle.add(basket);
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), wicker);
    base.rotation.x = -Math.PI / 2;
    base.position.set(0, 0.685, -0.66);
    this.bicycle.add(base);
    const produceColors = [0xe0533d, 0xf2c14e, 0x5f9e4a, 0xe08a3c];
    produceColors.forEach((color, index) => {
      const item = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      item.name = `transport:basket-item-${index}`;
      item.position.set((index % 2 - 0.5) * 0.12, 0.78, -0.66 + (Math.floor(index / 2) - 0.5) * 0.1);
      item.visible = false;
      this.basketItems.push(item);
      this.bicycle.add(item);
    });
    this.bicycle.position.set(0, 0, 0.05);
  }

  /** Shows up to four produce items in the bicycle basket. */
  setBasketLoad(items: number): void {
    const count = Math.max(0, Math.min(this.basketItems.length, Math.floor(Number.isFinite(items) ? items : 0)));
    this.basketItems.forEach((item, index) => { item.visible = index < count; });
  }

  private buildScooterVisual(): void {
    this.scooter.name = 'transport:scooter-development';
    const metal = new THREE.MeshStandardMaterial({ color: 0x3d4648, roughness: 0.58, metalness: 0.18 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6f857d, roughness: 0.72 });
    for (const z of [-0.52, 0.5]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 16), metal);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.23, z);
      this.scooter.add(wheel);
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.95), bodyMat);
    body.position.set(0, 0.42, 0.05);
    this.scooter.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.9, 8), metal);
    stem.position.set(0, 0.82, -0.38);
    stem.rotation.x = -0.18;
    this.scooter.add(stem);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.04), metal);
    handle.position.set(0, 1.24, -0.46);
    this.scooter.add(handle);
    this.scooter.position.set(0, 0, 0.02);
  }

  private buildAutoRickshawVisual(): void {
    this.autoRickshaw.name = 'transport:auto-rickshaw-development';
    const body = new THREE.MeshStandardMaterial({ color: 0xe0b438, roughness: 0.72, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x26302f, roughness: 0.68, metalness: 0.15 });
    const canopy = new THREE.MeshStandardMaterial({ color: 0x2f4b3f, roughness: 0.9 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 1.9), body);
    cabin.position.set(0, 0.54, 0.1); this.autoRickshaw.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 1.52), canopy);
    roof.position.set(0, 1.28, 0.18); this.autoRickshaw.add(roof);
    for (const z of [-0.58, 0.62]) {
      for (const x of [-0.62, 0.62]) {
        if (z > 0.5 && x > 0) continue;
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.055, 7, 16), dark);
        wheel.rotation.y = Math.PI / 2; wheel.position.set(x, 0.285, z); this.autoRickshaw.add(wheel);
      }
    }
    this.autoRickshaw.position.set(0, 0, 0.18);
  }

  private buildKayakVisual(): void {
    this.kayak.name = 'transport:kayak-development';
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x7f5a46, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd6c9a5, roughness: 0.72 });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.9, 5, 12), hullMat);
    hull.rotation.x = Math.PI / 2;
    hull.scale.z = 0.65;
    hull.position.set(0, 0.18, 0);
    this.kayak.add(hull);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.55), trimMat);
    seat.position.set(0, 0.36, 0.05);
    this.kayak.add(seat);
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.035, 0.045), trimMat);
    paddle.name = 'transport:kayak-paddle';
    paddle.position.set(0, 0.84, -0.48);
    this.kayakPaddle = paddle;
    const bladeGeometry = new THREE.BoxGeometry(0.3, 0.025, 0.2);
    for (const x of [-0.98, 0.98]) {
      const blade = new THREE.Mesh(bladeGeometry, trimMat);
      blade.position.x = x;
      paddle.add(blade);
    }
    this.kayak.add(paddle);
    this.kayak.position.set(0, -0.01, 0.05);
  }

  private part(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    return mesh;
  }
}

function inferOutfitContext(outfitId?: string): NonNullable<AvatarAppearance['outfitContext']> {
  const value = outfitId?.toLowerCase() ?? '';
  if (value.startsWith('home')) return 'home';
  if (value.startsWith('sleep') || value.includes('pajama')) return 'sleep';
  if (value.startsWith('work') || value.startsWith('job_') || /uniform|barista|repair|mechanic|gardener/.test(value)) return 'work';
  return 'outdoor';
}

function jointBends(
  action: AvatarAction,
  elapsed: number,
  leftLegPitch: number,
  rightLegPitch: number,
): { leftElbow: number; rightElbow: number; leftKnee: number; rightKnee: number } {
  let leftElbow = 0.08;
  let rightElbow = 0.08;
  let leftKnee = Math.max(0, leftLegPitch) * 0.42;
  let rightKnee = Math.max(0, rightLegPitch) * 0.42;

  switch (action) {
    case 'sit':
      leftElbow = rightElbow = 0.34;
      leftKnee = rightKnee = 1.18;
      break;
    case 'sleep':
      leftElbow = 0.22;
      rightElbow = 0.28;
      leftKnee = 0.16;
      rightKnee = 0.24;
      break;
    case 'cycle': {
      const pedal = Math.sin(elapsed * Math.PI * 3.8);
      leftElbow = rightElbow = 0.34;
      leftKnee = 0.62 + Math.max(0, pedal) * 0.72;
      rightKnee = 0.62 + Math.max(0, -pedal) * 0.72;
      break;
    }
    case 'scooter':
      leftElbow = rightElbow = 0.28;
      leftKnee = 0.18;
      rightKnee = 0.12;
      break;
    case 'kayak':
      leftElbow = 0.46;
      rightElbow = 0.46;
      leftKnee = rightKnee = -0.35;
      break;
    case 'carry':
    case 'receive':
    case 'wash':
    case 'fold':
      leftElbow = rightElbow = 0.58;
      break;
    case 'pick_up':
    case 'place':
      leftElbow = rightElbow = 0.48;
      leftKnee = rightKnee = 0.18;
      break;
    case 'cut':
    case 'stir':
    case 'scrub':
    case 'wipe':
    case 'pour':
    case 'water':
      leftElbow = 0.42;
      rightElbow = 0.64;
      break;
    case 'hand_over':
    case 'point':
    case 'high_five':
    case 'wave':
      rightElbow = 0.2;
      break;
    case 'type':
      leftElbow = rightElbow = 0.66;
      break;
    default:
      break;
  }

  return { leftElbow, rightElbow, leftKnee, rightKnee };
}
