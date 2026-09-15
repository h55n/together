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
  const webgl2 = Boolean(canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }));
  return { webgpu, webgl2 };
}
