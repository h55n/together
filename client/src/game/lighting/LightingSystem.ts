import * as THREE from 'three';
import { lightingProfileAt } from './lightingProfile';

export class LightingSystem {
  readonly sun = new THREE.DirectionalLight(0xffe0b2, 1.8);
  readonly sky = new THREE.HemisphereLight(0x9eb9c9, 0x655d50, 0.8);
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.08);
  private readonly sunTarget = new THREE.Object3D();
  private readonly warm = new THREE.Color(0xffc27a);
  private readonly neutral = new THREE.Color(0xfff4dc);
  private readonly skyDay = new THREE.Color(0x9fb8c8);
  private readonly skyNight = new THREE.Color(0x172334);

  constructor(private readonly scene: THREE.Scene) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -42;
    this.sun.shadow.camera.right = 42;
    this.sun.shadow.camera.top = 42;
    this.sun.shadow.camera.bottom = -42;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 130;
    this.sun.target = this.sunTarget;
    scene.add(this.sun, this.sky, this.ambient, this.sunTarget);
    scene.fog = new THREE.FogExp2(0xaeb7b4, 0.004);
  }

  update(gameMinutes: number, focus: THREE.Vector3): void {
    const profile = lightingProfileAt(gameMinutes);
    const angle = ((gameMinutes / 1440) * Math.PI * 2) - Math.PI / 2;
    const radius = 65;
    const elevation = THREE.MathUtils.degToRad(profile.sunElevationDegrees);
    this.sun.position.set(
      focus.x + Math.cos(angle) * Math.cos(elevation) * radius,
      Math.max(focus.y + 8, focus.y + Math.sin(elevation) * radius),
      focus.z + Math.sin(angle) * Math.cos(elevation) * radius,
    );
    this.sunTarget.position.copy(focus);
    this.sun.intensity = profile.sunIntensity;
    this.sun.color.copy(this.neutral).lerp(this.warm, profile.warmth);
    this.sky.intensity = profile.skyIntensity;
    this.sky.color.copy(this.skyNight).lerp(this.skyDay, Math.min(1, profile.skyIntensity));
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.density = profile.fogDensity;
  }
}
