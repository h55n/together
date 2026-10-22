import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { createCafeState, createPicnicState } from '@together/shared';
import { CafePanel } from './CafePanel';
import { PicnicPanel } from './PicnicPanel';
import type { ActivitySessionView } from './ActivityPanel';

const session = (activityId: 'picnic' | 'cafe_hangout'): ActivitySessionView => ({
  id: 'outing', householdId: 'home', activityId, createdAt: '', updatedAt: '',
  state: { activityId, participants: ['a', 'b'], completedStepIds: [], status: 'active',
    ...(activityId === 'picnic' ? { picnic: createPicnicState(['a', 'b']) } : { cafe: createCafeState(['a', 'b']) }) },
});

it('exposes bounded picnic setup and serving actions', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); const onCommand = vi.fn().mockResolvedValue(undefined);
  try {
    await act(async () => root.render(<PicnicPanel session={session('picnic')} userId="a" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    expect(host.querySelector('[aria-label="Picnic on the lawn"]')).not.toBeNull();
    const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent === label)!;
    await act(async () => button('Place picnic mat').click());
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ kind: 'place_mat', x: 0, z: 0, expectedRevision: 0 }));
    expect(host.textContent).toContain('Food to bring');
    expect(button('Finish picnic').disabled).toBe(false);
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});

it('offers seat and drink choices for Café Roshan', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); const onCommand = vi.fn().mockResolvedValue(undefined);
  try {
    await act(async () => root.render(<CafePanel session={session('cafe_hangout')} userId="a" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    expect(host.querySelector('[aria-label="Coffee at Café Roshan"]')).not.toBeNull();
    const seat = [...host.querySelectorAll('button')].find(item => item.textContent === 'Choose seat 1')!;
    await act(async () => seat.click());
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ kind: 'choose_seat', seat: 1, expectedRevision: 0 }));
    expect(host.textContent).toContain('Filter coffee');
    const order = [...host.querySelectorAll('button')].find(item => item.textContent === 'Order Chai')!;
    await act(async () => order.click());
    expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'order_drink', drink: 'chai', expectedRevision: 0 }));
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
