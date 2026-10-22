import type { WeatherState } from '../contracts.js';

const WETNESS: Record<WeatherState, number> = {
  clear: 0,
  partly_cloudy: 0,
  overcast: 0.05,
  light_rain: 0.48,
  monsoon_rain: 0.9,
  thunderstorm: 1,
  misty_morning: 0.14,
  hot_bright_afternoon: 0,
  windy_evening: 0.03,
};

export function weatherWetness(weather: WeatherState): number {
  return WETNESS[weather];
}

export function activityAllowedInWeather(activityId: string, weather: WeatherState): boolean {
  if (activityId === 'kayak') return weather !== 'monsoon_rain' && weather !== 'thunderstorm';
  return true;
}

const WEATHER_BLOCK_MINUTES = 180;
type WeatherWeights = ReadonlyArray<readonly [WeatherState, number]>;

/** Calm-leaning weights per time of day; dangerous weather is rare and never comes from nowhere. */
function weightsFor(minuteOfDay: number, previous: WeatherState | null): WeatherWeights {
  const hour = minuteOfDay / 60;
  const wet = previous === 'light_rain' || previous === 'monsoon_rain' || previous === 'thunderstorm';
  if (wet) return [['light_rain', 4], ['overcast', 4], ['monsoon_rain', 2], ['thunderstorm', previous === 'thunderstorm' ? 0 : 1], ['partly_cloudy', 3]];
  if (hour >= 5 && hour < 8) return [['misty_morning', 5], ['clear', 4], ['partly_cloudy', 3], ['overcast', 1]];
  if (hour >= 11 && hour < 16) return [['hot_bright_afternoon', 4], ['clear', 5], ['partly_cloudy', 4], ['overcast', 1], ['light_rain', 1]];
  if (hour >= 17 && hour < 21) return [['windy_evening', 3], ['clear', 5], ['partly_cloudy', 3], ['light_rain', 1]];
  return [['clear', 6], ['partly_cloudy', 4], ['overcast', 2], ['light_rain', 1]];
}

function blockRandom(day: number, block: number): number {
  let value = (Math.imul(day + 1, 2654435761) ^ Math.imul(block + 7, 2246822519)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** Deterministic natural weather for a city day and minute; each block follows on from the one before. */
export function naturalWeatherAt(day: number, gameMinute: number): WeatherState {
  const safeDay = Number.isFinite(day) ? Math.max(0, Math.floor(day)) : 0;
  const minute = Number.isFinite(gameMinute) ? ((gameMinute % 1440) + 1440) % 1440 : 0;
  const targetBlock = Math.floor(minute / WEATHER_BLOCK_MINUTES);
  // Walk from the previous evening so a day boundary never resets an ongoing rain.
  let previous: WeatherState | null = null;
  for (let step = -1; step <= targetBlock; step += 1) {
    const blockDay = step < 0 ? safeDay - 1 : safeDay;
    const block = step < 0 ? 1440 / WEATHER_BLOCK_MINUTES - 1 : step;
    const weights = weightsFor(block * WEATHER_BLOCK_MINUTES + 1, previous);
    const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
    let pick = blockRandom(blockDay, block) * total;
    let chosen = weights[0]![0];
    for (const [state, weight] of weights) { if ((pick -= weight) < 0) { chosen = state; break; } }
    previous = chosen;
  }
  return previous ?? 'clear';
}

export function weatherBlockAt(day: number, gameMinute: number): string {
  return `${Math.floor(day)}:${Math.floor((((gameMinute % 1440) + 1440) % 1440) / WEATHER_BLOCK_MINUTES)}`;
}
