import * as THREE from 'three';
import { BADMINTON_SURFACE_Y, badmintonShuttlePosition, type BadmintonMatch } from '@together/shared';

type PlayerRig = { body: THREE.Group; arm: THREE.Group; legs: readonly [THREE.Group, THREE.Group] };

/** Visual interpolation only. All contacts, points and turns come from the server. */
export class BadmintonPresentation {
  private readonly group = new THREE.Group();
  private readonly shuttle: THREE.Mesh;
  private readonly players: PlayerRig[] = [];
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {
    this.group.name = 'badminton-presentation';
    this.group.position.set(232, BADMINTON_SURFACE_Y, 82);
    const cork = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfffbdf, emissive: 0xffd982, emissiveIntensity: 0.35 }));
    cork.name = 'badminton-shuttle'; this.shuttle = cork;
    const feathers = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.25, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    feathers.position.y = 0.17; cork.add(feathers); cork.visible = false; this.group.add(cork);
    for (let side = 0; side < 2; side++) {
      const player = new THREE.Group(); player.name = `badminton-player-${side}`;
      player.position.x = side === 0 ? -4 : 4;
      player.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
      const skin = new THREE.MeshStandardMaterial({ color: side === 0 ? 0xba805b : 0x926446, roughness: 0.9 });
      const shirt = new THREE.MeshStandardMaterial({ color: side === 0 ? 0xe5a24e : 0x68bec5, roughness: 0.85 });
      const shorts = new THREE.MeshStandardMaterial({ color: side === 0 ? 0x4c626a : 0x3c5260, roughness: 0.95 });
      const shoes = new THREE.MeshStandardMaterial({ color: 0xf4eedd, roughness: 0.8 });
      const hair = new THREE.MeshStandardMaterial({ color: 0x302821, roughness: 0.95 });
      const addMesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      };
      addMesh(player, new THREE.CapsuleGeometry(0.23, 0.29, 4, 8), shirt, 0, 1.13).scale.z = 0.75;
      addMesh(player, new THREE.SphereGeometry(0.2, 12, 8), skin, 0, 1.64);
      const cap = addMesh(player, new THREE.SphereGeometry(0.205, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 1.67);
      cap.rotation.x = -0.12;
      addMesh(player, new THREE.CylinderGeometry(0.075, 0.075, 0.15, 8), skin, 0, 1.43);
      // The face points along local +z, so both court ends face the net.
      addMesh(player, new THREE.SphereGeometry(0.035, 6, 5), skin, 0, 1.62, 0.197);
      const legs: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
      legs.forEach((leg, index) => {
        leg.position.set(index === 0 ? -0.13 : 0.13, 0.83, 0); player.add(leg);
        addMesh(leg, new THREE.CapsuleGeometry(0.095, 0.2, 3, 6), shorts, 0, -0.15);
        addMesh(leg, new THREE.CylinderGeometry(0.065, 0.055, 0.33, 6), skin, 0, -0.51);
        addMesh(leg, new THREE.BoxGeometry(0.17, 0.1, 0.3), shoes, 0, -0.78, 0.07);
      });
      const arm = new THREE.Group(); arm.name = `badminton-arm-${side}`; arm.position.set(-0.29, 1.34, 0);
      arm.rotation.x = -0.85; arm.rotation.z = -0.15; player.add(arm);
      addMesh(arm, new THREE.CylinderGeometry(0.09, 0.075, 0.2, 6), shirt, 0, -0.07);
      addMesh(arm, new THREE.CylinderGeometry(0.065, 0.05, 0.28, 6), skin, 0, -0.26);
      const forearm = new THREE.Group(); forearm.position.y = -0.4; forearm.rotation.x = -0.65; arm.add(forearm);
      addMesh(forearm, new THREE.CylinderGeometry(0.05, 0.04, 0.25, 6), skin, 0, -0.12);
      const hand = new THREE.Group(); hand.name = `badminton-hand-${side}`; hand.position.y = -0.26; forearm.add(hand);
      addMesh(hand, new THREE.SphereGeometry(0.055, 6, 5), skin, 0, 0);
      const freeArm = new THREE.Group(); freeArm.position.set(0.29, 1.34, 0); freeArm.rotation.z = 0.13; player.add(freeArm);
      addMesh(freeArm, new THREE.CylinderGeometry(0.09, 0.07, 0.2, 6), shirt, 0, -0.07);
      addMesh(freeArm, new THREE.CylinderGeometry(0.06, 0.04, 0.46, 6), skin, 0, -0.35);
      const racket = new THREE.Group(); racket.name = `badminton-racket-${side}`;
      const material = new THREE.MeshStandardMaterial({ color: side === 0 ? 0xf0b861 : 0x84d9e4 });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 20), material);
      rim.scale.y = 1.3; rim.position.y = 0.5;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x40454b }));
      const strings = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.2, 0.5, 0), new THREE.Vector3(0.2, 0.5, 0),
        new THREE.Vector3(0, 0.23, 0), new THREE.Vector3(0, 0.77, 0),
      ]), new THREE.LineBasicMaterial({ color: 0xf5eee0 }));
      racket.add(rim, grip, strings);
      racket.rotation.x = -0.2; hand.add(racket);
      this.players.push({ body: player, arm, legs }); this.group.add(player);
    }
    this.scene.add(this.group);
  }

  update(match: BadmintonMatch, now: number): void {
    if (this.disposed) return;
    const active = match.phase === 'ready' || match.phase === 'rally';
    this.group.visible = active;
    this.shuttle.visible = active && match.phase === 'rally' && !!match.flight;
    if (!Number.isFinite(now)) return;
    if (match.flight && this.shuttle.visible) {
      const position = badmintonShuttlePosition(match.flight, now);
      this.shuttle.position.set(position.x, position.y, position.z);
      this.shuttle.rotation.z = -Math.atan2(match.flight.to.x - match.flight.from.x, -5);
    }
    this.players.forEach((player, side) => {
      const flight = match.flight;
      const position = flight && this.shuttle.visible ? badmintonShuttlePosition(flight, now) : null;
      // Represent the accepted hit position and the receiver's relaxed sidestep.
      // No client pose or animation can modify authoritative reach or scoring.
      const elapsed = flight ? Math.max(0, (now - flight.startedAt) / 1000) : 1;
      const targetZ = position ? (side === flight!.lastHitBy ? flight!.from.z : position.z) : 0;
      player.body.position.z = Math.max(-2.7, Math.min(2.7, targetZ));
      const swing = flight && side === flight.lastHitBy && elapsed < 0.4 ? Math.sin(Math.PI * elapsed / 0.4) : 0;
      player.arm.rotation.x = -0.85 - swing * 1.35;
      player.arm.rotation.z = -0.15 - swing * 0.25;
      const moving = flight && side !== flight.lastHitBy && Math.abs(flight.to.z - flight.from.z) > 0.1;
      const step = moving ? Math.sin(elapsed * 12) * 0.15 : 0;
      player.legs[0].rotation.x = step; player.legs[1].rotation.x = -step;
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.scene.remove(this.group);
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); this.group.clear();
  }
}
