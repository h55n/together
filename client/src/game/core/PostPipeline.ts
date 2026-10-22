import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** Painterly display grade: vibrance, split toning and a soft vignette, applied after tone mapping. */
export const PAINTERLY_GRADE_SHADER = {
  name: 'PainterlyGrade',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vibrance: { value: 0.32 },
    contrast: { value: 1.06 },
    shadowTint: { value: new THREE.Color(0x3d5a8a) },
    highlightTint: { value: new THREE.Color(0xffd9a8) },
    splitStrength: { value: 0.09 },
    vignette: { value: 0.22 },
    canvas: { value: 0.045 },
    resolution: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float vibrance, contrast, splitStrength, vignette, canvas;
    uniform vec2 resolution;
    uniform vec3 shadowTint, highlightTint;
    varying vec2 vUv;
    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 color = source.rgb;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      // Vibrance lifts muted colours more than already saturated ones.
      float saturation = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
      color = mix(vec3(luma), color, 1.0 + vibrance * (1.0 - saturation));
      color = (color - 0.5) * contrast + 0.5;
      vec3 split = mix(shadowTint, highlightTint, smoothstep(0.15, 0.85, luma));
      color = mix(color, color * split * 1.6, splitStrength);
      // Painted-canvas finish: directional brush grain plus fine weave, stronger in midtones.
      vec2 px = vUv * resolution;
      float grain = sin(px.x * 0.9 + sin(px.y * 0.37) * 2.0) * sin(px.y * 0.7 + sin(px.x * 0.21) * 2.0);
      float weave = sin(px.x * 2.1) * sin(px.y * 2.1);
      color += (grain * 0.6 + weave * 0.4) * canvas * (1.0 - abs(luma - 0.5) * 1.4);
      float edge = smoothstep(0.35, 0.95, length(vUv - 0.5) * 1.35);
      color *= 1.0 - edge * vignette;
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
    }`,
};

/**
 * Native WebGL2 post chain. Kept optional: Low quality and the WebGPU backend
 * render directly, so gameplay never depends on post-processing being present.
 */
export class PostPipeline {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly renderPass: RenderPass;
  private readonly grade: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.28, 0.5, 1.15);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(PAINTERLY_GRADE_SHADER);
    this.grade.uniforms.resolution!.value.set(size.x, size.y);
    this.composer.addPass(this.grade);
  }

  setCamera(camera: THREE.Camera): void { this.renderPass.camera = camera; }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.grade.uniforms.resolution!.value.set(width * pixelRatio, height * pixelRatio);
    this.bloom.resolution.set(width * pixelRatio / 2, height * pixelRatio / 2);
  }

  render(): void { this.composer.render(); }

  dispose(): void {
    this.bloom.dispose();
    this.composer.dispose();
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
  }
}
