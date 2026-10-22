import * as THREE from 'three';

const SKY_KEYS = [
  { hour: 0, top: 0x0c1d3d, horizon: 0x3c4f78, cloud: 0x46557a },
  { hour: 5, top: 0x2a3a74, horizon: 0xe2a49a, cloud: 0xc9a3c4 },
  { hour: 6.5, top: 0x3f86d0, horizon: 0xffd2a2, cloud: 0xfff0dc },
  { hour: 9, top: 0x2f7fd6, horizon: 0xbfe6f4, cloud: 0xffffff },
  { hour: 15, top: 0x2f7fd6, horizon: 0xbfe6f4, cloud: 0xffffff },
  { hour: 17.8, top: 0x4a64b8, horizon: 0xffa868, cloud: 0xffcf9e },
  { hour: 19.1, top: 0x2b2f6e, horizon: 0xd88fa6, cloud: 0xb98fc4 },
  { hour: 21, top: 0x0c1d3d, horizon: 0x3c4f78, cloud: 0x46557a },
  { hour: 24, top: 0x0c1d3d, horizon: 0x3c4f78, cloud: 0x46557a },
];

const CLOUD_CLUSTERS = 28, CLOUD_LOBES = 12;

/** Painted vertex colours work on both renderer backends without custom shaders. */
export class CoastalSky {
  readonly root = new THREE.Group();
  private readonly dome: THREE.Mesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly sunDisc: THREE.Mesh;
  private readonly sunHalo: THREE.Mesh;
  private readonly hills: THREE.Mesh[] = [];
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
    const underside = new THREE.Color(0x9fb2d8), rim = new THREE.Color(0xffffff);
    for (let i = 0; i < cloudPositions.count; i += 1) {
      this.tint.copy(underside).lerp(rim, THREE.MathUtils.smoothstep(cloudPositions.getY(i), -0.55, 0.25));
      cloudColors.set([this.tint.r, this.tint.g, this.tint.b], i * 3);
    }
    cloudGeometry.setAttribute('color', new THREE.Float32BufferAttribute(cloudColors, 3));
    // Opaque lobes must write depth so overlapping cloud masses occlude one
    // another. The background dome alone remains depth-free.
    this.clouds = new THREE.InstancedMesh(cloudGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: true, toneMapped: false }), CLOUD_CLUSTERS * CLOUD_LOBES);
    this.clouds.name = 'painted-coastal-clouds';
    const dummy = new THREE.Object3D();
    for (let i = 0; i < CLOUD_CLUSTERS * CLOUD_LOBES; i += 1) {
      const cluster = Math.floor(i / CLOUD_LOBES), lobe = i % CLOUD_LOBES, angle = cluster * 2.399;
      const radius = 300 + cluster % 4 * 45, baseY = 76 + cluster % 4 * 9;
      const billowAngle = lobe * 2.399 + cloudVariation(cluster, 0, 0) * Math.PI * 2;
      const spread = lobe === 0 ? 0 : (lobe > 7 ? 3 : 8) + cloudVariation(cluster, lobe, 1) * (lobe > 7 ? 6 : 12);
      const localX = Math.cos(billowAngle) * spread, localZ = Math.sin(billowAngle) * spread * 0.6;
      const offsetX = localX * Math.cos(angle) + localZ * Math.sin(angle);
      const offsetZ = -localX * Math.sin(angle) + localZ * Math.cos(angle);
      dummy.position.set(Math.cos(angle) * radius + offsetX,
        baseY + (lobe === 0 ? 0 : (lobe > 7 ? 14 : 5) + cloudVariation(cluster, lobe, 2) * (lobe > 7 ? 12 : 10)),
        Math.sin(angle) * radius + offsetZ);
      // Deeper overlap unifies each broad base and its asymmetric billows.
      // Only transforms change: retain the shared geometry and one draw.
      if (lobe === 0) dummy.scale.set(36 + cloudVariation(cluster, 0, 3) * 12, 8 + cloudVariation(cluster, 0, 4) * 2, 22 + cloudVariation(cluster, 0, 5) * 8);
      else dummy.scale.set(16 + cloudVariation(cluster, lobe, 3) * 12, 13 + cloudVariation(cluster, lobe, 4) * 14, 14 + cloudVariation(cluster, lobe, 5) * 9);
      dummy.rotation.y = angle;
      dummy.updateMatrix();
      this.clouds.setMatrixAt(i, dummy.matrix);
    }
    this.clouds.renderOrder = -90;
    this.clouds.frustumCulled = false;
    this.root.add(this.clouds);
    // Over-bright colours let the WebGL2 bloom pass give the sun a soft painted glow.
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 2.8), fog: false, depthWrite: false, toneMapped: false }));
    this.sunHalo = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.22, fog: false, depthWrite: false, toneMapped: false }));
    this.sunDisc.renderOrder = -95; this.sunHalo.renderOrder = -96;
    this.sunDisc.name = 'painted-sun';
    this.root.add(this.sunHalo, this.sunDisc);
    // Two painted ridgelines around the landward horizon; the southern sea view stays open.
    for (const [radius, peak, seed, order] of [[560, 120, 3, -98], [515, 80, 11, -97]] as const) {
      const ridge = new THREE.Mesh(createRidgeGeometry(radius, peak, seed), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      ridge.name = 'painted-horizon-hills';
      ridge.renderOrder = order;
      ridge.frustumCulled = false;
      this.hills.push(ridge);
      this.root.add(ridge);
    }
    scene.add(this.root);
    this.update(600, new THREE.Vector3());
  }

  update(minutes: number, focus: THREE.Vector3, rain = 0, cloudCover = 1): void {
    this.root.position.set(focus.x, 0, focus.z);
    // Clusters are spread around the dome by the golden angle, so a prefix thins coverage evenly.
    const clusters = Math.round(CLOUD_CLUSTERS * THREE.MathUtils.clamp(0.25 + cloudCover * 0.75, 0.25, 1));
    this.clouds.count = clusters * CLOUD_LOBES;
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
    // Aerial perspective: the far ridge nearly melts into the horizon, the near one keeps more colour.
    this.hills.forEach((ridge, index) => {
      const hill = ridge.material as THREE.MeshBasicMaterial;
      hill.color.copy(this.horizon).lerp(this.tint.set(index === 0 ? 0x7f98c4 : 0x4c7a84), index === 0 ? 0.55 : 0.78).lerp(this.horizon, wet * 0.5);
    });
  }

  /** Places the sun on the dome along the light direction; it fades below the horizon. */
  setSun(direction: THREE.Vector3, warmth: number): void {
    const visible = THREE.MathUtils.smoothstep(direction.y, -0.06, 0.04);
    for (const mesh of [this.sunDisc, this.sunHalo]) {
      mesh.position.copy(direction).multiplyScalar(mesh === this.sunDisc ? 520 : 530);
      mesh.lookAt(0, 0, 0);
      mesh.visible = visible > 0.01;
    }
    const disc = this.sunDisc.material as THREE.MeshBasicMaterial, halo = this.sunHalo.material as THREE.MeshBasicMaterial;
    disc.color.setRGB(4, 3.6 - warmth * 1.2, 2.8 - warmth * 1.8);
    halo.color.set(0xfff1cf).lerp(this.tint.set(0xff9a5a), warmth);
    halo.opacity = 0.22 * visible + warmth * 0.12 * visible;
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const ridge of this.hills) { ridge.geometry.dispose(); (ridge.material as THREE.Material).dispose(); }
    this.sunDisc.geometry.dispose(); (this.sunDisc.material as THREE.Material).dispose();
    this.sunHalo.geometry.dispose(); (this.sunHalo.material as THREE.Material).dispose();
    this.dome.geometry.dispose();
    (this.dome.material as THREE.Material).dispose();
    this.clouds.geometry.dispose();
    this.clouds.dispose();
    (this.clouds.material as THREE.Material).dispose();
  }
}

/** Original repeatable cluster variation, independent of world/gameplay RNG. */
function cloudVariation(cluster: number, lobe: number, channel: number): number {
  let value = (Math.imul(cluster + 1, 374761393) ^ Math.imul(lobe + 1, 668265263) ^ Math.imul(channel + 1, 69069)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** A closed ring of soft ridges; peaks fall away over the southern (sea) arc. Vertex colour lightens toward the crest. */
function createRidgeGeometry(radius: number, peak: number, seed: number): THREE.BufferGeometry {
  const segments = 160, positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    // Layered sines make an irregular, hand-painted skyline that is identical every session.
    const profile = 0.55 + 0.25 * Math.sin(angle * 3 + seed) + 0.15 * Math.sin(angle * 7.3 + seed * 1.7) + 0.08 * Math.sin(angle * 17.1 + seed * 0.3);
    const land = THREE.MathUtils.smoothstep(Math.sin(angle), -0.55, -0.15);
    const height = 6 + peak * Math.max(0, profile) * land;
    positions.push(x, -12, z, x, height, z);
    colors.push(0.78, 0.82, 0.86, 1, 1, 1);
    if (index < segments) {
      const base = index * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}
