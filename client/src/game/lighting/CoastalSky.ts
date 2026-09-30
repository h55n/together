import * as THREE from 'three';

const SKY_KEYS = [
  { hour: 0, top: 0x102541, horizon: 0x586879, cloud: 0x58647c },
  { hour: 5, top: 0x263b63, horizon: 0xcba891, cloud: 0xb7a5b8 },
  { hour: 6.5, top: 0x498fb8, horizon: 0xf3d0a0, cloud: 0xffe6c7 },
  { hour: 9, top: 0x388fc4, horizon: 0xc5e1e5, cloud: 0xf9f9ed },
  { hour: 15, top: 0x388fc4, horizon: 0xc5e1e5, cloud: 0xf9f9ed },
  { hour: 17.8, top: 0x447da9, horizon: 0xf3bd86, cloud: 0xffd4a0 },
  { hour: 19.1, top: 0x26365d, horizon: 0xab9baf, cloud: 0x9c96b2 },
  { hour: 21, top: 0x102541, horizon: 0x586879, cloud: 0x58647c },
  { hour: 24, top: 0x102541, horizon: 0x586879, cloud: 0x58647c },
];

/** Painted vertex colours work on both renderer backends without custom shaders. */
export class CoastalSky {
  readonly root = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly top = new THREE.Color();
  private readonly horizon = new THREE.Color();
  private readonly tint = new THREE.Color();
  private previousKey = '';

  constructor(scene: THREE.Scene) {
    this.root.name = 'coastal-sky';
    const geometry = new THREE.SphereGeometry(580, 40, 24);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
    this.dome = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
    this.dome.renderOrder = -100;
    this.root.add(this.dome);
    const cloudGeometry = new THREE.IcosahedronGeometry(1, 2);
    const cloudPositions = cloudGeometry.getAttribute('position');
    const cloudColors = new Float32Array(cloudPositions.count * 3);
    const underside = new THREE.Color(0x8492b5), rim = new THREE.Color(0xfff9e8);
    for (let i = 0; i < cloudPositions.count; i += 1) {
      this.tint.copy(underside).lerp(rim, THREE.MathUtils.smoothstep(cloudPositions.getY(i), -0.75, 0.65));
      cloudColors.set([this.tint.r, this.tint.g, this.tint.b], i * 3);
    }
    cloudGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cloudColors, 3));
    this.clouds = new THREE.InstancedMesh(cloudGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, toneMapped: false }), 192);
    this.clouds.name = 'painted-coastal-clouds';
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 192; i += 1) {
      const cluster = Math.floor(i / 8), lobe = i % 8, angle = cluster * 2.399;
      const radius = 300 + cluster % 4 * 45, baseY = 76 + cluster % 4 * 9;
      const billowAngle = lobe * 2.399 + cluster;
      const spread = lobe === 0 ? 0 : 12 + lobe % 3 * 6;
      const offsetX = Math.cos(billowAngle) * spread, offsetZ = Math.sin(billowAngle) * spread * 0.6;
      dummy.position.set(Math.cos(angle) * radius + offsetX,
        baseY + (lobe === 0 ? 0 : 9 + lobe % 3 * 7),
        Math.sin(angle) * radius + offsetZ);
      // A broad shaded base with rising asymmetric towers reads as cumulus,
      // rather than a repeated row of elongated ellipsoids overhead.
      if (lobe === 0) dummy.scale.set(43, 9, 26);
      else dummy.scale.set(12 + lobe % 3 * 5, 12 + lobe % 4 * 4, 13 + lobe % 2 * 5);
      dummy.rotation.y = angle;
      dummy.updateMatrix();
      this.clouds.setMatrixAt(i, dummy.matrix);
    }
    this.clouds.renderOrder = -90;
    this.clouds.frustumCulled = false;
    this.root.add(this.clouds);
    scene.add(this.root);
    this.update(600, new THREE.Vector3());
  }

  update(minutes: number, focus: THREE.Vector3, rain = 0): void {
    this.root.position.set(focus.x, 0, focus.z);
    const hour = ((minutes / 60) % 24 + 24) % 24;
    const key = `${Math.round(hour * 120)}:${Math.round(rain * 100)}`;
    if (key === this.previousKey) return;
    this.previousKey = key;
    const rightIndex = SKY_KEYS.findIndex(frame => frame.hour > hour);
    const left = SKY_KEYS[rightIndex - 1]!, right = SKY_KEYS[rightIndex]!;
    const t = THREE.MathUtils.smoothstep(hour, left.hour, right.hour), wet = THREE.MathUtils.clamp(rain, 0, 1);
    this.top.set(left.top).lerp(this.tint.set(right.top), t);
    this.horizon.set(left.horizon).lerp(this.tint.set(right.horizon), t);
    this.tint.set(0x778e98);
    this.top.lerp(this.tint, wet * 0.8);
    this.horizon.lerp(this.tint, wet * 0.6);
    const positions = this.dome.geometry.getAttribute('position'), colors = this.dome.geometry.getAttribute('color');
    for (let i = 0; i < positions.count; i += 1) {
      this.tint.copy(this.horizon).lerp(this.top, Math.pow(Math.max(0, positions.getY(i) / 580), 0.38));
      colors.setXYZ(i, this.tint.r, this.tint.g, this.tint.b);
    }
    colors.needsUpdate = true;
    const material = this.clouds.material as THREE.MeshBasicMaterial;
    material.color.set(left.cloud).lerp(this.tint.set(right.cloud), t).lerp(this.tint.set(0xa5b0b1), wet * 0.8);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.dome.geometry.dispose();
    (this.dome.material as THREE.Material).dispose();
    this.clouds.geometry.dispose();
    this.clouds.dispose();
    (this.clouds.material as THREE.Material).dispose();
  }
}
