import { describe, expect, it } from 'vitest';
import { advanceFirstSession, nextFirstSessionAction, readFirstSession } from './FirstSession';

describe('first session guide', () => {
  it('teaches look, real walking, and successful interaction without inventing completion', () => {
    expect(nextFirstSessionAction([])).toBe('look');
    const looked = advanceFirstSession([], 'look');
    expect(nextFirstSessionAction(looked)).toBe('walk');
    expect(advanceFirstSession(looked, 'look')).toEqual(looked);
    expect(nextFirstSessionAction(advanceFirstSession(looked, 'walk'))).toBe('interact');
    expect(nextFirstSessionAction(['look', 'walk', 'interact'])).toBe(null);
  });
  it('retains genuinely observed out-of-order actions and safely resumes stored progress', () => {
    expect(nextFirstSessionAction(advanceFirstSession([], 'interact'))).toBe('look');
    expect(readFirstSession('["walk","bad","walk"]')).toEqual(['walk']);
    expect(readFirstSession('{broken')).toEqual([]);
    expect(readFirstSession('null')).toEqual([]);
  });
});
