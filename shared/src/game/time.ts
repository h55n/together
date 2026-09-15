export const GAME_MINUTES_PER_REAL_MINUTE = 12;
export const GAME_MINUTES_PER_DAY = 24 * 60;

export function realSecondsToGameMinutes(realSeconds: number): number {
  return (realSeconds / 60) * GAME_MINUTES_PER_REAL_MINUTE;
}

export function normalizeGameMinute(gameMinute: number): number {
  const wrapped = gameMinute % GAME_MINUTES_PER_DAY;
  return wrapped < 0 ? wrapped + GAME_MINUTES_PER_DAY : wrapped;
}

export function gameMinuteToClock(gameMinute: number): { hour: number; minute: number } {
  const normalized = normalizeGameMinute(gameMinute);
  return { hour: Math.floor(normalized / 60), minute: Math.floor(normalized % 60) };
}
