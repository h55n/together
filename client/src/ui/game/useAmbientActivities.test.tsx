import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { createActivityState, createPicnicState } from '@together/shared';
import { useAmbientActivities } from './useAmbientActivities';
import type { ActivitySessionView } from './ActivityPanel';

const saved: ActivitySessionView = { id: 'picnic', householdId: 'home', activityId: 'picnic', state: { ...createActivityState('picnic', 'a'), revision: 1, picnic: createPicnicState(['a']) }, createdAt: '', updatedAt: '' };
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); });

async function mount(fetcher: typeof fetch) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('fetch', fetcher);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host), engine = { syncAmbientActivities: vi.fn(), upsertAmbientActivity: vi.fn() };
  let controls!: ReturnType<typeof useAmbientActivities>;
  let householdId = 'home';
  const headers = () => ({ 'x-dev-user-id': 'a' });
  function Harness() { controls = useAmbientActivities(engine, { userId: 'a', householdId }, headers); return null; }
  await act(async () => root.render(<Harness/>));
  cleanup = async () => { await act(async () => root.unmount()); host.remove(); };
  return { engine, get controls() { return controls; }, async changeHousehold(id: string) { householdId = id; await act(async () => root.render(<Harness/>)); } };
}

it('hydrates saved arrangements without opening an activity panel', async () => {
  const runtime = await mount(vi.fn(async () => new Response(JSON.stringify([saved, { ...saved, id: 'foreign', householdId: 'other' }]))));
  expect(runtime.engine.syncAmbientActivities).toHaveBeenLastCalledWith([saved]);
});

it('ignores a stale list reply after an accepted command updates the world', async () => {
  let release!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { release = resolve; });
  const runtime = await mount(vi.fn(() => pending));
  const complete = { ...saved, state: { ...saved.state, revision: 2, status: 'complete' as const } };
  await act(async () => runtime.controls.acceptAmbientActivity(complete));
  await act(async () => release(new Response(JSON.stringify([saved]))));
  expect(runtime.engine.upsertAmbientActivity).toHaveBeenLastCalledWith(complete);
  expect(runtime.engine.syncAmbientActivities).not.toHaveBeenCalledWith([saved]);
});

it('preserves world props during a refresh failure and allows retry', async () => {
  let failed = false;
  const runtime = await mount(vi.fn(async () => { if (failed) throw new Error('Offline'); return new Response(JSON.stringify([saved])); }));
  runtime.engine.syncAmbientActivities.mockClear(); failed = true;
  await act(async () => runtime.controls.refreshAmbientActivities());
  expect(runtime.engine.syncAmbientActivities).not.toHaveBeenCalled();
  failed = false;
  await act(async () => runtime.controls.refreshAmbientActivities());
  expect(runtime.engine.syncAmbientActivities).toHaveBeenLastCalledWith([saved]);
});

it('clears the previous household and rejects its delayed hydration reply', async () => {
  let release!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { release = resolve; });
  const newer = { ...saved, id: 'new-picnic', householdId: 'new-home' };
  const runtime = await mount(vi.fn(async input => String(input).includes('/home/') ? pending : new Response(JSON.stringify([newer]))));
  await runtime.changeHousehold('new-home');
  await act(async () => release(new Response(JSON.stringify([saved]))));
  expect(runtime.engine.syncAmbientActivities).toHaveBeenLastCalledWith([newer]);
  expect(runtime.engine.syncAmbientActivities).not.toHaveBeenCalledWith([saved]);
});
