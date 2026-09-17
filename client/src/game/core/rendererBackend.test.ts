import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectRendererCapabilities, resolveRendererForceBackend, selectRendererBackend } from './rendererBackend';

describe('selectRendererBackend', () => {
  it('prefers WebGPU when both modern backends are available', () => {
    expect(selectRendererBackend({ webgpu: true, webgl2: true })).toBe('webgpu');
  });

  it('falls back to WebGL2 without changing gameplay', () => {
    expect(selectRendererBackend({ webgpu: false, webgl2: true })).toBe('webgl2');
  });

  it('honors an explicit WebGL2 compatibility request even when WebGPU is available', () => {
    expect(selectRendererBackend({ webgpu: true, webgl2: true }, 'webgl2')).toBe('webgl2');
  });

  it('returns unsupported when neither backend exists', () => {
    expect(selectRendererBackend({ webgpu: false, webgl2: false })).toBe('unsupported');
  });
});

describe('renderer compatibility override', () => {
  it('ignores the legacy caller WebGL2 force on a normal URL', () => {
    expect(resolveRendererForceBackend('', 'webgl2')).toBeUndefined();
  });

  it('only forces WebGL2 when the URL explicitly requests compatibility mode', () => {
    expect(resolveRendererForceBackend('?renderer=webgl2', 'webgl2')).toBe('webgl2');
  });
});

describe('detectRendererCapabilities', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not acquire a WebGL context on the production canvas before WebGPU initialization', () => {
    vi.stubGlobal('navigator', { gpu: {} });
    const getContext = vi.fn(() => ({}));
    const canvas = { getContext } as unknown as HTMLCanvasElement;

    const capabilities = detectRendererCapabilities(canvas);

    expect(capabilities.webgpu).toBe(true);
    expect(getContext).not.toHaveBeenCalled();
  });
});
