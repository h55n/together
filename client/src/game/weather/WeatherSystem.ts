import * as THREE from 'three';
import { CoastalWater } from '../world/CoastalWater';
import { shorelineZAt } from '../world/CoastalShoreline';
import type { MaterialLibrary } from '../world/MaterialLibrary';
import { rainIntensity, targetWetness, type WeatherState } from './weatherModel';

export class WeatherSystem {
  state: WeatherState = 'clear';
  wetness = 0;
  private readonly water: CoastalWater;
  private readonly rain: THREE.LineSegments;
  private readonly positions: Float32Array;
  private readonly rainMaterial: THREE.LineBasicMaterial;
  private readonly focus = new THREE.Vector3();
  private waterUpdateElapsed = 0;

  constructor(scene: THREE.Scene, private readonly materials: MaterialLibrary) {
    this.water = new CoastalWater(scene, materials);
    const count = 650;
    this.positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) this.resetDrop(i, Math.random() * 18);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.rainMaterial = new THREE.LineBasicMaterial({ color: 0xd6e2e6, transparent: true, opacity: 0.55, depthWrite: false });
    this.rain = new THREE.LineSegments(geometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  setState(state: WeatherState): void {
    this.state = state;
  }

  update(deltaSeconds: number, focus: THREE.Vector3): void {
    const jumped = this.focus.distanceToSquared(focus) > 25 * 25;
    this.focus.copy(focus);
    if (jumped && rainIntensity(this.state) > 0) {
      for (let index = 0; index < this.positions.length / 6; index += 1) this.resetDrop(index, Math.random() * 18);
    }
    const target = targetWetness(this.state);
    this.wetness = THREE.MathUtils.lerp(this.wetness, target, 1 - Math.exp(-deltaSeconds * 0.35));
    this.materials.setWetness(this.wetness);
    this.waterUpdateElapsed += deltaSeconds;
    const animateWater = focus.z < shorelineZAt(focus.x) + 220 || this.waterUpdateElapsed >= 0.1;
    this.water.update(deltaSeconds, this.wetness, animateWater);
    if (animateWater) this.waterUpdateElapsed = 0;

    const intensity = rainIntensity(this.state);
    this.rain.visible = intensity > 0;
    this.rainMaterial.opacity = 0.34 + intensity * 0.42;
    if (intensity <= 0) return;

    for (let i = 0; i < this.positions.length; i += 6) {
      const fall = deltaSeconds * (15 + intensity * 12);
      const drift = deltaSeconds * intensity * 0.8;
      this.positions[i + 1]! -= fall;
      this.positions[i + 4]! -= fall;
      this.positions[i]! += drift;
      this.positions[i + 3]! += drift;
      if (this.positions[i + 4]! < focus.y - 0.2) this.resetDrop(i / 6, 15 + Math.random() * 7);
    }
    const attr = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.water.dispose();
    this.rain.geometry.dispose();
    this.rainMaterial.dispose();
  }

  private resetDrop(index: number, yOffset: number): void {
    const i = index * 6;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 16;
    const x = this.focus.x + Math.cos(angle) * radius;
    const y = this.focus.y + yOffset;
    const z = this.focus.z + Math.sin(angle) * radius;
    const streak = 0.3 + rainIntensity(this.state) * 0.3;
    this.positions[i] = x;
    this.positions[i + 1] = y;
    this.positions[i + 2] = z;
    this.positions[i + 3] = x - streak * 0.18;
    this.positions[i + 4] = y - streak;
    this.positions[i + 5] = z;
  }
}
