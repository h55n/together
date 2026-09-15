export type LightingPeriod =
  | 'late_night'
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'golden_hour'
  | 'blue_hour'
  | 'evening';

export type LightingProfile = {
  period: LightingPeriod;
  sunIntensity: number;
  skyIntensity: number;
  warmth: number;
  sunElevationDegrees: number;
  fogDensity: number;
};

const DAY_MINUTES = 24 * 60;

function wrapMinutes(minutes: number): number {
  return ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function lightingProfileAt(minutes: number): LightingProfile {
  const t = wrapMinutes(minutes);
  if (t < 5 * 60) return { period: 'late_night', sunIntensity: 0.03, skyIntensity: 0.16, warmth: 0.35, sunElevationDegrees: -25, fogDensity: 0.0075 };
  if (t < 7 * 60) return { period: 'dawn', sunIntensity: 0.45, skyIntensity: 0.48, warmth: 0.88, sunElevationDegrees: 8, fogDensity: 0.0085 };
  if (t < 10 * 60) return { period: 'morning', sunIntensity: 1.65, skyIntensity: 0.82, warmth: 0.62, sunElevationDegrees: 28, fogDensity: 0.0045 };
  if (t < 15 * 60) return { period: 'midday', sunIntensity: 2.45, skyIntensity: 1.0, warmth: 0.42, sunElevationDegrees: 62, fogDensity: 0.0032 };
  if (t < 17 * 60) return { period: 'afternoon', sunIntensity: 2.0, skyIntensity: 0.92, warmth: 0.56, sunElevationDegrees: 38, fogDensity: 0.0038 };
  if (t < 18.75 * 60) return { period: 'golden_hour', sunIntensity: 1.15, skyIntensity: 0.7, warmth: 0.96, sunElevationDegrees: 13, fogDensity: 0.0052 };
  if (t < 19.5 * 60) return { period: 'blue_hour', sunIntensity: 0.18, skyIntensity: 0.42, warmth: 0.32, sunElevationDegrees: -3, fogDensity: 0.006 };
  if (t < 22.5 * 60) return { period: 'evening', sunIntensity: 0.05, skyIntensity: 0.25, warmth: 0.48, sunElevationDegrees: -15, fogDensity: 0.0068 };
  return { period: 'late_night', sunIntensity: 0.03, skyIntensity: 0.16, warmth: 0.35, sunElevationDegrees: -25, fogDensity: 0.0075 };
}
