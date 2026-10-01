export const FIRST_SESSION_ACTIONS = ['look', 'walk', 'interact'] as const;
export type FirstSessionAction = typeof FIRST_SESSION_ACTIONS[number];

export function advanceFirstSession(completed: readonly FirstSessionAction[], action: FirstSessionAction): FirstSessionAction[] {
  return completed.includes(action) ? [...completed] : [...completed, action];
}
export function nextFirstSessionAction(completed: readonly FirstSessionAction[]): FirstSessionAction | null {
  return FIRST_SESSION_ACTIONS.find(action => !completed.includes(action)) ?? null;
}
export function readFirstSession(raw: string | null): FirstSessionAction[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return FIRST_SESSION_ACTIONS.filter(action => value.includes(action));
  } catch { return []; }
}
