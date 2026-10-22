import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { socketEvents } from '@together/shared';

const socketHarness = vi.hoisted(() => {
  const listeners = new Map<string, (payload?: unknown) => void>();
  const socket: Record<string, unknown> = {};
  socket.on = vi.fn((event: string, listener: (payload?: unknown) => void) => {
    listeners.set(event, listener);
    return socket;
  });
  socket.emit = vi.fn();
  socket.removeAllListeners = vi.fn();
  socket.disconnect = vi.fn();
  socket.connect = vi.fn();
  socket.connected = true;
  socket.active = true;
  socket.io = { on: vi.fn() };
  return { listeners, socket };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socketHarness.socket),
}));

import { GameSocketClient } from './GameSocketClient';
import { io } from 'socket.io-client';

describe('GameSocketClient household home synchronization', () => {
  it('synchronizes the visible clock only from finite canonical city minutes', () => {
    const onTimeSync = vi.fn();
    const client = new GameSocketClient({ userId: 'u1', householdId: 'h1' }, { onTimeSync });
    client.connect();
    socketHarness.listeners.get(socketEvents.timeSync)?.({ gameMinute: 480 });
    for (const gameMinute of [NaN, Infinity, -1, 1440, '480']) socketHarness.listeners.get(socketEvents.timeSync)?.({ gameMinute });
    socketHarness.listeners.get(socketEvents.timeSync)?.(null);
    expect(onTimeSync).toHaveBeenCalledExactlyOnceWith(480);
  });
  it('accepts valid server weather and ignores malformed conditions', () => {
    const onWeatherSync = vi.fn();
    const client = new GameSocketClient({ userId: 'u1', householdId: 'h1' }, { onWeatherSync });
    client.connect();
    socketHarness.listeners.get(socketEvents.weatherSync)?.({ state: 'monsoon_rain' });
    socketHarness.listeners.get(socketEvents.weatherSync)?.({ state: 'hurricane' });
    socketHarness.listeners.get(socketEvents.weatherSync)?.(null);
    expect(onWeatherSync).toHaveBeenCalledExactlyOnceWith('monsoon_rain');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('uses the deployed origin for socket and voice when no separate API origin is configured', async () => {
    vi.stubEnv('VITE_SERVER_URL', '');
    const client = new GameSocketClient({ userId: 'u1', householdId: 'h1', accessToken: 'token' });
    client.connect();
    expect(vi.mocked(io).mock.calls[0]?.[0]).toBe(window.location.origin);
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ iceServers: [] }) }));
    vi.stubGlobal('fetch', fetcher);
    await client.fetchVoiceIceServers();
    expect(fetcher.mock.calls[0]).toEqual(['/api/voice/ice-config', expect.any(Object)]);
  });
  it('uses refreshed credentials for reconnect and voice without disconnecting or mutating its caller', async () => {
    const session = { userId: 'u1', householdId: 'h1', accessToken: 'old' };
    const client = new GameSocketClient(session);
    client.connect();
    client.updateAccessToken('new');
    expect(socketHarness.socket.auth).toEqual({ accessToken: 'new' });
    expect(socketHarness.socket.disconnect).not.toHaveBeenCalled();
    expect(session.accessToken).toBe('old');
    const fetcher = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, json: async () => ({ iceServers: [{ urls: 'stun:test.example' }] }) }));
    vi.stubGlobal('fetch', fetcher);
    await client.fetchVoiceIceServers();
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer new' } });
  });
  beforeEach(() => {
    socketHarness.listeners.clear();
    vi.clearAllMocks();
    socketHarness.socket.connected = true;
    socketHarness.socket.active = true;
  });

  it('retries an auth-rejected inactive socket with the refreshed token', () => {
    const client = new GameSocketClient({ userId: 'u1', householdId: 'h1', accessToken: 'expired' });
    client.connect();
    socketHarness.socket.connected = false;
    socketHarness.socket.active = false;
    client.updateAccessToken('fresh');
    expect(socketHarness.socket.auth).toEqual({ accessToken: 'fresh' });
    expect(socketHarness.socket.connect).toHaveBeenCalledOnce();
  });

  it('leaves an automatic reconnect attempt intact when its socket is still active', () => {
    const client = new GameSocketClient({ userId: 'u1', householdId: 'h1', accessToken: 'old' });
    client.connect();
    socketHarness.socket.connected = false;
    client.updateAccessToken('fresh');
    expect(socketHarness.socket.connect).not.toHaveBeenCalled();
  });

  it('invalidates authoritative home state for every persisted home mutation event', () => {
    const onHomeStateChanged = vi.fn();
    const client = new GameSocketClient(
      { userId: 'user-1', householdId: 'household-1' },
      { onHomeStateChanged } as unknown as ConstructorParameters<typeof GameSocketClient>[1],
    );

    client.connect();

    const events = [
      socketEvents.homeFurniturePlace,
      socketEvents.homeFurnitureMove,
      socketEvents.homeFurnitureRemove,
      socketEvents.homeSurfaceChange,
      socketEvents.homeObjectState,
    ];
    for (const event of events) {
      const listener = socketHarness.listeners.get(event);
      expect(listener).toBeTypeOf('function');
      listener?.({ version: 2 });
    }

    expect(onHomeStateChanged).toHaveBeenCalledTimes(events.length);
  });
});
