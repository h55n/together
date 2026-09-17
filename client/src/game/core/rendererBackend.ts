export type RendererBackend = 'webgpu' | 'webgl2' | 'unsupported';
export type RendererCapabilities = { webgpu: boolean; webgl2: boolean };

export function selectRendererBackend(capabilities: RendererCapabilities, forceBackend?: 'webgl2'): RendererBackend {
  if (forceBackend === 'webgl2') return capabilities.webgl2 ? 'webgl2' : 'unsupported';
  if (capabilities.webgpu) return 'webgpu';
  if (capabilities.webgl2) return 'webgl2';
  return 'unsupported';
}

export function detectRendererCapabilities(canvas: HTMLCanvasElement): RendererCapabilities {
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  // A canvas may only be bound to one rendering context family. When WebGPU is
  // available, do not pre-empt the production canvas by probing WebGL2 first.
  // If WebGPU initialization later fails, Renderer.create performs the WebGL2
  // fallback attempt directly and lets the constructor be the capability check.
  const webgl2 = webgpu ? false : Boolean(canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }));
  return { webgpu, webgl2 };
}
