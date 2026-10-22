import type * as THREE from 'three';
import type * as Tsl from 'three/tsl';

type TslModule = typeof Tsl;
type WebGpuModule = { RenderPipeline: new (renderer: unknown) => { outputNode: unknown; outputColorTransform: boolean; render(): void; dispose(): void } };
type BloomFactory = (node: unknown, strength?: number, radius?: number, threshold?: number) => unknown;

export type WebGpuPostModules = { tsl: TslModule; webgpu: WebGpuModule; bloom: BloomFactory };

/** Loads the node-based post modules only on the WebGPU path, keeping them out of WebGL startup. */
export async function loadWebGpuPostModules(): Promise<WebGpuPostModules> {
  const [tsl, webgpu, bloomModule] = await Promise.all([
    import('three/tsl'),
    import('three/webgpu') as unknown as Promise<WebGpuModule>,
    import('three/examples/jsm/tsl/display/BloomNode.js') as unknown as Promise<{ bloom: BloomFactory }>,
  ]);
  return { tsl, webgpu, bloom: bloomModule.bloom };
}

/**
 * The same painterly look as the WebGL2 composer: soft bloom before tone mapping,
 * then vibrance, gentle split toning and a vignette on the display-referred image.
 */
export class WebGpuPostPipeline {
  private readonly pipeline: InstanceType<WebGpuModule['RenderPipeline']>;

  constructor(modules: WebGpuPostModules, renderer: unknown, scene: THREE.Scene, camera: THREE.Camera) {
    const { tsl } = modules;
    const scenePass = tsl.pass(scene, camera);
    const color = scenePass.getTextureNode('output');
    const lit = color.add(modules.bloom(color, 0.28, 0.5, 1.15) as typeof color);
    const display = tsl.renderOutput(lit);
    const vivid = tsl.vibrance(display.rgb, tsl.float(0.32));
    const contrasted = vivid.sub(0.5).mul(1.06).add(0.5);
    const luma = tsl.luminance(contrasted);
    const split = tsl.mix(tsl.vec3(0.239, 0.353, 0.541), tsl.vec3(1.0, 0.851, 0.659), tsl.smoothstep(0.15, 0.85, luma));
    const toned = tsl.mix(contrasted, contrasted.mul(split).mul(1.6), 0.09);
    const edge = tsl.smoothstep(0.35, 0.95, tsl.length(tsl.uv().sub(0.5)).mul(1.35));
    const graded = toned.mul(tsl.float(1).sub(edge.mul(0.22))).clamp(0, 1);
    this.pipeline = new modules.webgpu.RenderPipeline(renderer);
    // Tone mapping and colour space already happened in renderOutput above.
    this.pipeline.outputColorTransform = false;
    this.pipeline.outputNode = tsl.vec4(graded, display.a);
  }

  render(): void { this.pipeline.render(); }

  dispose(): void { this.pipeline.dispose(); }
}
