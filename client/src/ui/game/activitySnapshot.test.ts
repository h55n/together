import { describe, expect, it } from 'vitest';
import { createActivityState, createPicnicState, createCafeState } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';
import { mergeActivitySnapshot } from './activitySnapshot';

describe('activity snapshot revisions', () => {
  it('retains leisure arrangement revisions when a delayed nested state arrives', () => {
    for (const activityId of ['picnic', 'cafe_hangout'] as const) {
      const base: ActivitySessionView = { id: activityId, householdId: 'home', activityId, state: {
        ...createActivityState(activityId, 'alice'), revision: 4,
        ...(activityId === 'picnic' ? { picnic: { ...createPicnicState(['alice']), revision: 3 } } : { cafe: { ...createCafeState(['alice']), revision: 3 } }),
      }, createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z' };
      const incoming = { ...base, state: { ...base.state,
        ...(base.state.picnic ? { picnic: { ...base.state.picnic, revision: 2 } } : {}),
        ...(base.state.cafe ? { cafe: { ...base.state.cafe, revision: 2 } } : {}),
      } };
      expect(mergeActivitySnapshot(base, incoming)).toBe(base);
    }
  });
  it('does not rewind sports on a delayed reply with identical timestamps', () => {
    const base: ActivitySessionView = { id: 'golf', householdId: 'home', activityId: 'mini_golf', state: { ...createActivityState('mini_golf', 'alice'), revision: 2 }, createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z' };
    expect(mergeActivitySnapshot(base, { ...base, state: { ...base.state, revision: 1 } }).state.revision).toBe(2);
  });
  it('retains a joined peer when an older reply has the same steps and timestamp', () => {
    const older: ActivitySessionView = { id: 'shared-picnic', householdId: 'household-1', activityId: 'picnic', state: createActivityState('picnic', 'user-1'), createdAt: '2026-10-07T10:00:00.000Z', updatedAt: '2026-10-07T10:00:00.000Z' };
    const joined = { ...older, state: { ...older.state, participants: ['user-1', 'user-2'] } };
    expect(mergeActivitySnapshot(joined, older).state.participants).toEqual(['user-1', 'user-2']);
    expect(mergeActivitySnapshot(older, joined).state.participants).toEqual(['user-1', 'user-2']);
  });
});
