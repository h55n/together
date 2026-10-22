import type * as THREE from 'three';
import type { ActivityId, ActivityState, CafeState, PicnicState } from '@together/shared';
import { CafePresentation } from './CafePresentation';
import { PicnicPresentation } from './PicnicPresentation';

/** The small portion of a persisted activity session needed by ambient scene rendering. */
export type AmbientLeisureSession = {
  id: string;
  activityId: ActivityId;
  state: ActivityState;
  createdAt?: string;
  updatedAt?: string;
};

type LeisureKind = 'picnic' | 'cafe_hangout';
type Revision = { outer: number; nested: number };
type Entry = { session: AmbientLeisureSession; revision: Revision; terminal: boolean; order: number };
type View = PicnicPresentation | CafePresentation;
type PresentedView = { sessionId: string; view: View; nestedRevision: number };

const MAX_TRACKED_SESSIONS_PER_KIND = 32;

/** Keeps the newest persisted picnic and cafe arrangements visible in the world. */
export class AmbientLeisurePresentation {
  private readonly entries = new Map<string, Entry>();
  private readonly views = new Map<LeisureKind, PresentedView>();
  private order = 0;
  private disposed = false;

  constructor(private readonly scene: THREE.Scene) {}

  /** Reconciles against a complete session snapshot; absent sessions are removed. */
  sync(sessions: readonly AmbientLeisureSession[]): void {
    if (this.disposed) return;
    const present = new Set(sessions.map(session => session.id));
    for (const session of sessions) this.accept(session);
    for (const [id, entry] of this.entries) if (!present.has(id) && !entry.terminal) this.entries.delete(id);
    this.enforceBound();
    this.reconcile();
  }

  /** Applies a single accepted update without removing other sessions. */
  upsert(session: AmbientLeisureSession): void {
    if (this.disposed) return;
    this.accept(session);
    this.enforceBound();
    this.reconcile();
  }

  private accept(session: AmbientLeisureSession): void {
    if (!session.id || (session.activityId !== 'picnic' && session.activityId !== 'cafe_hangout')) return;
    const kind = session.activityId;
    if (session.state.activityId !== kind) return;
    const nestedRevision = kind === 'picnic' ? session.state.picnic?.revision : session.state.cafe?.revision;
    if (nestedRevision === undefined) return;
    const revision = { outer: session.state.revision ?? 0, nested: nestedRevision };
    const previous = this.entries.get(session.id);
    if (previous) {
      if (previous.session.activityId !== kind || previous.terminal) return;
      if (revision.outer < previous.revision.outer || revision.nested < previous.revision.nested) return;
      const becameTerminal = session.state.status === 'complete' || (kind === 'picnic'
        ? session.state.picnic?.phase === 'finished'
        : session.state.cafe?.phase === 'finished');
      if (revision.outer === previous.revision.outer && revision.nested === previous.revision.nested && !becameTerminal) return;
    }
    const terminal = session.state.status === 'complete' || (kind === 'picnic'
      ? session.state.picnic?.phase === 'finished'
      : session.state.cafe?.phase === 'finished');
    this.entries.set(session.id, {
      session: { ...session, state: { ...session.state } }, revision, terminal,
      order: ++this.order,
    });
  }

  /** Removes an ended or deleted session and releases its presentation if selected. */
  remove(id: string): void {
    if (this.disposed) return;
    this.entries.delete(id);
    this.reconcile();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { view } of this.views.values()) view.dispose();
    this.views.clear();
    this.entries.clear();
  }

  private enforceBound(): void {
    for (const kind of ['picnic', 'cafe_hangout'] as const) {
      const candidates = [...this.entries].filter(([, entry]) => entry.session.activityId === kind);
      if (candidates.length <= MAX_TRACKED_SESSIONS_PER_KIND) continue;
      const active = candidates.filter(([, entry]) => !entry.terminal && entry.session.state.status === 'active')
        .sort((a, b) => this.compareNewest(a[1].session, b[1].session));
      const selectedActiveId = active[0]?.[0];
      const ranked = candidates.sort((a, b) => {
        if (a[0] === selectedActiveId) return -1;
        if (b[0] === selectedActiveId) return 1;
        return b[1].order - a[1].order;
      });
      const retained = new Set(ranked.slice(0, MAX_TRACKED_SESSIONS_PER_KIND).map(([id]) => id));
      for (const [id] of candidates) if (!retained.has(id)) this.entries.delete(id);
    }
  }

  private reconcile(): void {
    for (const kind of ['picnic', 'cafe_hangout'] as const) {
      const selected = [...this.entries.values()]
        .filter(entry => entry.session.activityId === kind && !entry.terminal && entry.session.state.status === 'active')
        .sort((a, b) => this.compareNewest(a.session, b.session))[0];
      const current = this.views.get(kind);
      if (!selected) {
        if (current) { current.view.dispose(); this.views.delete(kind); }
        continue;
      }
      const session = selected.session;
      if (current?.sessionId === session.id) {
        if (selected.revision.nested > current.nestedRevision) {
          this.updateView(current.view, session);
          current.nestedRevision = selected.revision.nested;
        }
      } else {
        current?.view.dispose();
        const view: View = kind === 'picnic' ? new PicnicPresentation(this.scene) : new CafePresentation(this.scene);
        this.views.set(kind, { sessionId: session.id, view, nestedRevision: selected.revision.nested });
        this.updateView(view, session);
      }
    }
  }

  private compareNewest(a: AmbientLeisureSession, b: AmbientLeisureSession): number {
    const aTime = a.createdAt ?? '';
    const bTime = b.createdAt ?? '';
    return bTime.localeCompare(aTime) || b.id.localeCompare(a.id);
  }

  private updateView(view: View, session: AmbientLeisureSession): void {
    if (session.activityId === 'picnic' && view instanceof PicnicPresentation) view.update(session.state.picnic as PicnicState);
    else if (session.activityId === 'cafe_hangout' && view instanceof CafePresentation) view.update(session.state.cafe as CafeState);
  }
}
