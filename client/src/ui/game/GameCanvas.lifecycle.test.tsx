import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { namedNpcs, npcDialogue } from '@together/content';
import { GameEngine } from '../../game/GameEngine';
import { GameCanvas } from './GameCanvas';

vi.mock('../../game/GameEngine', () => ({
  GameEngine: { create: vi.fn() },
}));

function engineStub() {
  return {
    applySettings: vi.fn(),
    prepareFirstPlayable: vi.fn(async () => undefined),
    start: vi.fn(),
    dispose: vi.fn(),
    setInputEnabled: vi.fn(),
    setWeather: vi.fn(),
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

async function renderStrictGame(props: Parameters<typeof GameCanvas>[0] = {}): Promise<{ root: Root; host: HTMLDivElement }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<React.StrictMode><GameCanvas {...props} /></React.StrictMode>);
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

  it('does not start gameplay until the first-playable warmup resolves', async () => {
    let releaseWarmup!: () => void;
    const warmup = new Promise<void>((resolve) => { releaseWarmup = resolve; });
    const engine = engineStub();
    engine.prepareFirstPlayable = vi.fn(() => warmup);
    create.mockResolvedValue(engine);

    mounted = await renderGame();
    await flushAsyncWork();

    expect(engine.prepareFirstPlayable).toHaveBeenCalledTimes(1);
    expect(engine.start).not.toHaveBeenCalled();

    await act(async () => { releaseWarmup(); await warmup; });
    await flushAsyncWork();

    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(mounted.host.querySelector('.world-loading')).toBeNull();
  });

  it('does not overlap async engine creation when React StrictMode replays effects', async () => {
    const engine = engineStub();
    create.mockResolvedValue(engine);

    mounted = await renderStrictGame();
    await flushAsyncWork();

    expect(create).toHaveBeenCalledTimes(1);
    expect(engine.prepareFirstPlayable).toHaveBeenCalledTimes(1);
    expect(engine.start).toHaveBeenCalledTimes(1);
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

    const options = create.mock.calls[0]?.[0] as unknown as { onHomeStateChanged?: () => void };
    const onHomeStateChanged = options?.onHomeStateChanged;
    expect(onHomeStateChanged).toBeTypeOf('function');
    await act(async () => { onHomeStateChanged?.(); });
    await flushAsyncWork();

    expect(homeRequestCount).toBeGreaterThanOrEqual(3);
    expect(engine.syncHomeDecoration).toHaveBeenLastCalledWith([
      expect.objectContaining({ objectId: 'live-chair' }),
    ], {});
  });

  it('keeps resident dialogue reactive to weather chosen by the game UI', async () => {
    const engine = engineStub();
    create.mockResolvedValue(engine);
    const npc = namedNpcs[0];
    if (!npc) throw new Error('Expected at least one named NPC');
    const dialogue = npcDialogue[npc.id];
    if (!dialogue) throw new Error(`Missing dialogue for ${npc.id}`);

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/memories')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/npc-memory') && !init?.method) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (url.includes('/npc-memory/') && init?.method === 'POST') return new Response(JSON.stringify({ npcId: npc.id, flags: ['first_meeting'], familiarity: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } });
    await flushAsyncWork();

    const rainButton = Array.from(mounted.host.querySelectorAll('button')).find((button) => button.textContent === 'Rain');
    expect(rainButton).toBeTruthy();
    await act(async () => { rainButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(engine.setWeather).toHaveBeenCalledWith('light_rain');

    const onNpcInteraction = create.mock.calls[0]?.[0].onNpcInteraction;
    expect(onNpcInteraction).toBeTypeOf('function');
    await act(async () => { onNpcInteraction?.(npc.id); });
    await flushAsyncWork();

    expect(mounted.host.textContent).toContain(dialogue.weather);
  });
});
