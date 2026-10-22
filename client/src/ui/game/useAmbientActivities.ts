import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { NetworkSession } from '../../network/GameSocketClient';
import { apiFetch } from '../../network/api';
import type { ActivitySessionView } from './ActivityPanel';
import { mergeActivitySnapshot } from './activitySnapshot';

type AmbientEngine = {
  syncAmbientActivities(sessions: readonly ActivitySessionView[]): void;
  upsertAmbientActivity(session: ActivitySessionView): void;
};
const leisure = (session: ActivitySessionView) => session.activityId === 'picnic' || session.activityId === 'cafe_hangout';
function retainedSnapshots(values: readonly ActivitySessionView[]): Map<string, ActivitySessionView> {
  const ranked = [...values].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const selected = new Map<string, ActivitySessionView>();
  for (const kind of ['picnic', 'cafe_hangout'] as const) {
    const active = ranked.find(value => value.activityId === kind && value.state.status === 'active');
    if (active) selected.set(active.id, active);
  }
  for (const value of ranked) { if (selected.size >= 64) break; selected.set(value.id, value); }
  return selected;
}

/** Household hydration owns its requests independently of the currently open panel. */
export function useAmbientActivities(engine: AmbientEngine | null | (() => AmbientEngine | null), session: NetworkSession | undefined, authHeaders: () => Record<string, string>, ready = true) {
  const snapshots = useRef(new Map<string, ActivitySessionView>());
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const householdId = session?.householdId, userId = session?.userId;
  const cancelPending = useCallback(() => { generation.current++; pending.current?.abort(); }, []);

  useLayoutEffect(() => {
    generation.current++; pending.current?.abort(); snapshots.current.clear();
  }, [householdId, userId]);

  const refreshAmbientActivities = useCallback(async () => {
    const world = typeof engine === 'function' ? engine() : engine;
    if (!ready || !world || !householdId || !userId) return;
    pending.current?.abort();
    const request = new AbortController(), requested = ++generation.current;
    pending.current = request;
    try {
      const response = await apiFetch(`/api/households/${householdId}/activities`, { headers: authHeaders(), signal: request.signal });
      if (!response.ok) throw new Error(`Activity list failed (${response.status})`);
      const incoming = await response.json() as ActivitySessionView[];
      if (request.signal.aborted || generation.current !== requested) return;
      const accepted = incoming.filter(value => value.householdId === householdId && leisure(value))
        .map(value => mergeActivitySnapshot(snapshots.current.get(value.id) ?? null, value));
      snapshots.current = retainedSnapshots(accepted);
      world.syncAmbientActivities?.(accepted);
    } catch {
      // A transient failure must not erase an already rendered arrangement.
      // Reconnect, activity invalidation or the next world entry retries hydration.
    } finally { if (pending.current === request) pending.current = null; }
  }, [engine, ready, householdId, userId, authHeaders]);

  const acceptAmbientActivity = useCallback((incoming: ActivitySessionView) => {
    if (incoming.householdId !== householdId || !leisure(incoming)) return;
    generation.current++; pending.current?.abort();
    const accepted = mergeActivitySnapshot(snapshots.current.get(incoming.id) ?? null, incoming);
    snapshots.current.set(accepted.id, accepted);
    snapshots.current = retainedSnapshots([...snapshots.current.values()]);
    const world = typeof engine === 'function' ? engine() : engine;
    world?.upsertAmbientActivity?.(accepted);
  }, [engine, householdId]);

  useEffect(() => {
    const world = typeof engine === 'function' ? engine() : engine;
    if (ready) world?.syncAmbientActivities?.([...snapshots.current.values()]);
    void refreshAmbientActivities();
    return cancelPending;
  }, [engine, ready, refreshAmbientActivities, cancelPending]);

  return { refreshAmbientActivities, acceptAmbientActivity };
}
