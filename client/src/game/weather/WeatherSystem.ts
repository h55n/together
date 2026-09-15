import * as THREE from 'three';
import type { MaterialLibrary } from '../world/MaterialLibrary';
import { rainIntensity, targetWetness, type WeatherState } from './weatherModel';

export class WeatherSystem {
  state: WeatherState = 'clear';
  wetness = 0;
  private readonly rain: THREE.Points;
  private readonly positions: Float32Array;
  private readonly rainMaterial: THREE.PointsMaterial;
  private readonly focus = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly materials: MaterialLibrary) {
    const count = 850;
    this.positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) this.resetDrop(i, Math.random() * 18);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.rainMaterial = new THREE.PointsMaterial({ color: 0xd6e2e6, size: 0.04, transparent: true, opacity: 0.55, depthWrite: false });
    this.rain = new THREE.Points(geometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  setState(state: WeatherState): void {
    this.state = state;
  }

  update(deltaSeconds: number, focus: THREE.Vector3): void {
    this.focus.copy(focus);
    const target = targetWetness(this.state);
    this.wetness = THREE.MathUtils.lerp(this.wetness, target, 1 - Math.exp(-deltaSeconds * 0.35));
    this.materials.setWetness(this.wetness);

    const intensity = rainIntensity(this.state);
    this.rain.visible = intensity > 0;
    this.rainMaterial.opacity = 0.32 + intensity * 0.45;
    if (intensity <= 0) return;

    for (let i = 0; i < this.positions.length; i += 3) {
      this.positions[i + 1]! -= deltaSeconds * (15 + intensity * 12);
      this.positions[i]! += deltaSeconds * intensity * 0.8;
      if (this.positions[i + 1]! < focus.y - 0.2) this.resetDrop(i / 3, 15 + Math.random() * 7);
    }
    const attr = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.rain.geometry.dispose();
    this.rainMaterial.dispose();
  }

  private resetDrop(index: number, yOffset: number): void {
    const i = index * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 16;
    this.positions[i] = this.focus.x + Math.cos(angle) * radius;
    this.positions[i + 1] = this.focus.y + yOffset;
    this.positions[i + 2] = this.focus.z + Math.sin(angle) * radius;
  }
}
