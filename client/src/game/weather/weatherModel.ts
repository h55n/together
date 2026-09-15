export type WeatherState =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'light_rain'
  | 'monsoon_rain'
  | 'thunderstorm'
  | 'misty_morning'
  | 'hot_bright_afternoon'
  | 'windy_evening';

const WETNESS: Record<WeatherState, number> = {
  clear: 0,
  partly_cloudy: 0,
  overcast: 0.04,
  light_rain: 0.48,
  monsoon_rain: 1,
  thunderstorm: 1,
  misty_morning: 0.14,
  hot_bright_afternoon: 0,
  windy_evening: 0,
};

export function targetWetness(weather: WeatherState): number {
  return WETNESS[weather];
}

export function weatherAllowsKayak(weather: WeatherState): boolean {
  return weather !== 'monsoon_rain' && weather !== 'thunderstorm';
}

export function rainIntensity(weather: WeatherState): number {
  if (weather === 'light_rain') return 0.35;
  if (weather === 'monsoon_rain') return 0.88;
  if (weather === 'thunderstorm') return 1;
  return 0;
}
