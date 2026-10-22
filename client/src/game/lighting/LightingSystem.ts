import * as THREE from 'three';
import { CoastalSky } from './CoastalSky';
import { lightingProfileAt } from './lightingProfile';
import type { WeatherAtmosphere } from '../weather/weatherModel';

export class LightingSystem {
  readonly sun = new THREE.DirectionalLight(0xffe2b8, 2.1);
  readonly sky = new THREE.HemisphereLight(0xa8d4ff, 0x6f8456, 0.85);
  readonly ambient = new THREE.AmbientLight(0xdfe8ff, 0.2);
  private readonly coastalSky: CoastalSky;
  private readonly sunTarget = new THREE.Object3D();
  private readonly streetLights: THREE.PointLight[] = [];
  private readonly warm = new THREE.Color(0xffb468);
  private readonly neutral = new THREE.Color(0xfff4dc);
  private readonly skyDay = new THREE.Color(0x9fd0f5);
  private readonly skyDawn = new THREE.Color(0xe6a894);
  private readonly skyGolden = new THREE.Color(0xf0a272);
  private readonly skyBlueHour = new THREE.Color(0x5a5e9a);
  private readonly skyNight = new THREE.Color(0x172334);
  private readonly fogDay = new THREE.Color(0xb6d9ec);
  private readonly fogWarm = new THREE.Color(0xf0c09e);
  private readonly fogNight = new THREE.Color(0x2c3a5a);
  private readonly background = new THREE.Color();
  private readonly fogColor = new THREE.Color();
  private readonly skyTarget = new THREE.Color();
  private readonly sunDirection = new THREE.Vector3();
  private readonly mist = new THREE.Color(0xdde3e6);
  private readonly palette = [
    { hour: 0, sky: this.skyNight, fog: this.fogDay.clone().lerp(this.fogNight, 0.72) },
    { hour: 3, sky: this.skyNight, fog: this.fogDay.clone().lerp(this.fogNight, 0.72) },
    { hour: 6, sky: this.skyDawn, fog: this.fogWarm },
    { hour: 8.5, sky: this.skyDay, fog: this.fogDay },
    { hour: 12.5, sky: this.skyDay, fog: this.fogDay },
    { hour: 16, sky: this.skyDay, fog: this.fogDay },
    { hour: 17.8, sky: this.skyGolden, fog: this.fogWarm },
    { hour: 19.1, sky: this.skyBlueHour, fog: this.fogDay.clone().lerp(this.fogNight, 0.48) },
    { hour: 21, sky: this.skyBlueHour, fog: this.fogDay.clone().lerp(this.fogNight, 0.72) },
    { hour: 23.3, sky: this.skyNight, fog: this.fogDay.clone().lerp(this.fogNight, 0.72) },
    { hour: 24, sky: this.skyNight, fog: this.fogDay.clone().lerp(this.fogNight, 0.72) },
  ];

  constructor(private readonly scene: THREE.Scene) {
    this.coastalSky = new CoastalSky(scene);
    scene.traverse((object) => { if (object instanceof THREE.PointLight && object.userData.amayaStreetLamp) this.streetLights.push(object); });
    this.sun.castShadow = true;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -42;
    this.sun.shadow.camera.right = 42;
    this.sun.shadow.camera.top = 42;
    this.sun.shadow.camera.bottom = -42;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 130;
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.035;
    this.sun.target = this.sunTarget;
    scene.add(this.sun, this.sky, this.ambient, this.sunTarget);
    scene.fog = new THREE.FogExp2(0xaeb7b4, 0.004);
  }

  setShadowScale(scale: number): void {
    const finiteScale = Number.isFinite(scale) ? scale : 1;
    const size = Math.max(1024, Math.min(4096, Math.round(2048 * finiteScale / 128) * 128));
    if (this.sun.shadow.mapSize.x === size && this.sun.shadow.mapSize.y === size) return;
    this.sun.shadow.dispose();
    this.sun.shadow.map = null;
    this.sun.shadow.mapPass = null;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.needsUpdate = true;
  }

  dispose(): void { this.sun.shadow.dispose(); this.coastalSky.dispose(); }

  update(gameMinutes: number, focus: THREE.Vector3, rain = 0, atmosphere?: WeatherAtmosphere): void {
    const cover = atmosphere?.cloudCover ?? 0.55, haze = atmosphere?.haze ?? 0;
    // Heavy cloud and haze grey the sky like rain does, without wetting surfaces.
    const gloom = Math.max(rain, (cover - 0.5) * 1.6, haze * 0.55);
    this.coastalSky.update(gameMinutes, focus, THREE.MathUtils.clamp(gloom, 0, 1), cover);
    const profile = lightingProfileAt(gameMinutes);
    const angle = ((gameMinutes / 1440) * Math.PI * 2) - Math.PI / 2;
    const radius = 65;
    const elevation = THREE.MathUtils.degToRad(profile.sunElevationDegrees);
    this.sun.position.set(
      focus.x + Math.cos(angle) * Math.cos(elevation) * radius,
      Math.max(focus.y + 8, focus.y + Math.sin(elevation) * radius),
      // Northern-tropics sun: rises east (+x), crosses the southern sky over the bay (-z) and sets west.
      focus.z - Math.sin(angle) * Math.cos(elevation) * radius,
    );
    this.sunTarget.position.copy(focus);
    this.coastalSky.setSun(this.sunDirection.set(Math.cos(angle) * Math.cos(elevation), Math.sin(elevation), -Math.sin(angle) * Math.cos(elevation)), profile.warmth);
    this.sun.intensity = profile.sunIntensity * (1 - rain * 0.7) * (atmosphere?.sunScale ?? 1);
    this.sun.color.copy(this.neutral).lerp(this.warm, THREE.MathUtils.clamp(profile.warmth + (atmosphere?.warmth ?? 0), 0, 1));
    const lampStrength = Math.max(0, Math.min(1, (0.58 - profile.skyIntensity) / 0.42), rain * 0.24);
    for (const light of this.streetLights) light.intensity = lampStrength * 70;
    this.sky.intensity = profile.skyIntensity;
    this.ambient.intensity = 0.2 + profile.skyIntensity * 0.3;
    const hour = ((gameMinutes / 60) % 24 + 24) % 24;
    const rightIndex = this.palette.findIndex(frame => frame.hour > hour);
    const left = this.palette[rightIndex - 1]!, right = this.palette[rightIndex]!;
    const blend = THREE.MathUtils.smoothstep(hour, left.hour, right.hour);
    this.skyTarget.copy(left.sky).lerp(right.sky, blend);
    const daylight = THREE.MathUtils.clamp(profile.skyIntensity, 0, 1);
    this.sky.color.copy(this.skyNight).lerp(this.skyTarget, daylight);

    this.background.copy(this.skyNight).lerp(this.skyTarget, Math.max(0.2, daylight));
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(this.background);
    else this.scene.background = this.background.clone();

    this.fogColor.copy(left.fog).lerp(right.fog, blend);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.fogColor);
      this.scene.fog.density = profile.fogDensity + rain * 0.003 + haze * 0.011;
      if (haze > 0) this.scene.fog.color.lerp(this.mist, Math.min(0.6, haze * 0.6));
    }
  }
}
