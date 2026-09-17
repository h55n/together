import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../game/GameEngine';
import { GameCanvas } from './GameCanvas';

vi.mock('../../game/GameEngine', () => ({
  GameEngine: { create: vi.fn() },
}));

function engineStub() {
  return {
    applySettings: vi.fn(),
    start: vi.fn(),
    dispose: vi.fn(),
    setInputEnabled: vi.fn(),
    syncHomeDecoration: vi.fn(),
    clearHomeDecorationPreview: vi.fn(),
    getPlayerPosition: vi.fn(() => ({ x: 0, y: 1.2, z: 0 })),
    getMemoryContext: vi.fn(() => ({ locationId: 'Bay Steps', weather: 'clear', gameMinutes: 18 * 60 })),
    captureFrame: vi.fn(async () => new Blob(['frame'], { type: 'image/jpeg' })),
  } as unknown as GameEngine;
}

async function renderGame(props: Parameters<typeof GameCanvas>[0] = {}): Promise<{ root: Root; host: HTMLDivElement }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<GameCanvas {...props} />);
    await Promise.resolve();
  });
  return { root, host };
}

async function flushAsyncWork(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

describe('GameCanvas engine lifecycle', () => {
  const create = vi.mocked(GameEngine.create);
  let mounted: { root: Root; host: HTMLDivElement } | null = null;

  beforeEach(() => {
    create.mockReset();
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  afterEach(async () => {
    if (mounted) {
      await act(async () => mounted?.root.unmount());
      mounted.host.remove();
      mounted = null;
    }
    vi.unstubAllGlobals();
  });

  it('keeps normal startup WebGPU-first instead of forcing WebGL2 compatibility mode', async () => {
    create.mockResolvedValue(engineStub());
    mounted = await renderGame();
    await flushAsyncWork();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0].forceRendererBackend).toBeUndefined();
  });

  it('does not recreate the engine when automatic Memory capture toggles UI capture state', async () => {
    const engine = engineStub();
    create.mockResolvedValue(engine);
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('/memory-images/') && init?.method === 'POST') return new Response(JSON.stringify({ screenshotPath: 'memory-image:auto-test' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/memories') && init?.method === 'POST') return new Response(JSON.stringify({ id: 'memory-1', type: 'automatic', screenshotPath: 'memory-image:auto-test', caption: 'Bay Steps', locationId: 'Bay Steps', weather: 'clear', participants: ['user-1'], metadata: {}, createdAt: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/memories')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } });
    await flushAsyncWork();
    expect(create).toHaveBeenCalledTimes(1);

    const opportunity = create.mock.calls[0]?.[0].onMemoryOpportunity;
    expect(opportunity).toBeTypeOf('function');
    await act(async () => { opportunity?.('sunset'); });
    await flushAsyncWork();
    await flushAsyncWork();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('refreshes authoritative home state when realtime home invalidation arrives', async () => {
    const engine = engineStub();
    create.mockResolvedValue(engine);
    let homeRequestCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/home')) {
        homeRequestCount += 1;
        return new Response(JSON.stringify({
          version: homeRequestCount,
          objects: homeRequestCount >= 3 ? [{
            objectId: 'live-chair',
            definitionId: 'chair_basic',
            roomId: 'living',
            transform: { position: { x: 1, y: 0, z: 1 }, rotationY: 0, scale: 1 },
          }] : [],
          surfaces: {},
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('/memories')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } });
    await flushAsyncWork();

    const onHomeStateChanged = create.mock.calls[0]?.[0].onHomeStateChanged;
    expect(onHomeStateChanged).toBeTypeOf('function');
    await act(async () => { onHomeStateChanged?.(); });
    await flushAsyncWork();

    expect(homeRequestCount).toBeGreaterThanOrEqual(3);
    expect(engine.syncHomeDecoration).toHaveBeenLastCalledWith([
      expect.objectContaining({ objectId: 'live-chair' }),
    ], {});
  });
});
