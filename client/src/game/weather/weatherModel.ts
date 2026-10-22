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

/** How a weather state reads in the sky and light, independent of rain wetness. */
export type WeatherAtmosphere = { cloudCover: number; haze: number; sunScale: number; warmth: number; wind: number };

const ATMOSPHERE: Record<WeatherState, WeatherAtmosphere> = {
  clear: { cloudCover: 0.55, haze: 0, sunScale: 1, warmth: 0, wind: 0.3 },
  partly_cloudy: { cloudCover: 0.7, haze: 0.05, sunScale: 0.88, warmth: 0, wind: 0.4 },
  overcast: { cloudCover: 1, haze: 0.4, sunScale: 0.3, warmth: -0.12, wind: 0.5 },
  light_rain: { cloudCover: 1, haze: 0.35, sunScale: 0.38, warmth: -0.15, wind: 0.6 },
  monsoon_rain: { cloudCover: 1, haze: 0.6, sunScale: 0.2, warmth: -0.25, wind: 1 },
  thunderstorm: { cloudCover: 1, haze: 0.7, sunScale: 0.12, warmth: -0.3, wind: 1 },
  misty_morning: { cloudCover: 0.45, haze: 0.9, sunScale: 0.7, warmth: 0.05, wind: 0.15 },
  hot_bright_afternoon: { cloudCover: 0.2, haze: 0.15, sunScale: 1.15, warmth: 0.18, wind: 0.2 },
  windy_evening: { cloudCover: 0.75, haze: 0.08, sunScale: 0.85, warmth: 0.05, wind: 1 },
};

export function weatherAtmosphere(weather: WeatherState): WeatherAtmosphere {
  return { ...(ATMOSPHERE[weather] ?? ATMOSPHERE.clear) };
}
