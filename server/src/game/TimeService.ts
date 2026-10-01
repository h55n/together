import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GAME_MINUTES_PER_REAL_MINUTE, GAME_MINUTES_PER_DAY, normalizeGameMinute } from '@together/shared';

export type CityTimeSnapshot = { gameMinute: number; day: number; emittedAt: number };
export type PersistedCityTime = { gameMinute: number; day: number; savedAt: number };

type CityTimeStore = {
  load(): Promise<PersistedCityTime | null>;
  save(state: PersistedCityTime): Promise<void>;
};

export function advancePersistedCityTime(state: PersistedCityTime, nowMs: number): { gameMinute: number; day: number } {
  const elapsedRealMinutes = Math.max(0, nowMs - state.savedAt) / 60_000;
  const totalGameMinutes = state.gameMinute + elapsedRealMinutes * GAME_MINUTES_PER_REAL_MINUTE;
  return {
    gameMinute: normalizeGameMinute(totalGameMinutes),
    day: state.day + Math.max(0, Math.floor(totalGameMinutes / GAME_MINUTES_PER_DAY)),
  };
}

export class TimeService {
  private readonly startedAtMs: number;
  private readonly initialGameMinute: number;
  private readonly initialDay: number;

  constructor(
    options: { nowMs?: number; initialGameMinute?: number; initialDay?: number } = {},
    private readonly store?: CityTimeStore,
  ) {
    this.startedAtMs = options.nowMs ?? Date.now();
    this.initialGameMinute = options.initialGameMinute ?? 8 * 60;
    this.initialDay = options.initialDay ?? 1;
  }

  static async create(nowMs = Date.now()): Promise<TimeService> {
    const store = createCityTimeStore();
    try {
      const persisted = await store.load();
      if (persisted) {
        const restored = advancePersistedCityTime(persisted, nowMs);
        return new TimeService({ nowMs, initialGameMinute: restored.gameMinute, initialDay: restored.day }, store);
      }
    } catch (error) {
      console.warn('[Together time] Could not restore persisted city clock', error);
    }
    return new TimeService({ nowMs }, store);
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

  async persist(nowMs = Date.now()): Promise<void> {
    if (!this.store) return;
    const snapshot = this.snapshot(nowMs);
    await this.store.save({ gameMinute: snapshot.gameMinute, day: snapshot.day, savedAt: nowMs });
  }
}

function createCityTimeStore(): CityTimeStore {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRole) {
    return new SupabaseCityTimeStore(createClient(url, serviceRole, { auth: { persistSession: false } }));
  }
  return new FileCityTimeStore(path.resolve(process.cwd(), '.runtime', 'city-time.json'));
}

class SupabaseCityTimeStore implements CityTimeStore {
  constructor(private readonly client: SupabaseClient) {}

  async load(): Promise<PersistedCityTime | null> {
    const { data, error } = await this.client.from('server_runtime_state').select('value').eq('key', 'city_time').maybeSingle();
    if (error) throw error;
    const value = data?.value as Record<string, unknown> | undefined;
    if (!value || typeof value.gameMinute !== 'number' || typeof value.day !== 'number' || typeof value.savedAt !== 'number') return null;
    return { gameMinute: value.gameMinute, day: value.day, savedAt: value.savedAt };
  }

  async save(state: PersistedCityTime): Promise<void> {
    const { error } = await this.client.from('server_runtime_state').upsert({ key: 'city_time', value: state, updated_at: new Date(state.savedAt).toISOString() });
    if (error) throw error;
  }
}

class FileCityTimeStore implements CityTimeStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<PersistedCityTime | null> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedCityTime>;
      if (typeof parsed.gameMinute !== 'number' || typeof parsed.day !== 'number' || typeof parsed.savedAt !== 'number') return null;
      return { gameMinute: parsed.gameMinute, day: parsed.day, savedAt: parsed.savedAt };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(state: PersistedCityTime): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(state)}\n`, 'utf8');
  }
}
