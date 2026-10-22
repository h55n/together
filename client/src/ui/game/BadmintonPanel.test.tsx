import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { commandBadminton, createBadmintonMatch } from '@together/shared';
import { BadmintonPanel } from './BadmintonPanel';
import type { ActivitySessionView } from './ActivityPanel';

it('offers real serve commands and keeps finish disabled until a rally ends', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); const onCommand = vi.fn().mockResolvedValue(undefined);
  const session: ActivitySessionView = { id: 's', householdId: 'h', activityId: 'badminton', createdAt: '', updatedAt: '', state: { activityId: 'badminton', participants: ['a'], completedStepIds: [], status: 'active', badminton: createBadmintonMatch('a', 0) } };
  try {
    await act(async () => root.render(<BadmintonPanel session={session} userId="a" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    expect(host.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(host.textContent).toContain('Neighbour');
    const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent === label)!;
    expect(button('Finish game').disabled).toBe(true);
    await act(async () => button('Serve').click());
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ kind: 'serve', expectedRevision: 0, aimZ: 0, loft: 3.6 }));
    expect(host.querySelector('[aria-label="Shot height"]')).not.toBeNull();
    await act(async () => button('Leave court').click());
    expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'cancel' }));
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});

it('keeps Return clickable before contact and offers deliberate next rally for NPC server', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const served = commandBadminton(createBadmintonMatch('a', 0, 'b'), 'a', { id: 's', expectedRevision: 0, kind: 'serve' }, 0);
  const session: ActivitySessionView = { id: 's', householdId: 'h', activityId: 'badminton', createdAt: '', updatedAt: '', serverNow: 100, state: { activityId: 'badminton', participants: ['a', 'b'], completedStepIds: [], status: 'active', badminton: served } };
  const onCommand = vi.fn().mockResolvedValue(undefined);
  try {
    await act(async () => root.render(<BadmintonPanel session={session} userId="b" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent === label)!;
    expect(button('Return').disabled).toBe(false);
    const returning = button('Return');
    await act(async () => button('Return').click());
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hit' }));
    const next = { ...session, state: { ...session.state, badminton: { ...createBadmintonMatch('a', 0), server: 1 as const, completedRallies: 1 } } };
    await act(async () => root.render(<BadmintonPanel session={next} userId="a" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    // A pointer gesture begun on Return must never turn into the next serve
    // when a polled landing changes the controls before pointer-up.
    expect(returning.textContent).toBe('Return');
    expect(returning.disabled).toBe(true);
    onCommand.mockClear();
    await act(async () => returning.click());
    expect(onCommand).not.toHaveBeenCalled();
    expect(button('Next rally').disabled).toBe(false);
    expect(button('Finish game').disabled).toBe(false);
    await act(async () => button('Next rally').click());
    expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'serve' }));
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});

it('uses each server poll clock even when match update timestamp is unchanged', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let animation: FrameRequestCallback = () => {};
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { animation = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockReturnValue(100);
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const match = commandBadminton(createBadmintonMatch('a', 0, 'b'), 'a', { id: 's', expectedRevision: 0, kind: 'serve' }, 0);
  const session: ActivitySessionView = { id: 's', householdId: 'h', activityId: 'badminton', createdAt: '', updatedAt: '', serverNow: 1400, state: { activityId: 'badminton', participants: ['a', 'b'], completedStepIds: [], status: 'active', badminton: match } };
  const render = (serverNow: number) => root.render(<BadmintonPanel session={{ ...session, serverNow }} userId="b" busy={false} message={null} onCommand={vi.fn()} onClose={() => {}} />);
  try {
    await act(async () => { render(1400); }); await act(async () => animation(100));
    const shuttle = () => Number(host.querySelector('svg circle:last-child')!.getAttribute('cx'));
    const before = shuttle();
    await act(async () => { render(1500); });
    // Polling advances guidance even if a background tab pauses animation frames.
    expect(shuttle()).toBeGreaterThan(before);
    expect([...host.querySelectorAll('button')].find(button => button.textContent === 'Return')!.disabled).toBe(false);
  } finally { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); }
});

it('blocks synchronous double clicks and displays a rejected command', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); const onCommand = vi.fn().mockRejectedValue(new Error('Shuttle has moved'));
  const session: ActivitySessionView = { id: 's', householdId: 'h', activityId: 'badminton', createdAt: '', updatedAt: '', state: { activityId: 'badminton', participants: ['a'], completedStepIds: [], status: 'active', badminton: createBadmintonMatch('a', 0) } };
  try {
    await act(async () => root.render(<BadmintonPanel session={session} userId="a" busy={false} message={null} onCommand={onCommand} onClose={() => {}} />));
    const serve = [...host.querySelectorAll('button')].find(button => button.textContent === 'Serve')!;
    await act(async () => { serve.click(); serve.click(); });
    expect(onCommand).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Shuttle has moved');
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
