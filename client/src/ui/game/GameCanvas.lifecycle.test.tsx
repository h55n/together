import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { namedNpcs, npcDialogue, recipes } from '@together/content';
import { claimCookingStation, createCookingSession, jobById, releaseCookingStation } from '@together/shared';
import { GameEngine } from '../../game/GameEngine';
import { GameCanvas } from './GameCanvas';

vi.mock('../../game/GameEngine', () => ({
  GameEngine: { create: vi.fn() },
}));

function engineStub() {
  return {
    applySettings: vi.fn(),
    updateAccessToken: vi.fn(),
    prepareFirstPlayable: vi.fn(async () => undefined),
    start: vi.fn(),
    dispose: vi.fn(),
    setInputEnabled: vi.fn(),
    setWeather: vi.fn(),
    syncHomeDecoration: vi.fn(),
    clearHomeDecorationPreview: vi.fn(),
    clearSports: vi.fn(),
    showSports: vi.fn(),
    startAutoRide: vi.fn(),
    getPlayerPosition: vi.fn(() => ({ x: 0, y: 1.2, z: 0 })),
    getMemoryContext: vi.fn(() => ({ locationId: 'Bay Steps', weather: 'clear', gameMinutes: 18 * 60 })),
    getMemoryParticipantContext: vi.fn(() => ({ onlineUserIds: [], visibleUserIds: [], composition: 0.82 })),
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
  it('does not begin travel when a fare reply arrives after Escape dismisses the booking', async () => {
    const engine = engineStub(); create.mockResolvedValue(engine);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/transit/auto')) { await pending; return new Response(JSON.stringify({ fare: 22, personalWallet: 1478 })); }
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }));
      return new Response('[]');
    }));
    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } }); await flushAsyncWork();
    await act(async () => create.mock.calls[0]![0].onAutoStand?.());
    await act(async () => [...mounted!.host.querySelectorAll('button')].find(button => button.textContent === 'Ride')!.click());
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })));
    await act(async () => { release(); }); await flushAsyncWork();
    expect(mounted.host.querySelector('[aria-label="Auto-rickshaw destinations"]')).toBeNull();
    expect(engine.startAutoRide).not.toHaveBeenCalled();
  });
  it('retries a lost auto booking with the same key and origin instead of charging a new ride', async () => {
    const engine = engineStub(); create.mockResolvedValue(engine);
    const requests: Array<{ idempotencyKey: string; from: { x: number; z: number } }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/transit/auto')) {
        requests.push(JSON.parse(String(init?.body)));
        if (requests.length === 1) throw new Error('Reply lost after charging');
        return new Response(JSON.stringify({ fare: 22, personalWallet: 1478 }));
      }
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }));
      return new Response('[]');
    }));
    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } }); await flushAsyncWork();
    await act(async () => create.mock.calls[0]![0].onAutoStand?.());
    const ride = () => [...mounted!.host.querySelectorAll('button')].find(button => button.textContent === 'Ride')!;
    await act(async () => { ride().click(); ride().click(); }); await flushAsyncWork();
    expect(requests).toHaveLength(1);
    vi.mocked(engine.getPlayerPosition).mockReturnValue({ x: 10, y: 1, z: 10 });
    await act(async () => ride().click()); await flushAsyncWork();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(engine.startAutoRide).toHaveBeenCalledOnce();
  });
  const create = vi.mocked(GameEngine.create);
  let mounted: { root: Root; host: HTMLDivElement } | null = null;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    create.mockReset();
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  it.each(['resume', 'lost response'] as const)('recovers a saved job after %s without starting another shift', async (scenario) => {
    const engine = engineStub();
    engine.playContextAction = vi.fn(async () => undefined);
    create.mockResolvedValue(engine);
    const job = jobById('cafe_roshan')!;
    let saved = { id: 'saved-shift', jobId: job.id, state: 'active', completedActions: scenario === 'resume' ? [job.actions[0]!] : [], nextAction: job.actions[scenario === 'resume' ? 1 : 0], totalActions: job.actions.length };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }));
      if (url.endsWith('/memories')) return new Response('[]');
      if (url.endsWith('/jobs')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/start')) return new Response(JSON.stringify({ ...saved, id: 'unwanted-new-shift', completedActions: [], nextAction: job.actions[0] }));
      if (url.endsWith('/advance') && init?.method === 'POST') {
        saved = { ...saved, completedActions: [job.actions[0]!], nextAction: job.actions[1] };
        throw new Error('Response lost after the task was saved');
      }
      return new Response('{}');
    });
    vi.stubGlobal('fetch', fetchMock);
    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } });
    await flushAsyncWork();
    await act(async () => create.mock.calls[0]![0].onVenueInteraction?.({ venueId: 'cafe_roshan', displayName: 'Café Roshan', role: 'hangout' }));
    const start = Array.from(mounted.host.querySelectorAll('button')).find(button => button.textContent === 'Start shift');
    expect(start).toBeTruthy();
    await act(async () => start!.click()); await flushAsyncWork();
    if (scenario === 'lost response') {
      const action = Array.from(mounted.host.querySelectorAll('button')).find(button => button.textContent?.startsWith('Do ·'));
      expect(action).toBeTruthy();
      await act(async () => action!.click()); await flushAsyncWork();
    }
    expect(mounted.host.textContent).toContain('Do · Grind');
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/start'))).toHaveLength(0);
  });

  it.each(['start', 'advance', 'complete'] as const)('does not reopen a dismissed shift after a delayed %s response', async (operation) => {
    const engine = engineStub();
    engine.playContextAction = vi.fn(async () => undefined);
    create.mockResolvedValue(engine);
    const job = jobById('cafe_roshan')!;
    const saved = { id: 'delayed-shift', jobId: job.id, state: 'active', completedActions: operation === 'complete' ? [...job.actions] : [], nextAction: operation === 'complete' ? null : job.actions[0], totalActions: job.actions.length };
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let requested = false;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }));
      if (url.endsWith('/memories')) return new Response('[]');
      if (url.endsWith('/jobs')) return new Response(JSON.stringify(operation === 'start' ? [] : [saved]));
      if (url.endsWith(`/${operation}`)) {
        requested = true; await pending;
        return new Response(JSON.stringify(operation === 'complete' ? { session: { ...saved, state: 'complete' }, economy: { personalWallet: 1700 } } : saved));
      }
      return new Response('{}');
    }));
    mounted = await renderGame({ networkSession: { userId: 'user-1', householdId: 'household-1' } });
    await flushAsyncWork();
    await act(async () => create.mock.calls[0]![0].onVenueInteraction?.({ venueId: 'cafe_roshan', displayName: 'Café Roshan', role: 'hangout' }));
    const button = (text: string) => Array.from(mounted!.host.querySelectorAll('button')).find(item => item.textContent?.startsWith(text))!;
    await act(async () => button('Start shift').click()); await flushAsyncWork();
    if (operation !== 'start') {
      await act(async () => button(operation === 'advance' ? 'Do ·' : 'Clock out & get paid').click()); await flushAsyncWork();
    }
    expect(requested).toBe(true);
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })));
    expect(mounted.host.querySelector('.job-panel')).toBeNull();
    await act(async () => { release(); await pending; }); await flushAsyncWork();
    expect(mounted.host.querySelector('.job-panel')).toBeNull();
    expect(engine.setInputEnabled).toHaveBeenLastCalledWith(true);
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

  it.each(['save failure', 'interrupted animation', 'release failure'])('releases the kitchen station after %s and permits retry', async (failure) => {
    const engine = engineStub();
    engine.playCookingAction = vi.fn(async () => { if (failure === 'interrupted animation') throw new Error('Action interrupted'); });
    create.mockResolvedValue(engine);
    const recipe = recipes[0]!;
    let state = createCookingSession('cook-state', recipe);
    const step = recipe.steps.find(candidate => state.availableStepIds.includes(candidate.id))!;
    const session = () => ({ id: 'cook-1', recipeId: recipe.id, state, householdId: 'h1', createdAt: '', updatedAt: '' });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/home')) return json({ version: 0, objects: [], surfaces: {} });
      if (url.endsWith('/memories') || url.endsWith('/inventory')) return json([]);
      if (url.endsWith('/cooking')) return json([session()]);
      if (url.endsWith('/claim')) { state = claimCookingStation(state, 'u1', step.station); return json(session()); }
      if (url.endsWith('/release')) {
        if (failure === 'release failure') return json({ error: 'Station release unavailable' }, 503);
        state = releaseCookingStation(state, 'u1', step.station); return json(session());
      }
      if (url.includes('/steps/')) return json({ error: 'Step save unavailable' }, 503);
      return json({});
    });
    vi.stubGlobal('fetch', fetchMock);
    mounted = await renderGame({ networkSession: { userId: 'u1', householdId: 'h1' } });
    await flushAsyncWork();
    await act(async () => create.mock.calls[0]![0].onKitchenInteraction?.());
    await flushAsyncWork();
    const button = mounted.host.querySelector<HTMLButtonElement>('.cooking-step')!;
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    await flushAsyncWork();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/release'))).toBe(true);
    expect(mounted.host.querySelector<HTMLButtonElement>('.cooking-step')!.disabled).toBe(false);
    expect(mounted.host.textContent).toContain(failure === 'interrupted animation' ? 'Action interrupted' : 'Step save unavailable');
    if (failure === 'release failure') expect(mounted.host.textContent).toContain('Station release unavailable');
    if (failure === 'interrupted animation') expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/steps/'))).toBe(false);
  });

  it('keeps the world alive when credentials refresh, but replaces it for another household', async () => {
    const engine = engineStub();
    create.mockResolvedValue(engine);
    mounted = await renderGame({ networkSession: { userId: 'u1', householdId: 'h1', accessToken: 'old' } });
    await flushAsyncWork();
    await act(async () => mounted!.root.render(<GameCanvas networkSession={{ userId: 'u1', householdId: 'h1', accessToken: 'new' }} />));
    await flushAsyncWork();
    expect(create).toHaveBeenCalledTimes(1);
    expect(engine.dispose).not.toHaveBeenCalled();
    expect(engine.updateAccessToken).toHaveBeenLastCalledWith('new');
    await act(async () => mounted!.root.render(<GameCanvas networkSession={{ userId: 'u1', householdId: 'h2', accessToken: 'new' }} />));
    await flushAsyncWork();
    expect(create).toHaveBeenCalledTimes(2);
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it('uses the newest token when refresh happens during first-playable preparation', async () => {
    let release!: () => void;
    const warmup = new Promise<void>(resolve => { release = resolve; });
    const engine = engineStub();
    engine.prepareFirstPlayable = vi.fn(() => warmup);
    create.mockResolvedValue(engine);
    mounted = await renderGame({ networkSession: { userId: 'u1', householdId: 'h1', accessToken: 'old' } });
    await flushAsyncWork();
    await act(async () => mounted!.root.render(<GameCanvas networkSession={{ userId: 'u1', householdId: 'h1', accessToken: 'new' }} />));
    await act(async () => { release(); await warmup; });
    await flushAsyncWork();
    expect(create).toHaveBeenCalledTimes(1);
    expect(engine.updateAccessToken).toHaveBeenLastCalledWith('new');
    expect(engine.start).toHaveBeenCalledOnce();
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
    expect(mounted.host.querySelector('.weather-debug')).toBeNull();
  });

  it('disposes a created engine when first-playable preparation fails', async () => {
    const engine = engineStub();
    vi.mocked(engine.prepareFirstPlayable).mockRejectedValue(new Error('prewarm failed'));
    create.mockResolvedValue(engine);
    mounted = await renderGame();
    await flushAsyncWork();
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(engine.start).not.toHaveBeenCalled();
    expect(mounted.host.textContent).toContain('prewarm failed');
    await act(async () => mounted?.root.unmount());
    expect(engine.dispose).toHaveBeenCalledOnce();
  });

  it('retries failed preparation on a fresh canvas even in compatibility mode', async () => {
    window.history.replaceState({}, '', '/?renderer=webgl2');
    const failed = engineStub();
    const recovered = engineStub();
    vi.mocked(failed.prepareFirstPlayable).mockRejectedValue(new Error('shader preparation failed'));
    create.mockResolvedValueOnce(failed).mockResolvedValueOnce(recovered);
    mounted = await renderGame();
    await flushAsyncWork();
    const oldCanvas = mounted.host.querySelector('canvas');
    const retry = Array.from(mounted.host.querySelectorAll('button')).find(button => /retry/i.test(button.textContent ?? ''));
    expect(retry).toBeDefined();
    await act(async () => retry?.click());
    await flushAsyncWork();
    expect(mounted.host.querySelector('canvas')).not.toBe(oldCanvas);
    expect(mounted.host.querySelector('.world-loading')).toBeNull();
    expect(mounted.host.querySelector('.compatibility-card')).toBeNull();
    expect(recovered.start).toHaveBeenCalledOnce();
    expect(failed.dispose).toHaveBeenCalledOnce();
  });

  it('focuses a dialog, traps Tab and returns focus to the world after Escape', async () => {
    create.mockResolvedValue(engineStub());
    mounted = await renderGame();
    await flushAsyncWork();
    const canvas = mounted.host.querySelector('canvas')!;
    canvas.focus();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })));
    const dialog = mounted.host.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    const tab = new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => document.activeElement?.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(true);
    expect(mounted.host.querySelector('.city-map-panel')).not.toBeNull();
    expect(mounted.host.querySelector('.life-panel')).toBeNull();
    await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true })));
    expect(mounted.host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(canvas);
  });

  it('replaces a failed graphics canvas, reapplies menu input gating and ignores stale failures', async () => {
    const initial = engineStub();
    const recovered = engineStub();
    create.mockResolvedValueOnce(initial).mockResolvedValueOnce(recovered);
    mounted = await renderGame();
    await flushAsyncWork();
    const firstCanvas = mounted.host.querySelector('canvas');
    const failure = create.mock.calls[0]?.[0].onRendererDeviceLost;
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); });
    expect(initial.setInputEnabled).toHaveBeenLastCalledWith(false);
    await act(async () => { failure?.(); });
    await flushAsyncWork();
    expect(initial.dispose).toHaveBeenCalledOnce();
    expect(mounted.host.querySelector('canvas')).not.toBe(firstCanvas);
    expect(create.mock.calls[1]?.[0].forceRendererBackend).toBe('webgl2');
    expect(create.mock.calls[1]?.[0].recoverRenderer).toBe(true);
    expect(recovered.setInputEnabled).toHaveBeenLastCalledWith(false);
    await act(async () => { failure?.(); });
    expect(mounted.host.querySelector('.world-loading')).toBeNull();
    expect(create).toHaveBeenCalledTimes(2);
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
    window.history.replaceState({}, '', '/?worldReview=1');
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
