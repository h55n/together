import * as THREE from 'three';
import { sampleAvatarMotion, type AvatarAction } from '@together/shared';

export type AvatarAppearance = {
  skinTone?: THREE.ColorRepresentation;
  shirtColor?: THREE.ColorRepresentation;
  trouserColor?: THREE.ColorRepresentation;
  height?: number;
  bodyWidthScale?: number;
  hairColor?: THREE.ColorRepresentation;
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
  readonly eyeHeight: number;
  readonly placeholder = true;

  private readonly skin: THREE.MeshStandardMaterial;
  private readonly shirt: THREE.MeshStandardMaterial;
  private readonly trousers: THREE.MeshStandardMaterial;
  private readonly hair: THREE.MeshStandardMaterial;
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftElbowPivot = new THREE.Group();
  private readonly rightElbowPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly leftKneePivot = new THREE.Group();
  private readonly rightKneePivot = new THREE.Group();
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
  private readonly bicycle = new THREE.Group();
  private readonly scooter = new THREE.Group();
  private readonly kayak = new THREE.Group();
  private readonly autoRickshaw = new THREE.Group();

  constructor(appearance: AvatarAppearance = {}) {
    const heightScale = THREE.MathUtils.clamp((appearance.height ?? 1.72) / 1.72, 0.92, 1.08);
    this.eyeHeight = 1.64 * heightScale;
    this.root.name = 'player-avatar-placeholder';
    this.root.scale.y = heightScale;
    const bodyWidth = THREE.MathUtils.clamp(appearance.bodyWidthScale ?? 1, 0.86, 1.16);
    this.torso.scale.x = bodyWidth;

    this.skin = new THREE.MeshStandardMaterial({ color: appearance.skinTone ?? 0xb77a5e, roughness: 0.82 });
    this.hair = new THREE.MeshStandardMaterial({ color: appearance.hairColor ?? 0x2f211b, roughness: 0.9 });
    this.shirt = new THREE.MeshStandardMaterial({ color: appearance.shirtColor ?? 0x536f68, roughness: 0.9 });
    this.trousers = new THREE.MeshStandardMaterial({ color: appearance.trouserColor ?? 0x394246, roughness: 0.92 });

    const pelvis = this.part(new THREE.BoxGeometry(0.46, 0.2, 0.25), this.trousers, [0, 0.86, 0]);
    pelvis.name = 'avatar:pelvis';
    pelvis.scale.x = bodyWidth;
    this.root.add(pelvis);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.48, 5, 8), this.shirt);
    torsoMesh.position.y = 1.18;
    torsoMesh.scale.set(1, 1, 0.72);
    this.torso.add(torsoMesh);
    const shoulderLine = this.part(new THREE.BoxGeometry(0.68, 0.13, 0.23), this.shirt, [0, 1.4, 0]);
    shoulderLine.scale.x = bodyWidth;
    this.torso.add(shoulderLine);
    this.root.add(this.torso);

    this.root.add(this.part(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 8), this.skin, [0, 1.53, 0]));
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), this.skin);
    headMesh.scale.set(0.86, 1.08, 0.92);
    headMesh.position.y = 1.67;
    headMesh.castShadow = true;
    this.head.add(headMesh);
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.184, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), this.hair);
    hairMesh.scale.set(0.9, 1.02, 0.96);
    hairMesh.position.y = 1.695;
    hairMesh.castShadow = true;
    this.head.add(hairMesh);
    for (const x of [-0.065, 0.065]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), this.hair);
      eye.position.set(x, 1.69, -0.163);
      eye.scale.y = 0.8;
      this.head.add(eye);
    }
    const nose = this.part(new THREE.ConeGeometry(0.026, 0.07, 6), this.skin, [0, 1.655, -0.184]);
    nose.rotation.x = Math.PI / 2;
    this.head.add(nose);
    this.root.add(this.head);

    const shoulderX = 0.35 * bodyWidth;
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
    this.createLeg(this.leftLegPivot, this.leftKneePivot, -hipX, 'left');
    this.createLeg(this.rightLegPivot, this.rightKneePivot, hipX, 'right');
    this.root.add(this.leftLegPivot, this.rightLegPivot);
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
  }

  setTransportMode(mode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw'): void {
    this.bicycle.visible = mode === 'bicycle';
    this.scooter.visible = mode === 'scooter';
    this.kayak.visible = mode === 'kayak';
    this.autoRickshaw.visible = mode === 'auto_rickshaw';
  }

  setTransform(position: { x: number; y: number; z: number }, yaw: number): void {
    this.root.position.set(position.x, position.y - 0.87, position.z);
    this.root.rotation.y = yaw;
  }

  updateMotion(deltaSeconds: number, action: AvatarAction): void {
    this.elapsed += Math.max(0, deltaSeconds);
    const pose = sampleAvatarMotion({
      action,
      elapsedSeconds: this.elapsed,
      speed: action === 'jog' ? 3.2 : action === 'walk' ? 1.6 : 0,
    });

    this.leftArmPivot.rotation.set(pose.leftArmPitch, 0, pose.leftArmRoll);
    this.rightArmPivot.rotation.set(pose.rightArmPitch, 0, pose.rightArmRoll);
    this.leftLegPivot.rotation.x = pose.leftLegPitch;
    this.rightLegPivot.rotation.x = pose.rightLegPitch;
    this.torso.rotation.set(pose.torsoPitch, pose.torsoYaw, 0);
    this.torso.position.y = pose.breath;

    this.updateActionProps(action);
    const bends = jointBends(action, this.elapsed, pose.leftLegPitch, pose.rightLegPitch);
    this.leftElbowPivot.rotation.x = bends.leftElbow + Math.max(0, -pose.leftHandZ) * 0.22;
    this.rightElbowPivot.rotation.x = bends.rightElbow + Math.max(0, -pose.rightHandZ) * 0.22;
    this.leftKneePivot.rotation.x = bends.leftKnee;
    this.rightKneePivot.rotation.x = bends.rightKnee;

    const leftHandX = pose.leftHandX + 0.35;
    const rightHandX = pose.rightHandX - 0.35;
    this.hands.left.position.set(leftHandX * 0.18, -0.34 + pose.leftHandY * 0.12, pose.leftHandZ * 0.1);
    this.hands.right.position.set(rightHandX * 0.18, -0.34 + pose.rightHandY * 0.12, pose.rightHandZ * 0.1);
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.skin.dispose();
    this.shirt.dispose();
    this.trousers.dispose();
    this.hair.dispose();
    for (const material of this.propMaterials) material.dispose();
  }

  private createArm(
    pivot: THREE.Group,
    elbowPivot: THREE.Group,
    x: number,
    side: 'left' | 'right',
  ): THREE.Object3D {
    pivot.name = `avatar:${side}-shoulder`;
    pivot.position.set(x, 1.39, 0);

    const upper = this.part(new THREE.CapsuleGeometry(0.072, 0.22, 4, 7), this.shirt, [0, -0.19, 0]);
    upper.name = `avatar:${side}-upper-arm`;
    pivot.add(upper);

    elbowPivot.name = `avatar:${side}-elbow`;
    elbowPivot.position.set(0, -0.38, 0);
    pivot.add(elbowPivot);

    const forearm = this.part(new THREE.CapsuleGeometry(0.062, 0.2, 4, 7), this.skin, [0, -0.17, 0]);
    forearm.name = `avatar:${side}-forearm`;
    elbowPivot.add(forearm);

    const hand = this.part(new THREE.SphereGeometry(0.078, 8, 7), this.skin, [0, -0.34, 0.01]);
    hand.name = `avatar:${side}-hand`;
    hand.scale.set(0.82, 1.05, 0.72);
    elbowPivot.add(hand);
    return hand;
  }

  private createLeg(
    pivot: THREE.Group,
    kneePivot: THREE.Group,
    x: number,
    side: 'left' | 'right',
  ): void {
    pivot.name = `avatar:${side}-hip`;
    pivot.position.set(x, 0.87, 0);

    const thigh = this.part(new THREE.CapsuleGeometry(0.09, 0.25, 4, 7), this.trousers, [0, -0.21, 0]);
    thigh.name = `avatar:${side}-thigh`;
    pivot.add(thigh);

    kneePivot.name = `avatar:${side}-knee`;
    kneePivot.position.set(0, -0.43, 0);
    pivot.add(kneePivot);

    const shin = this.part(new THREE.CapsuleGeometry(0.078, 0.22, 4, 7), this.trousers, [0, -0.19, 0]);
    shin.name = `avatar:${side}-shin`;
    kneePivot.add(shin);

    const shoe = this.part(new THREE.BoxGeometry(0.19, 0.11, 0.32), this.trousers, [0, -0.42, -0.075]);
    shoe.name = `avatar:${side}-shoe`;
    kneePivot.add(shoe);
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
    const metal = new THREE.MeshStandardMaterial({ color: 0x35413f, roughness: 0.62, metalness: 0.22 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x8f5d4d, roughness: 0.8 });
    for (const z of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 18), metal);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.35, z);
      this.bicycle.add(wheel);
    }
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 8), accent);
    frame.rotation.x = Math.PI / 2;
    frame.position.set(0, 0.5, 0);
    this.bicycle.add(frame);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.035), metal);
    handle.position.set(0, 0.83, -0.45);
    this.bicycle.add(handle);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.18), metal);
    seat.position.set(0, 0.78, 0.18);
    this.bicycle.add(seat);
    this.bicycle.position.set(0, -0.86, 0.05);
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
    this.scooter.position.set(0, -0.86, 0.02);
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
        wheel.rotation.y = Math.PI / 2; wheel.position.set(x, 0.24, z); this.autoRickshaw.add(wheel);
      }
    }
    this.autoRickshaw.position.set(0, -0.9, 0.18);
  }

  private buildKayakVisual(): void {
    this.kayak.name = 'transport:kayak-development';
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x7f5a46, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd6c9a5, roughness: 0.72 });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.9, 5, 12), hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.z = 0.65;
    hull.position.set(0, 0.18, 0);
    this.kayak.add(hull);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.55), trimMat);
    seat.position.set(0, 0.36, 0.05);
    this.kayak.add(seat);
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.035, 0.09), trimMat);
    paddle.rotation.z = 0.16;
    paddle.position.set(0, 0.84, -0.08);
    this.kayak.add(paddle);
    this.kayak.position.set(0, -0.88, 0.05);
  }

  private part(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    return mesh;
  }
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
      leftKnee = rightKnee = 0.72;
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

