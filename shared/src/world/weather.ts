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
