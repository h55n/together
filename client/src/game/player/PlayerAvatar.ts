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
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
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

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.48, 5, 8), this.shirt);
    torsoMesh.position.y = 1.18;
    torsoMesh.scale.set(1, 1, 0.72);
    this.torso.add(torsoMesh);
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
    this.root.add(this.head);

    const leftArm = this.createArm(this.leftArmPivot, -0.35);
    const rightArm = this.createArm(this.rightArmPivot, 0.35);
    this.root.add(this.leftArmPivot, this.rightArmPivot);
    this.hands = { left: leftArm, right: rightArm };

    this.createLeg(this.leftLegPivot, -0.14);
    this.createLeg(this.rightLegPivot, 0.14);
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

    this.hands.left.position.set(pose.leftHandX + 0.35, -0.48 + pose.leftHandY, pose.leftHandZ);
    this.hands.right.position.set(pose.rightHandX - 0.35, -0.48 + pose.rightHandY, pose.rightHandZ);
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.skin.dispose();
    this.shirt.dispose();
    this.trousers.dispose();
    this.hair.dispose();
  }

  private createArm(pivot: THREE.Group, x: number): THREE.Object3D {
    pivot.position.set(x, 1.39, 0);
    const upper = this.part(new THREE.CapsuleGeometry(0.075, 0.36, 4, 7), this.shirt, [0, -0.2, 0]);
    pivot.add(upper);
    const hand = this.part(new THREE.SphereGeometry(0.082, 8, 7), this.skin, [0, -0.48, 0.01]);
    pivot.add(hand);
    return hand;
  }

  private createLeg(pivot: THREE.Group, x: number): void {
    pivot.position.set(x, 0.87, 0);
    const leg = this.part(new THREE.CapsuleGeometry(0.09, 0.58, 4, 7), this.trousers, [0, -0.34, 0]);
    pivot.add(leg);
    const shoe = this.part(new THREE.BoxGeometry(0.19, 0.11, 0.32), this.trousers, [0, -0.74, -0.07]);
    pivot.add(shoe);
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
