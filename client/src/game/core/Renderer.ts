import * as THREE from 'three';
import { detectRendererCapabilities, resolveRendererForceBackend, selectRendererBackend, type RendererBackend } from './rendererBackend';

export type RendererRuntimeInfo = {
  requestedBackend: RendererBackend;
  backend: RendererBackend;
  fallbackReason?: string;
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
  compile?: (scene: THREE.Scene, camera: THREE.Camera) => void;
  compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void>;
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
  private appliedPixelRatio = Number.NaN;

  private constructor(renderer: RuntimeRenderer, info: RendererRuntimeInfo) {
    this.renderer = renderer;
    this.info = info;
  }

  static async create(canvas: HTMLCanvasElement, options: { forceBackend?: 'webgl2' } = {}): Promise<Renderer> {
    const forceBackend = resolveRendererForceBackend(
      typeof window === 'undefined' ? '' : window.location.search,
      options.forceBackend,
    );
    const capabilities = detectRendererCapabilities(canvas, forceBackend === 'webgl2');
    const preferredBackend = selectRendererBackend(capabilities, forceBackend);
    if (preferredBackend === 'unsupported') {
      throw new Error('Together requires WebGPU or WebGL2 support.');
    }

    let renderer: RuntimeRenderer | undefined;
    let backend: RendererBackend = preferredBackend;
    let universalRendererLoaded = false;
    let fallbackReason: string | undefined;
    let webgl2Detected = capabilities.webgl2;

    // The native WebGL renderer is deliberately used for explicit compatibility
    // mode. Normal startup remains WebGPU-first.
    if (preferredBackend === 'webgl2') {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      }) as unknown as RuntimeRenderer;
      fallbackReason = 'Native WebGL2 compatibility profile';
      webgl2Detected = true;
    } else {
      try {
        const universalModule = (await import('three/webgpu')) as unknown as {
          WebGPURenderer: UniversalRendererConstructor;
        };
        renderer = new universalModule.WebGPURenderer({
          canvas,
          antialias: true,
          powerPreference: 'high-performance',
        });
        if (renderer.init) await renderer.init();
        universalRendererLoaded = true;
      } catch (error) {
        fallbackReason = error instanceof Error ? error.message : String(error);
        backend = 'webgl2';
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
          }) as unknown as RuntimeRenderer;
          webgl2Detected = true;
        } catch (fallbackError) {
          const reason = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(`WebGPU initialization failed and WebGL2 fallback was unavailable: ${reason}`, { cause: fallbackError });
        }
      }
    }

    const initialPixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(initialPixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;

    const result = new Renderer(renderer, {
      requestedBackend: preferredBackend,
      backend,
      ...(fallbackReason ? { fallbackReason } : {}),
      webgpuDetected: capabilities.webgpu,
      webgl2Detected,
      universalRendererLoaded,
    });
    result.appliedPixelRatio = initialPixelRatio;
    return result;
  }

  setPixelRatioCap(cap: number): void {
    this.pixelRatioCap = Math.max(0.75, Math.min(2, cap));
    this.applyPixelRatio(window.devicePixelRatio);
  }

  setShadowsEnabled(enabled: boolean): void {
    if (this.renderer.shadowMap.enabled === enabled) return;
    this.renderer.shadowMap.enabled = enabled;
  }

  resize(width: number, height: number, pixelRatio = window.devicePixelRatio): void {
    this.applyPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
  }

  async prewarm(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    if (this.renderer.compileAsync) await this.renderer.compileAsync(scene, camera);
    else this.renderer.compile?.(scene, camera);
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private applyPixelRatio(pixelRatio: number): void {
    const next = Math.min(pixelRatio, this.pixelRatioCap);
    if (Math.abs(next - this.appliedPixelRatio) < 0.001) return;
    this.appliedPixelRatio = next;
    this.renderer.setPixelRatio(next);
  }
}
