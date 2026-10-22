import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptPicnicCommand, acceptTransportRentalCommand, createPicnicState, createActivityState, createTransportRentalState, type PicnicCommand, type TransportRentalCommand } from '@together/shared';
import { GameEngine } from '../../game/GameEngine';
import { GameCanvas } from './GameCanvas';
import type { ActivitySessionView } from './ActivityPanel';

vi.mock('../../game/GameEngine', () => ({ GameEngine: { create: vi.fn() } }));

describe('activity request lifecycle', () => {
  let root: Root;
  let host: HTMLDivElement;
  const create = vi.mocked(GameEngine.create);
  let saved: ActivitySessionView;
  let engine: GameEngine;

  const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };
  const button = (name: string) => Array.from(host.querySelectorAll('button')).find(item => item.textContent === name)!;
  const open = async () => { await act(async () => create.mock.calls[0]![0].onActivityInteraction?.(saved.activityId)); await flush(); };
  const setRentalActivity = (activityId: 'cycling' | 'kayak', participants: string[] = ['user-1']) => {
    saved = { ...saved, activityId, state: { ...createActivityState(activityId, 'user-1'), participants, transportRental: createTransportRentalState({ sessionId: saved.id, activityId, participants }) } };
  };
  const saveRentalCommand = (command: TransportRentalCommand, actor = 'user-1') => {
    const receipt = saved.state.receipts?.[command.key];
    if (receipt) {
      expect(receipt).toEqual({ actor, fingerprint: JSON.stringify(command) });
      return saved;
    }
    const transportRental = acceptTransportRentalCommand(saved.state.transportRental!, actor, command);
    const revision = (saved.state.revision ?? 0) + 1;
    saved = { ...saved, state: { ...saved.state, revision, transportRental, receipts: { ...saved.state.receipts, [command.key]: { actor, fingerprint: JSON.stringify(command) } } } };
    return saved;
  };
  const mount = async (request: (url: string, init?: RequestInit) => Promise<Response>) => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/home')) return new Response(JSON.stringify({ version: 0, objects: [], surfaces: {} }));
      if (url.endsWith('/memories') && init?.method !== 'POST') return new Response('[]');
      if (url.endsWith('/inventory') || url.endsWith('/cooking')) return new Response('[]');
      // Ambient hydration has its own request-race suite. These fixtures delay
      // the panel's list request, rather than the independent world refresh.
      if (url.endsWith('/activities') && init?.signal) return new Response(JSON.stringify([saved]));
      return request(url, init);
    }));
    await act(async () => root.render(<GameCanvas networkSession={{ userId: 'user-1', householdId: 'household-1' }} />));
    await flush();
  };

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    create.mockReset(); localStorage.clear(); window.history.replaceState({}, '', '/');
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    saved = { id: 'kayak-1', householdId: 'household-1', activityId: 'kayak', state: createActivityState('kayak', 'user-1'), createdAt: '', updatedAt: '' };
    setRentalActivity('kayak');
    engine = { applySettings: vi.fn(), updateAccessToken: vi.fn(), prepareFirstPlayable: vi.fn(async () => undefined), start: vi.fn(), dispose: vi.fn(), setInputEnabled: vi.fn(), syncHomeDecoration: vi.fn(), clearHomeDecorationPreview: vi.fn(), clearSports: vi.fn(), showSports: vi.fn(), playActivityStep: vi.fn(async () => undefined) } as unknown as GameEngine;
    engine.getMemoryContext = vi.fn(() => ({ locationId: 'Bay Steps', weather: 'clear' as const, gameMinutes: 1080 }));
    engine.syncAmbientActivities = vi.fn(); engine.upsertAmbientActivity = vi.fn();
    engine.getMemoryParticipantContext = vi.fn(() => ({ onlineUserIds: ['user-2'], visibleUserIds: [], composition: 0 }));
    create.mockResolvedValue(engine);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

  it('opens the same newest picnic that owns the canonical ambient spot', async () => {
    saved = { ...saved, id: 'newest', activityId: 'picnic', createdAt: '2026-10-13T08:00:00Z', state: { ...createActivityState('picnic', 'user-1'), picnic: createPicnicState(['user-1']) } };
    const older = { ...saved, id: 'older', createdAt: '2026-10-12T08:00:00Z' };
    await mount(async url => new Response(JSON.stringify(url.endsWith('/activities') ? [older, saved] : saved)));
    await open();
    expect(vi.mocked(engine.upsertAmbientActivity).mock.calls[0]?.[0]).toEqual(saved);
  });

  it.each(['lost reply', 'dismissed late reply'] as const)('preserves an authoritative picnic command after %s', async scenario => {
    saved = { ...saved, activityId: 'picnic', state: { ...createActivityState('picnic', 'user-1'), revision: 0, picnic: createPicnicState(['user-1']) } };
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const commands: PicnicCommand[] = [];
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/picnic/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as PicnicCommand;
        commands.push(command);
        saved = { ...saved, state: { ...saved.state, revision: 1, picnic: acceptPicnicCommand(saved.state.picnic!, 'user-1', ['user-1'], command), receipts: { [command.key]: { actor: 'user-1', fingerprint: JSON.stringify(command) } } } };
        if (scenario === 'lost reply') throw new Error('Reply lost after commit');
        await pending;
      }
      return new Response(JSON.stringify(saved));
    });
    await open();
    await act(async () => button('Place picnic mat').click()); await flush();
    if (scenario === 'dismissed late reply') {
      await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Picnic on the lawn"] .panel-close')!.click());
      await act(async () => release()); await flush();
      expect(host.querySelector('[aria-label="Picnic on the lawn"]')).toBeNull();
      expect(engine.setInputEnabled).toHaveBeenLastCalledWith(true);
    } else {
      expect(button('Move picnic mat here')).toBeTruthy();
      expect(host.textContent).toContain('Saved move recovered.');
    }
    expect(commands).toHaveLength(1);
    expect(saved.state.picnic?.revision).toBe(1);
    expect(saved.state.picnic?.mat).toEqual({ x: 0, z: 0, placedBy: 'user-1' });
  });

  it('frames photography nonmodally and retries a lost Memory reply with the original image and key', async () => {
    saved = { ...saved, activityId: 'photography', state: { ...createActivityState('photography', 'user-1'), revision: 1, completedStepIds: ['frame'] } };
    engine.captureFrame = vi.fn(async () => new Blob(['photo'], { type: 'image/jpeg' }));
    const memoryBodies: Record<string, unknown>[] = [], images: string[] = [];
    let lost = true;
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.includes('/memory-images/') && init?.method === 'POST') { images.push(url); return new Response('{}'); }
      if (url.endsWith('/memories') && init?.method === 'POST') {
        memoryBodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        if (lost) { lost = false; throw new Error('Memory reply lost'); }
        return new Response(JSON.stringify({ id: 'memory-1', caption: 'Bay', screenshotPath: memoryBodies[0]!.screenshotPath, participants: ['user-1'] }));
      }
      if (url.endsWith('/photography/capture')) {
        const command = JSON.parse(String(init?.body)) as { memoryId: string };
        expect(command.memoryId).toBe('memory-1');
        saved = { ...saved, state: { ...saved.state, revision: 2, completedStepIds: ['frame', 'capture'], photographyMemoryId: command.memoryId, status: 'complete' } };
        return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open();
    expect(host.querySelector('[aria-label="Photography outing"]')).not.toBeNull();
    expect(engine.setInputEnabled).toHaveBeenLastCalledWith(true);
    await act(async () => button('Take photo').click()); await flush();
    expect(saved.state.status).toBe('active');
    expect(host.textContent).toContain('retry the original photo');
    await act(async () => button('Retry photo save').click()); await flush();
    expect(saved.state.photographyMemoryId).toBe('memory-1');
    expect(engine.captureFrame).toHaveBeenCalledOnce();
    expect(images).toHaveLength(1);
    expect(memoryBodies).toHaveLength(2);
    expect(memoryBodies[1]).toEqual(memoryBodies[0]);
  });

  it('does not open an activity after the player opens the kitchen during its pending request', async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await mount(async url => {
      if (url.endsWith('/activities')) { await pending; return new Response(JSON.stringify([saved])); }
      return new Response('{}');
    });
    await open();
    await act(async () => create.mock.calls[0]![0].onKitchenInteraction?.());
    await act(async () => release()); await flush();
    expect(host.querySelector('.activity-panel')).toBeNull();
  });

  it('starts only one request when interaction callbacks arrive before React renders busy state', async () => {
    let release!: () => void;
    let requests = 0;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await mount(async url => {
      if (url.endsWith('/activities')) { requests += 1; await pending; return new Response(JSON.stringify([saved])); }
      return new Response('{}');
    });
    await act(async () => {
      create.mock.calls[0]![0].onActivityInteraction?.('kayak');
      create.mock.calls[0]![0].onActivityInteraction?.('kayak');
    });
    await act(async () => release()); await flush();
    expect(requests).toBe(1);
  });

  it('ignores an older realtime failure after closing and reopening the activity', async () => {
    let release!: () => void;
    let lists = 0;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await mount(async url => {
      if (url.endsWith('/activities')) {
        if (++lists === 2) { await pending; return new Response('{}', { status: 503 }); }
        return new Response(JSON.stringify([saved]));
      }
      return new Response('{}');
    });
    await open(); await act(async () => create.mock.calls[0]![0].onActivityStateChanged?.());
    await act(async () => host.querySelector<HTMLButtonElement>('.activity-panel .panel-close')!.click());
    await open(); await act(async () => release()); await flush();
    expect(host.textContent).not.toContain('Activity list failed');
  });

  it('recovers a committed rental after a lost reply without repeating the command', async () => {
    setRentalActivity('cycling');
    let loseReply = true;
    const commands: TransportRentalCommand[] = [];
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        commands.push(command); saveRentalCommand(command);
        if (loseReply) { loseReply = false; throw new Error('Reply lost after commit'); }
        return new Response(JSON.stringify(saved));
      }
      if (url.endsWith('/sports')) return new Response(JSON.stringify(saved));
      return new Response('{}');
    });
    await open(); await act(async () => button('Rent bicycle').click()); await flush();
    expect(button('Ride bicycle')).toBeTruthy();
    expect(commands.map(command => command.kind)).toEqual(['rent']);
    expect(saved.state.transportRental?.rentals[0]?.ownerUserId).toBe('user-1');
    expect(host.textContent).not.toContain('Reply lost after commit');
  });

  it('keeps a dismissed rental panel closed when its committed command reply arrives late', async () => {
    setRentalActivity('cycling');
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        saveRentalCommand(JSON.parse(String(init.body)) as TransportRentalCommand);
        await pending; return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open(); await act(async () => button('Rent bicycle').click()); await flush();
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Bicycle rental"] .panel-close')!.click());
    await act(async () => release()); await flush();
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('rented');
    expect(host.querySelector('[aria-label="Bicycle rental"]')).toBeNull();
    expect(engine.setInputEnabled).toHaveBeenLastCalledWith(true);
  });

  it('does not send duplicate rental commands from a double click', async () => {
    setRentalActivity('cycling');
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const commands: TransportRentalCommand[] = [];
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        commands.push(command); saveRentalCommand(command);
        await pending; return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open();
    await act(async () => { button('Rent bicycle').click(); button('Rent bicycle').click(); });
    expect(commands).toHaveLength(1);
    await act(async () => release()); await flush();
    expect(saved.state.transportRental?.rentals).toHaveLength(1);
  });

  it('returns rented equipment after the player finishes the travel hint', async () => {
    setRentalActivity('cycling');
    saveRentalCommand({ key: 'seed-rent', expectedRevision: 0, kind: 'rent' });
    let finish!: () => void;
    const travelling = new Promise<{ underway: boolean }>(resolve => { finish = () => resolve({ underway: true }); });
    engine.playTransportOuting = vi.fn(async () => travelling);
    engine.finishTransportOuting = vi.fn(() => finish());
    const commands: TransportRentalCommand[] = [];
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        commands.push(command); saveRentalCommand(command); return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open(); await act(async () => button('Ride bicycle').click()); await flush();
    expect(host.querySelector('.activity-travel-hint')).not.toBeNull();
    await act(async () => button('Park bicycle').click()); await flush();
    expect(engine.playTransportOuting).toHaveBeenCalledOnce();
    expect(engine.finishTransportOuting).toHaveBeenCalledOnce();
    expect(commands.map(command => command.kind)).toEqual(['depart', 'return']);
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('returned');
    expect(host.textContent).toContain('Equipment returned.');
  });

  it('aborts a physical outing on Leave outing without sending a second rental command', async () => {
    setRentalActivity('cycling');
    saveRentalCommand({ key: 'seed-rent', expectedRevision: 0, kind: 'rent' });
    let signal: AbortSignal | undefined;
    engine.playTransportOuting = vi.fn(async (_kind, ownedSignal?: AbortSignal) => {
      signal = ownedSignal;
      return new Promise<{ underway: boolean }>(resolve => ownedSignal!.addEventListener('abort', () => resolve({ underway: false }), { once: true }));
    });
    const commands: TransportRentalCommand[] = [];
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        commands.push(command); saveRentalCommand(command); return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open(); await act(async () => button('Ride bicycle').click()); await flush();
    await act(async () => button('Leave outing').click()); await flush();
    expect(signal?.aborted).toBe(true);
    expect(commands.map(command => command.kind)).toEqual(['depart']);
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('in_use');
    expect(host.querySelector('.activity-travel-hint')).toBeNull();
  });

  it('keeps a returned rental after an older activity snapshot arrives late', async () => {
    setRentalActivity('cycling');
    saveRentalCommand({ key: 'seed-rent', expectedRevision: 0, kind: 'rent' });
    let release!: () => void;
    let lists = 0;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) {
        const snapshot = JSON.stringify([saved]);
        if (++lists === 2) { await pending; return new Response(snapshot); }
        return new Response(snapshot);
      }
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        saveRentalCommand(JSON.parse(String(init.body)) as TransportRentalCommand);
        return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open(); await act(async () => create.mock.calls[0]![0].onActivityStateChanged?.());
    await act(async () => button('Return equipment').click()); await flush();
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('returned');
    await act(async () => release()); await flush();
    expect(host.textContent).toContain('Equipment returned.');
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('returned');
  });

  it('retries a rejected return with the current revision after a peer advances the rental state', async () => {
    setRentalActivity('cycling', ['user-1', 'peer']);
    saveRentalCommand({ key: 'seed-rent', expectedRevision: 0, kind: 'rent' });
    const rentalId = saved.state.transportRental!.rentals[0]!.rentalId;
    const posted: TransportRentalCommand[] = [];
    let rejectStaleReturn = true;
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        posted.push(command);
        if (rejectStaleReturn && command.kind === 'return') {
          rejectStaleReturn = false;
          return new Response(JSON.stringify({ error: 'Rental activity changed; refresh before continuing.' }), { status: 409 });
        }
        saveRentalCommand(command);
        return new Response(JSON.stringify(saved));
      }
      if (url.endsWith('/sports')) return new Response(JSON.stringify(saved));
      return new Response('{}');
    });
    await open();
    saveRentalCommand({ key: 'peer-rent', expectedRevision: 1, kind: 'rent' }, 'peer');
    await act(async () => button('Return equipment').click()); await flush();
    expect(button('Retry outing save')).toBeTruthy();
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({ kind: 'return', rentalId, expectedRevision: 1 });

    await act(async () => button('Retry outing save').click()); await flush();
    expect(posted).toHaveLength(2);
    expect(posted[1]).toMatchObject({ kind: 'return', rentalId, expectedRevision: 2 });
    expect(posted[1]!.key).not.toBe(posted[0]!.key);
    expect(saved.state.transportRental?.rentals.find(item => item.rentalId === rentalId)?.status).toBe('returned');
    expect(host.textContent).toContain('Equipment returned.');
  });

  it('recovers a lost departure before returning and never mounts twice', async () => {
    setRentalActivity('cycling');
    saveRentalCommand({ key: 'seed-rent', expectedRevision: 0, kind: 'rent' });
    engine.playTransportOuting = vi.fn(async () => ({ underway: true }));
    const rentalId = saved.state.transportRental!.rentals[0]!.rentalId;
    const posted: TransportRentalCommand[] = [];
    let loseFirstDepart = true;
    let failFirstReconciliation = true;
    await mount(async (url, init) => {
      if (url.endsWith('/activities')) return new Response(JSON.stringify([saved]));
      if (url.endsWith('/rental/commands') && init?.method === 'POST') {
        const command = JSON.parse(String(init.body)) as TransportRentalCommand;
        posted.push(command);
        saveRentalCommand(command);
        if (command.kind === 'depart' && loseFirstDepart) { loseFirstDepart = false; throw new Error('Departure reply lost'); }
        return new Response(JSON.stringify(saved));
      }
      if (url.endsWith('/sports')) {
        if (failFirstReconciliation) { failFirstReconciliation = false; return new Response('{}', { status: 503 }); }
        return new Response(JSON.stringify(saved));
      }
      return new Response('{}');
    });
    await open(); await act(async () => button('Ride bicycle').click()); await flush();
    expect(host.textContent).toContain('Departure reply lost');
    expect(host.querySelector('.activity-travel-hint')).toBeNull();
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('in_use');
    expect(engine.playTransportOuting).not.toHaveBeenCalled();

    await act(async () => button('Return equipment').click()); await flush();
    expect(posted.map(command => command.kind)).toEqual(['depart', 'depart', 'return']);
    expect(posted[1]).toEqual(posted[0]);
    expect(posted[2]).toMatchObject({ kind: 'return', rentalId, expectedRevision: 2 });
    expect(posted[2]!.key).not.toBe(posted[0]!.key);
    expect(engine.playTransportOuting).not.toHaveBeenCalled();
    expect(engine.playActivityStep).toHaveBeenCalledOnce();
    expect(saved.state.transportRental?.rentals[0]?.status).toBe('returned');
  });


});
