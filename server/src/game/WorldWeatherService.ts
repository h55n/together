import { naturalWeatherAt, weatherBlockAt, weatherStateSchema, type WeatherState } from '@together/shared';

/** Canonical server conditions; no client request can change the weather. */
export class WorldWeatherService {
  private state: WeatherState = 'clear';
  private overrideBlock: string | null = null;

  /** A fixed state (for deterministic acceptance runs) disables the natural forecast. */
  constructor(private readonly fixed: WeatherState | null = null) { if (fixed) this.state = fixed; }

  weather(): WeatherState { return this.state; }
  snapshot(): { state: WeatherState } { return { state: this.state }; }

  /** Development/operator override; it holds until the next natural weather block begins. */
  setState(state: unknown, time?: { day: number; gameMinute: number }): void {
    this.state = weatherStateSchema.parse(state);
    this.overrideBlock = time ? weatherBlockAt(time.day, time.gameMinute) : null;
  }

  /** Follows the deterministic city forecast unless an override still covers the current block. */
  advance(time: { day: number; gameMinute: number }): WeatherState {
    if (this.fixed) return this.state;
    const block = weatherBlockAt(time.day, time.gameMinute);
    if (this.overrideBlock !== null && this.overrideBlock === block) return this.state;
    this.overrideBlock = null;
    this.state = naturalWeatherAt(time.day, time.gameMinute);
    return this.state;
  }
}
