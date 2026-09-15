import { describe, expect, it } from 'vitest';
import { selectRendererBackend } from './rendererBackend';

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
