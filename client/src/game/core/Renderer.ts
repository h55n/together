import * as THREE from 'three';
import { observeDeviceLoss } from './DeviceLoss';
import { PostPipeline } from './PostPipeline';
import { loadWebGpuPostModules, WebGpuPostPipeline, type WebGpuPostModules } from './WebGpuPostPipeline';
import { awaitPreparation } from './preparation';
import { detectRendererCapabilities, hasWebGpuAdapter, resolveRendererForceBackend, selectRendererBackend, type RendererBackend } from './rendererBackend';

export type RendererRuntimeInfo = {
  requestedBackend: RendererBackend;
  backend: RendererBackend;
  fallbackReason?: string;
  webgpuDetected: boolean;
  webgl2Detected: boolean;
  universalRendererLoaded: boolean;
};

type RenderInfo = { render: { calls: number; triangles: number }; autoReset?: boolean; reset?: () => void };

type RuntimeRenderer = {
  backend?: { isWebGPUBackend?: boolean; isWebGLBackend?: boolean; device?: { lost?: Promise<{ reason?: string }> } };
  onDeviceLost?: (info: unknown) => void;
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
  private resolutionScale = 1;
  private appliedPixelRatio = Number.NaN;
  private disposed = false;
  private readonly preparation = new AbortController();
  private post: PostPipeline | null = null;
  private webGpuPostModules: WebGpuPostModules | null = null;
  private webGpuPost: WebGpuPostPipeline | null = null;
  private postScene: THREE.Scene | null = null;
  private postEnabled = true;
  private size = { width: 0, height: 0 };

  private constructor(renderer: RuntimeRenderer, info: RendererRuntimeInfo) {
    this.renderer = renderer;
    this.info = info;
  }

  static async create(canvas: HTMLCanvasElement, options: { forceBackend?: 'webgl2'; recoverFromDeviceLoss?: boolean; onDeviceLost?: () => void; signal?: AbortSignal } = {}): Promise<Renderer> {
    const signal = options.signal ?? new AbortController().signal;
    signal.throwIfAborted();
    const forceBackend = resolveRendererForceBackend(
      typeof window === 'undefined' ? '' : window.location.search,
      options.forceBackend,
      options.recoverFromDeviceLoss,
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
    // Some browsers expose navigator.gpu but cannot provide an adapter. Three's
    // universal renderer then silently enters its WebGL backend, which has lost
    // its device in headless Chromium. Choose our proven native WebGL2 path first.
    const adapterAvailable = preferredBackend === 'webgpu'
      ? await hasWebGpuAdapter((navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu, signal)
      : false;
    signal.throwIfAborted();

    // The native WebGL renderer is deliberately used for explicit compatibility
    // mode and for browsers with no usable WebGPU adapter.
    if (preferredBackend === 'webgl2' || !adapterAvailable) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      }) as unknown as RuntimeRenderer;
      backend = 'webgl2';
      fallbackReason = preferredBackend === 'webgl2'
        ? 'Native WebGL2 compatibility profile'
        : 'No usable WebGPU adapter; native WebGL2 fallback';
      webgl2Detected = true;
    } else {
      try {
        const universalModule = (await import('three/webgpu')) as unknown as {
          WebGPURenderer: UniversalRendererConstructor;
        };
        signal.throwIfAborted();
        renderer = new universalModule.WebGPURenderer({
          canvas,
          antialias: true,
          powerPreference: 'high-performance',
        });
        if (renderer.init) await awaitPreparation(renderer.init(), signal, 'Graphics initialization');
        universalRendererLoaded = true;
      } catch (error) {
        renderer?.dispose();
        signal.throwIfAborted();
        options.onDeviceLost?.();
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
    // Neutral keeps the painterly palette's saturation, unlike ACES desaturating highlights.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    // Filtered shadow edges (three r186 folded the old soft variant into PCF); WebGPU ignores this native field.
    (renderer.shadowMap as { type?: THREE.ShadowMapType }).type = THREE.PCFShadowMap;

    const result = new Renderer(renderer, {
      requestedBackend: preferredBackend,
      backend,
      ...(fallbackReason ? { fallbackReason } : {}),
      webgpuDetected: capabilities.webgpu,
      webgl2Detected,
      universalRendererLoaded,
    });
    result.appliedPixelRatio = initialPixelRatio;
    result.size = { width: window.innerWidth, height: window.innerHeight };
    // Optional look: a failed module load leaves WebGPU rendering directly, never blocks startup.
    if (backend === 'webgpu' && universalRendererLoaded) {
      try { result.webGpuPostModules = await loadWebGpuPostModules(); } catch { result.webGpuPostModules = null; }
    }
    if (universalRendererLoaded && options.onDeviceLost) {
      renderer.onDeviceLost = () => { if (!result.disposed) options.onDeviceLost?.(); };
      // Three may silently substitute its universal WebGL backend when adapter
      // discovery succeeds but device creation fails. Rebuild on a fresh canvas
      // using the native compatibility renderer, just as for a lost GPU device.
      if (renderer.backend?.isWebGLBackend) options.onDeviceLost();
    }
    const lost = renderer.backend?.device?.lost;
    if (backend === 'webgpu' && lost && options.onDeviceLost) observeDeviceLoss(lost, () => result.disposed, options.onDeviceLost);
    return result;
  }

  setPixelRatioCap(cap: number, resolutionScale = this.resolutionScale): void {
    this.pixelRatioCap = Math.max(0.75, Math.min(2, Number.isFinite(cap) ? cap : 1));
    this.resolutionScale = Math.max(0.75, Math.min(1, Number.isFinite(resolutionScale) ? resolutionScale : 1));
    this.applyPixelRatio(window.devicePixelRatio);
  }

  setResolutionScale(scale: number): void { this.setPixelRatioCap(this.pixelRatioCap, scale); }

  setShadowsEnabled(enabled: boolean): void {
    if (this.renderer.shadowMap.enabled === enabled) return;
    this.renderer.shadowMap.enabled = enabled;
  }

  resize(width: number, height: number, pixelRatio = window.devicePixelRatio): void {
    this.size = { width, height };
    this.applyPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.post?.setSize(width, height, this.appliedPixelRatio);
  }

  /** Bloom/grade only exist on the native WebGL2 path; other paths render directly. */
  setPostEffectsEnabled(enabled: boolean): void { this.postEnabled = enabled; }

  renderFrame(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.postEnabled && this.info.backend === 'webgpu' && this.webGpuPostModules) {
      if (!this.webGpuPost || this.postScene !== scene) {
        this.webGpuPost?.dispose();
        try { this.webGpuPost = new WebGpuPostPipeline(this.webGpuPostModules, this.renderer, scene, camera); }
        catch { this.webGpuPostModules = null; this.webGpuPost = null; this.renderer.render(scene, camera); return; }
        this.postScene = scene;
      }
      this.webGpuPost.render();
      return;
    }
    if (!this.postEnabled || this.info.backend !== 'webgl2' || !(this.renderer instanceof THREE.WebGLRenderer)) {
      this.renderer.render(scene, camera);
      return;
    }
    if (!this.post || this.postScene !== scene) {
      this.post?.dispose();
      this.post = new PostPipeline(this.renderer, scene, camera);
      this.postScene = scene;
      this.post.setSize(this.size.width || window.innerWidth, this.size.height || window.innerHeight, this.appliedPixelRatio);
    }
    this.post.setCamera(camera);
    // Count the whole composed frame rather than only its final fullscreen pass.
    const info = this.renderer.info;
    info.autoReset = false;
    info.reset();
    this.post.render();
  }

  async prewarm(scene: THREE.Scene, camera: THREE.Camera, signal?: AbortSignal): Promise<void> {
    const preparationSignal = signal ? AbortSignal.any([signal, this.preparation.signal]) : this.preparation.signal;
    if (preparationSignal.aborted) throw new Error('Graphics preparation was cancelled.');
    if (this.disposed) throw new Error('Graphics preparation was cancelled: renderer disposed.');
    // Native WebGL compileAsync polls KHR_parallel_shader_compile indefinitely.
    // With several browser worlds some drivers never signal completion. The
    // first render must submit this scene anyway; compile and submit it directly
    // on the native path rather than gate gameplay on the driver's polling bit.
    if (this.info.backend === 'webgl2') this.renderer.compile?.(scene, camera);
    else if (this.renderer.compileAsync) await awaitPreparation(this.renderer.compileAsync(scene, camera), preparationSignal, 'Graphics preparation');
    else this.renderer.compile?.(scene, camera);
    if (this.disposed) throw new Error('Graphics preparation was cancelled: renderer disposed.');
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.preparation.abort();
    this.post?.dispose();
    this.post = null;
    this.webGpuPost?.dispose();
    this.webGpuPost = null;
    this.renderer.dispose();
  }

  private applyPixelRatio(pixelRatio: number): void {
    const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
    const next = Math.max(0.75, Math.min(density, this.pixelRatioCap) * this.resolutionScale);
    if (Math.abs(next - this.appliedPixelRatio) < 0.001) return;
    this.appliedPixelRatio = next;
    this.renderer.setPixelRatio(next);
    if (this.size.width > 0) this.post?.setSize(this.size.width, this.size.height, next);
  }
}
