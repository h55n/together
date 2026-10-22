import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptTransportRentalCommand, createActivityState, createTransportRentalState, type TransportRentalCommand } from '@together/shared';
import { TransportRentalPanel } from './TransportRentalPanel';

describe('transport rental controls', () => {
  let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  it('requires an explicit safety acknowledgement before offering kayak launch', async () => {
    const rented = acceptTransportRentalCommand(createTransportRentalState({ sessionId: 'session', activityId: 'kayak', participants: ['a'] }), 'a', { key: 'rent', expectedRevision: 0, kind: 'rent' });
    const session = { id: 'session', householdId: 'household', activityId: 'kayak' as const, state: { ...createActivityState('kayak', 'a'), transportRental: rented }, createdAt: '', updatedAt: '' };
    const command = vi.fn<(input: TransportRentalCommand) => Promise<void>>(async () => undefined);
    await act(async () => root.render(<TransportRentalPanel session={session} userId="a" busy={false} message={null} onCommand={command} onClose={() => undefined}/>));
    expect(host.textContent).toContain('Safety introduction');
    expect(host.textContent).not.toContain('Launch kayak');
    const acknowledge = [...host.querySelectorAll('button')].find(button => button.textContent === 'Complete safety introduction')!;
    expect(acknowledge.disabled).toBe(true);
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await act(async () => acknowledge.click());
    expect(command.mock.calls[0]?.[0]).toMatchObject({ kind: 'acknowledge_safety', expectedRevision: 1, rentalId: rented.rentals[0]!.rentalId });
  });
  it('shows persisted checked-out equipment as resumable and prevents watchers from returning it', async () => {
    const state = createTransportRentalState({ sessionId: 'session', activityId: 'cycling', participants: ['a'] });
    const rented = acceptTransportRentalCommand(state, 'a', { key: 'rent', expectedRevision: 0, kind: 'rent' });
    const departed = acceptTransportRentalCommand(rented, 'a', { key: 'depart', expectedRevision: 1, kind: 'depart', rentalId: rented.rentals[0]!.rentalId });
    const session = { id: 'session', householdId: 'household', activityId: 'cycling' as const, state: { ...createActivityState('cycling', 'a'), transportRental: departed }, createdAt: '', updatedAt: '' };
    await act(async () => root.render(<TransportRentalPanel session={session} userId="a" busy={false} message={null} onCommand={async () => undefined} onClose={() => undefined}/>));
    expect(host.textContent).toContain('Continue outing');
    expect(host.textContent).toContain('Return equipment');
    await act(async () => root.render(<TransportRentalPanel session={session} userId="watcher" busy={false} message={null} onCommand={async () => undefined} onClose={() => undefined}/>));
    const rent = [...host.querySelectorAll('button')].find(button => button.textContent === 'Rent bicycle')!;
    expect(rent.disabled).toBe(true);
  });
});
