import * as THREE from 'three';
import { locationAnchor, scheduleActionAt, cityHeightAt } from '@together/shared';
import { namedNpcs } from '@together/content';

const CLOTHING = [0x6c6958, 0x466a67, 0x925f4f, 0x586a7b, 0x756948, 0x4e7351, 0x7d665f, 0x536879, 0x9b6b55, 0x645d7a];

export class NamedNPCSystem {
  readonly root = new THREE.Group();
  private readonly actors = namedNpcs.map((definition, index) => {
    const actor = createActor(CLOTHING[index % CLOTHING.length]!);
    actor.name = `named-npc:${definition.id}`;
    actor.userData.npcId = definition.id;
    actor.userData.displayName = definition.displayName;
    this.root.add(actor);
    return { definition, actor, phase: index * 0.83 };
  });

  constructor() {
    this.root.name = 'named-npcs';
  }

  update(deltaSeconds: number, gameMinutes: number, playerPosition: THREE.Vector3): void {
    const time = performance.now() * 0.001;
    for (const entry of this.actors) {
      const anchor = locationAnchor(entry.definition.homeOrWork);
      if (!anchor) {
        entry.actor.visible = false;
        continue;
      }
      const action = scheduleActionAt(entry.definition.schedule, gameMinutes);
      if (action === 'off_schedule') {
        entry.actor.visible = false;
        continue;
      }
      const baseX = anchor.position.x + Math.sin(entry.phase * 2.2) * 2.4;
      const baseZ = anchor.position.z + Math.cos(entry.phase * 1.7) * 2.4;
      const distance = Math.hypot(playerPosition.x - baseX, playerPosition.z - baseZ);
      entry.actor.visible = distance < 135;
      if (!entry.actor.visible) continue;

      // Workers make small believable authored loops; seated/break states remain nearly still.
      const working = /work|market|nursery|shop|service|courtyard|neighbourhood/.test(action);
      const radius = working ? 1.5 : 0.35;
      const speed = working ? 0.22 : 0.08;
      const x = baseX + Math.sin(time * speed + entry.phase) * radius;
      const z = baseZ + Math.cos(time * speed + entry.phase) * radius;
      entry.actor.position.set(x, cityHeightAt(x, z), z);
      entry.actor.rotation.y = Math.atan2(
        Math.cos(time * speed + entry.phase),
        -Math.sin(time * speed + entry.phase),
      );
      entry.actor.userData.scheduleAction = action;

      const torso = entry.actor.children[0];
      if (torso) torso.rotation.z = Math.sin(time * 2 + entry.phase) * (working ? 0.018 : 0.008);
      void deltaSeconds;
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
  }
}

function createActor(color: number): THREE.Group {
  const root = new THREE.Group();
  const clothing = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa96f50, roughness: 0.84 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2f2825, roughness: 0.92 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.58, 5, 8), clothing);
  torso.position.y = 1.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
  head.position.y = 1.66;
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.165, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairCap.position.y = 1.72;
  root.add(torso, head, hairCap);
  root.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
  return root;
}
