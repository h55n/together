import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Renderer } from './Renderer';

const graphics = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof THREE>(),
  WebGLRenderer: class { constructor() { return graphics.create(); } },
}));
vi.mock('three/webgpu', () => ({ WebGPURenderer: class { constructor() { return graphics.create(); } } }));

function graphicsHarness() {
  const frames: string[] = [];
  return {
    frames,
    info: { render: { calls: 0, triangles: 0 } }, shadowMap: { enabled: false },
    init: undefined as (() => Promise<void>) | undefined,
    setPixelRatio() {}, setSize() {}, dispose() {},
    compile() { frames.push('compile'); },
    compileAsync: () => new Promise<void>(() => {}),
    render() { frames.push('render'); },
  };
}

async function createRenderer(runtime: ReturnType<typeof graphicsHarness>, webgpu = false) {
  graphics.create.mockReturnValue(runtime);
  vi.stubGlobal('navigator', webgpu ? { gpu: { requestAdapter: async () => ({}) } } : {});
  const canvas = { getContext: () => ({}) } as unknown as HTMLCanvasElement;
  return Renderer.create(canvas);
}

describe('first playable shader preparation', () => {
  it('reduces standard-density resolution without changing CSS size and retains scale through resize', async () => {
    const runtime = graphicsHarness();
    runtime.setPixelRatio = vi.fn(); runtime.setSize = vi.fn();
    const renderer = await createRenderer(runtime);
    renderer.resize(1280, 720, 1);
    renderer.setPixelRatioCap(1.5);
    renderer.setResolutionScale(0.85);
    renderer.resize(1280, 720, 1);
    expect(runtime.setPixelRatio).toHaveBeenLastCalledWith(0.85);
    expect(runtime.setSize).toHaveBeenLastCalledWith(1280, 720);
    renderer.dispose();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('renders native WebGL without waiting indefinitely for parallel shader completion polling', async () => {
    const runtime = graphicsHarness();
    const renderer = await createRenderer(runtime);
    let ready = false;
    void renderer.prewarm(new THREE.Scene(), new THREE.PerspectiveCamera()).then(() => { ready = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(ready).toBe(true);
    expect(runtime.frames).toEqual(['compile', 'render']);
  });

  it('does not render a renderer disposed before preparation', async () => {
    const runtime = graphicsHarness();
    runtime.compileAsync = async () => undefined;
    const renderer = await createRenderer(runtime);
    renderer.dispose();
    await expect(renderer.prewarm(new THREE.Scene(), new THREE.PerspectiveCamera())).rejects.toThrow(/disposed|cancel/i);
    expect(runtime.frames).toEqual([]);
  });

  it('reports shader/render failures instead of declaring the world ready', async () => {
    const runtime = graphicsHarness();
    runtime.compileAsync = async () => undefined;
    runtime.render = () => { throw new Error('shader link failure'); };
    const renderer = await createRenderer(runtime);
    await expect(renderer.prewarm(new THREE.Scene(), new THREE.PerspectiveCamera())).rejects.toThrow('shader link failure');
  });

  it('reports an asynchronous GPU preparation timeout without rendering later', async () => {
    vi.useFakeTimers();
    const runtime = graphicsHarness();
    let complete!: () => void;
    runtime.compileAsync = () => new Promise<void>(resolve => { complete = resolve; });
    const renderer = await createRenderer(runtime, true);
    let error: unknown;
    void renderer.prewarm(new THREE.Scene(), new THREE.PerspectiveCamera()).catch(cause => { error = cause; });
    await vi.advanceTimersByTimeAsync(15_001);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toMatch(/timed out/i);
    complete();
    await Promise.resolve();
    expect(runtime.frames).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending preparation on disposal and handles late GPU rejection', async () => {
    const runtime = graphicsHarness();
    let fail!: (cause: Error) => void;
    runtime.compileAsync = () => new Promise<void>((_resolve, reject) => { fail = reject; });
    const renderer = await createRenderer(runtime, true);
    let error: unknown;
    void renderer.prewarm(new THREE.Scene(), new THREE.PerspectiveCamera()).catch(cause => { error = cause; });
    renderer.dispose();
    await Promise.resolve();
    await Promise.resolve();
    expect(error).toBeInstanceOf(Error);
    fail(new Error('late driver error'));
    await Promise.resolve();
    expect(runtime.frames).toEqual([]);
  });

  it('cancels pending renderer initialization and releases the allocated graphics object', async () => {
    const runtime = graphicsHarness();
    let initializing = false;
    let released = false;
    runtime.init = () => { initializing = true; return new Promise<void>(() => {}); };
    runtime.dispose = () => { released = true; };
    graphics.create.mockReturnValue(runtime);
    vi.stubGlobal('navigator', { gpu: { requestAdapter: async () => ({}) } });
    const controller = new AbortController();
    const creation = Renderer.create({ getContext: () => ({}) } as unknown as HTMLCanvasElement, { signal: controller.signal });
    let failure: unknown;
    void creation.catch(error => { failure = error; });
    for (let i = 0; i < 20 && !initializing; i++) await Promise.resolve();
    expect(initializing).toBe(true);
    controller.abort();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(failure).toBeInstanceOf(Error);
    expect(released).toBe(true);
  });
});
