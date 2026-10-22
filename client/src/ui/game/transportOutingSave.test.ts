import { describe, expect, it, vi } from 'vitest';
import { createActivityState } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';
import { TransportOutingSave } from './transportOutingSave';

const initial = (): ActivitySessionView => ({ id: 'outing-1', householdId: 'household-1', activityId: 'cycling', state: { ...createActivityState('cycling', 'user-1'), completedStepIds: ['mount_cycle'] }, createdAt: '', updatedAt: '' });
function advance(session: ActivitySessionView, step: string): ActivitySessionView {
  const ids = [...session.state.completedStepIds, step];
  return { ...session, state: { ...session.state, completedStepIds: ids, status: ids.length === 3 ? 'complete' : 'active' } };
}
describe('saving a physically finished outing', () => {
  it('writes travel before equipment return and never completes a stationary outing', async () => {
    let server = initial(); const calls: string[] = [];
    const save = vi.fn(async (step: string) => { calls.push(step); return server = advance(server, step); });
    const stationary = new TransportOutingSave(initial(), false);
    await stationary.persist(save, async () => server);
    expect(save).not.toHaveBeenCalled();
    const finished = new TransportOutingSave(initial(), true);
    expect((await finished.persist(save, async () => server)).state.status).toBe('complete');
    expect(calls).toEqual(['ride_route', 'park_cycle']);
  });
  it.each(['ride_route', 'park_cycle'])('recovers a lost %s reply without another physical action or duplicate save', async lost => {
    let server = initial(); const calls: string[] = [];
    const finished = new TransportOutingSave(initial(), true);
    const save = async (step: string) => { calls.push(step); server = advance(server, step); if (step === lost) throw new Error('Reply lost'); return server; };
    expect((await finished.persist(save, async () => server)).state.status).toBe('complete');
    expect(calls).toEqual(['ride_route', 'park_cycle']);
  });
  it('retries only the failed final save and shares concurrent finish requests', async () => {
    let server = initial(); let fail = true; let returns = 0;
    const finished = new TransportOutingSave(initial(), true);
    const save = async (step: string) => { if (step === 'park_cycle') { returns++; if (fail) throw new Error('Offline'); } return server = advance(server, step); };
    await expect(finished.persist(save, async () => server)).rejects.toThrow('Offline');
    fail = false;
    await Promise.all([finished.persist(save, async () => server), finished.persist(save, async () => server)]);
    expect(server.state.completedStepIds).toEqual(['mount_cycle', 'ride_route', 'park_cycle']);
    expect(returns).toBe(2);
  });
});
