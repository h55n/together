export type RendererBackend = 'webgpu' | 'webgl2' | 'unsupported';
export type RendererCapabilities = { webgpu: boolean; webgl2: boolean };

export function selectRendererBackend(capabilities: RendererCapabilities, forceBackend?: 'webgl2'): RendererBackend {
  if (forceBackend === 'webgl2') return capabilities.webgl2 ? 'webgl2' : 'unsupported';
  if (capabilities.webgpu) return 'webgpu';
  if (capabilities.webgl2) return 'webgl2';
  return 'unsupported';
}

export function resolveRendererForceBackend(search: string, requested?: 'webgl2'): 'webgl2' | undefined {
  if (requested !== 'webgl2') return undefined;
  return new URLSearchParams(search).get('renderer') === 'webgl2' ? 'webgl2' : undefined;
}

export function detectRendererCapabilities(canvas: HTMLCanvasElement, probeWebgl2 = false): RendererCapabilities {
  const webgpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  // A canvas may only be bound to one rendering context family. When WebGPU is
  // available, do not pre-empt the production canvas by probing WebGL2 first.
  // Explicit compatibility mode is the only reason to probe WebGL2 up front.
  const webgl2 = (!webgpu || probeWebgl2)
    ? Boolean(canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }))
    : false;
  return { webgpu, webgl2 };
}
