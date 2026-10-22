import * as THREE from 'three';

export type TransportSafetyMode = 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw';

/**
 * Small, code-authored safety props sized for PlayerAvatar's torso and head.
 * Attach `lifeJacket` to the body at torso center and `helmet` to the head
 * group; each remains independently positioned in its parent's local space.
 */
export class TransportSafetyEquipment {
  readonly root = new THREE.Group();
  readonly lifeJacket = new THREE.Group();
  readonly helmet = new THREE.Group();
  get lifeJacketRoot(): THREE.Group { return this.lifeJacket; }
  get helmetRoot(): THREE.Group { return this.helmet; }

  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private disposed = false;

  constructor() {
    this.root.name = 'avatar:transport-safety';
    this.lifeJacket.name = 'avatar:safety:life-jacket';
    this.helmet.name = 'avatar:safety:scooter-helmet';
    this.buildLifeJacket();
    this.buildHelmet();
    this.root.add(this.lifeJacket, this.helmet);
    this.setMode('on_foot');
  }

  setMode(mode: TransportSafetyMode): void {
    if (this.disposed) return;
    this.lifeJacket.visible = mode === 'kayak';
    this.helmet.visible = mode === 'scooter';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Wearable groups may have been reparented into the avatar body/head.
    // Detach them before clearing their meshes and releasing owned resources.
    this.lifeJacket.removeFromParent();
    this.helmet.removeFromParent();
    this.lifeJacket.clear();
    this.helmet.clear();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.root.clear();
  }

  private buildLifeJacket(): void {
    const buoyancy = this.material(0xe66a32, 0.78);
    const webbing = this.material(0xf0d9b3, 0.88);
    const buckle = this.material(0x344345, 0.42, 0.12);

    // Two rounded front floats leave an open center so the shirt remains visible.
    for (const side of [-1, 1]) {
      const front = this.mesh(new THREE.CapsuleGeometry(0.087, 0.29, 4, 8), buoyancy);
      front.name = `avatar:safety:life-jacket:front-${side < 0 ? 'left' : 'right'}`;
      front.position.set(side * 0.105, 0, -0.205);
      front.scale.set(1, 1, 0.42);
      this.lifeJacket.add(front);

      const back = this.mesh(new THREE.CapsuleGeometry(0.083, 0.27, 4, 8), buoyancy);
      back.name = `avatar:safety:life-jacket:back-${side < 0 ? 'left' : 'right'}`;
      back.position.set(side * 0.105, 0, 0.162);
      back.scale.set(1, 1, 0.4);
      this.lifeJacket.add(back);

      const shoulder = this.mesh(new THREE.CapsuleGeometry(0.026, 0.21, 3, 6), webbing);
      shoulder.name = `avatar:safety:life-jacket:shoulder-strap-${side < 0 ? 'left' : 'right'}`;
      shoulder.rotation.x = Math.PI / 2;
      shoulder.position.set(side * 0.135, 0.255, -0.025);
      shoulder.scale.set(1, 1, 0.72);
      this.lifeJacket.add(shoulder);
    }

    // Two flat straps wrap around the lower chest; their buckles face forward.
    for (const y of [-0.16, 0.105]) {
      const strap = this.mesh(new THREE.TorusGeometry(0.205, 0.012, 5, 20), webbing);
      strap.name = `avatar:safety:life-jacket:wrap-${y < 0 ? 'lower' : 'upper'}`;
      strap.rotation.x = Math.PI / 2;
      strap.scale.set(1, 0.57, 1);
      strap.position.set(0, y, 0);
      this.lifeJacket.add(strap);

      const clasp = this.mesh(new THREE.BoxGeometry(0.055, 0.035, 0.015), buckle);
      clasp.name = `avatar:safety:life-jacket:buckle-${y < 0 ? 'lower' : 'upper'}`;
      clasp.position.set(0, y, -0.225);
      this.lifeJacket.add(clasp);
    }
  }

  private buildHelmet(): void {
    const shellMaterial = this.material(0x2f6868, 0.32, 0.08);
    const trimMaterial = this.material(0xe8dcc4, 0.48);
    const strapMaterial = this.material(0x333b3d, 0.76);

    // The shallow dome sits above the eyes, leaving the face and forward view clear.
    const shell = this.mesh(new THREE.SphereGeometry(0.205, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.49), shellMaterial);
    shell.name = 'avatar:safety:scooter-helmet:shell';
    shell.position.set(0, 0.245, 0.005);
    shell.scale.set(1, 0.88, 1.04);
    this.helmet.add(shell);

    const rim = this.mesh(new THREE.TorusGeometry(0.195, 0.012, 5, 24, Math.PI), trimMaterial);
    rim.name = 'avatar:safety:scooter-helmet:front-rim';
    rim.position.set(0, 0.245, -0.005);
    rim.rotation.z = Math.PI;
    rim.scale.set(1, 0.84, 1);
    this.helmet.add(rim);

    const rearBand = this.mesh(new THREE.TorusGeometry(0.174, 0.009, 4, 24, Math.PI), strapMaterial);
    rearBand.name = 'avatar:safety:scooter-helmet:retention-band';
    rearBand.position.set(0, 0.1, 0.025);
    this.helmet.add(rearBand);

    for (const side of [-1, 1]) {
      const strap = this.mesh(new THREE.CapsuleGeometry(0.008, 0.12, 2, 5), strapMaterial);
      strap.name = `avatar:safety:scooter-helmet:chin-strap-${side < 0 ? 'left' : 'right'}`;
      strap.position.set(side * 0.12, -0.015, -0.045);
      strap.rotation.z = side * -0.22;
      this.helmet.add(strap);
    }
  }

  private material(color: THREE.ColorRepresentation, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.materials.add(material);
    return material;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
