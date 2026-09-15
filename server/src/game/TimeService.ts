import { GAME_MINUTES_PER_REAL_MINUTE, GAME_MINUTES_PER_DAY, normalizeGameMinute } from '@together/shared';

export type CityTimeSnapshot = { gameMinute: number; day: number; emittedAt: number };

export class TimeService {
  private readonly startedAtMs: number;
  private readonly initialGameMinute: number;
  private readonly initialDay: number;

  constructor(options: { nowMs?: number; initialGameMinute?: number; initialDay?: number } = {}) {
    this.startedAtMs = options.nowMs ?? Date.now();
    this.initialGameMinute = options.initialGameMinute ?? 8 * 60;
    this.initialDay = options.initialDay ?? 1;
  }

  snapshot(nowMs = Date.now()): CityTimeSnapshot {
    const elapsedRealMinutes = (nowMs - this.startedAtMs) / 60_000;
    const totalGameMinutes = this.initialGameMinute + elapsedRealMinutes * GAME_MINUTES_PER_REAL_MINUTE;
    const elapsedDays = Math.floor(totalGameMinutes / GAME_MINUTES_PER_DAY);
    return {
      gameMinute: normalizeGameMinute(totalGameMinutes),
      day: this.initialDay + Math.max(0, elapsedDays),
      emittedAt: nowMs,
    };
  }
}
