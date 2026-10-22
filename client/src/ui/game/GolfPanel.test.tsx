import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { acceptGolfShot, createGolfRound, type GolfShotIntent } from '@together/shared';
import { GolfPanel } from './GolfPanel';
import type { ActivitySessionView } from './ActivityPanel';

describe('golf controls', () => {
  it('reports selected aim and power and keeps the accepted trace running through equal-revision polls', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const request = vi.fn(() => 42), cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', request); vi.stubGlobal('cancelAnimationFrame', cancel);
    const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
    const round = createGolfRound(['solo']);
    const session = { id: 'golf', householdId: 'home', activityId: 'mini_golf', state: { golf: round } } as ActivitySessionView;
    const onAim = vi.fn(), onShot = vi.fn(async (_shot: GolfShotIntent) => {}), onClose = vi.fn();
    const render = (value: ActivitySessionView) => root.render(<GolfPanel session={value} userId="solo" busy={false} message={null} onShot={onShot} onClose={onClose} onAim={onAim} />);
    try {
      await act(async () => render(session));
      const aim = host.querySelector('[aria-label="Aim"]') as HTMLInputElement;
      await act(async () => { aim.value = '90'; Simulate.change(aim); });
      expect(onAim).toHaveBeenLastCalledWith(Math.PI / 2, 0.5);
      const power = host.querySelector('[aria-label="Power"]') as HTMLInputElement;
      await act(async () => { power.value = '70'; Simulate.change(power); });
      expect(onAim).toHaveBeenLastCalledWith(Math.PI / 2, 0.7);
      const next = { ...session, state: { ...session.state, golf: acceptGolfShot(round, 'solo', { key: 'miss', expectedRevision: 0, angle: 0, power: 0.1 }) } };
      await act(async () => render(next)); expect(request).toHaveBeenCalledOnce();
      await act(async () => render(structuredClone(next)));
      expect(cancel).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledOnce();
      expect(host.textContent).toContain('Ball rolling');
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
  it('submits one authoritative aim command on double click and allows leaving during save', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
    const session = { id: 'golf', householdId: 'home', activityId: 'mini_golf', state: { golf: createGolfRound(['solo']) } } as ActivitySessionView;
    let finish!: () => void; const onShot = vi.fn((_shot: GolfShotIntent) => new Promise<void>(resolve => { finish = resolve; })), onClose = vi.fn();
    try {
      await act(async () => root.render(<GolfPanel session={session} userId="solo" busy={false} message={null} onShot={onShot} onClose={onClose} />));
      expect(host.querySelectorAll('input[type="range"]')).toHaveLength(2);
      const putt = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Putt')!;
      await act(async () => { putt.click(); putt.click(); });
      expect(onShot).toHaveBeenCalledOnce();
      expect(onShot.mock.calls[0]![0]).toMatchObject({ expectedRevision: 0, angle: 0, power: 0.5 });
      await act(async () => host.querySelector('button')!.click()); expect(onClose).toHaveBeenCalledOnce();
      await act(async () => finish());
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
});
