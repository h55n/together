import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  socket.connected = true;
  socket.io = { on: vi.fn() };
  return { listeners, socket };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socketHarness.socket),
}));

import { GameSocketClient } from './GameSocketClient';

describe('GameSocketClient household home synchronization', () => {
  beforeEach(() => {
    socketHarness.listeners.clear();
    vi.clearAllMocks();
  });

  it('invalidates authoritative home state for every persisted home mutation event', () => {
    const onHomeStateChanged = vi.fn();
    const client = new GameSocketClient(
      { userId: 'user-1', householdId: 'household-1' },
      { onHomeStateChanged } as ConstructorParameters<typeof GameSocketClient>[1],
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
