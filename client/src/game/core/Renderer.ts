import * as THREE from 'three';
import { detectRendererCapabilities, selectRendererBackend, type RendererBackend } from './rendererBackend';

export type RendererRuntimeInfo = {
  backend: RendererBackend;
  webgpuDetected: boolean;
  webgl2Detected: boolean;
  universalRendererLoaded: boolean;
};

type RenderInfo = { render: { calls: number; triangles: number } };

type RuntimeRenderer = {
  info: RenderInfo;
  shadowMap: { enabled: boolean };
  outputColorSpace: THREE.ColorSpace;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
  init?: () => Promise<void>;
};

type UniversalRendererConstructor = new (options: {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  powerPreference?: WebGLPowerPreference;
  forceWebGL?: boolean;
}) => RuntimeRenderer;

export class Renderer {
  readonly renderer: RuntimeRenderer;
  readonly info: RendererRuntimeInfo;
  private pixelRatioCap = 2;

  private constructor(renderer: RuntimeRenderer, info: RendererRuntimeInfo) {
    this.renderer = renderer;
    this.info = info;
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const capabilities = detectRendererCapabilities(canvas);
    const preferredBackend = selectRendererBackend(capabilities);
    if (preferredBackend === 'unsupported') {
      throw new Error('Together requires WebGPU or WebGL2 support.');
    }

    let renderer: RuntimeRenderer | undefined;
    let backend: RendererBackend = preferredBackend;
    let universalRendererLoaded = false;

    // Keep the import indirect so a stale local dependency tree can still run the
    // WebGL2 compatibility profile. Fresh installs on the declared Three.js
    // version resolve `three/webgpu` and use the universal WebGPURenderer.
    const moduleId = 'three/webgpu';
    try {
      const universalModule = (await import(/* @vite-ignore */ moduleId)) as unknown as {
        WebGPURenderer: UniversalRendererConstructor;
      };
      renderer = new universalModule.WebGPURenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
        forceWebGL: preferredBackend === 'webgl2',
      });
      if (renderer.init) await renderer.init();
      universalRendererLoaded = true;
    } catch (error) {
      if (!capabilities.webgl2) throw error;
      backend = 'webgl2';
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      }) as unknown as RuntimeRenderer;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;

    return new Renderer(renderer, {
      backend,
      webgpuDetected: capabilities.webgpu,
      webgl2Detected: capabilities.webgl2,
      universalRendererLoaded,
    });
  }

  setPixelRatioCap(cap: number): void {
    this.pixelRatioCap = Math.max(0.75, Math.min(2, cap));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
  }

  setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  resize(width: number, height: number, pixelRatio = window.devicePixelRatio): void {
    this.renderer.setPixelRatio(Math.min(pixelRatio, this.pixelRatioCap));
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
