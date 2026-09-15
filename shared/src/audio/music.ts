import type { WeatherState } from '../contracts.js';
import type { DistrictId } from '../world/city.js';

export type MusicState =
  | 'silence'
  | 'arrival'
  | 'morning_light'
  | 'cafe_morning'
  | 'home_evening'
  | 'waterfront_golden'
  | 'memory_book'
  | 'festival';

export type MusicContext = {
  districtId?: DistrictId;
  gameMinutes: number;
  weather: WeatherState;
  indoors: boolean;
  storyMoment?: 'arrival' | 'resolution' | 'festival' | 'memory_book';
};

const HEAVY_WEATHER = new Set<WeatherState>(['monsoon_rain', 'thunderstorm']);

export function selectMusicState(context: MusicContext): MusicState {
  if (context.storyMoment === 'memory_book') return 'memory_book';
  if (context.storyMoment === 'arrival') return 'arrival';
  if (context.storyMoment === 'festival') return 'festival';
  if (HEAVY_WEATHER.has(context.weather)) return 'silence';

  const minutes = normalizeMinutes(context.gameMinutes);
  if (context.indoors && context.districtId === 'mogra_court' && minutes >= 18 * 60 && minutes < 23 * 60) {
    return 'home_evening';
  }
  if (context.districtId === 'bay_steps' && minutes >= 17 * 60 && minutes < 19 * 60 + 30) {
    return 'waterfront_golden';
  }
  if (context.districtId === 'lantern_street' && minutes >= 7 * 60 && minutes < 10 * 60 + 30) {
    return 'cafe_morning';
  }
  if (minutes >= 5 * 60 + 30 && minutes < 7 * 60 + 15 && context.weather !== 'overcast') {
    return 'morning_light';
  }
  return 'silence';
}

function normalizeMinutes(minutes: number): number {
  return ((Math.floor(minutes) % 1440) + 1440) % 1440;
}

export type MusicVoicing = {
  bpm: number;
  notes: readonly number[];
  gain: number;
  waveform: OscillatorTypeLike;
};

type OscillatorTypeLike = 'sine' | 'triangle';

const VOICINGS: Record<MusicState, MusicVoicing> = {
  silence: { bpm: 60, notes: [], gain: 0, waveform: 'sine' },
  arrival: { bpm: 58, notes: [261.63, 329.63, 392], gain: 0.035, waveform: 'triangle' },
  morning_light: { bpm: 64, notes: [293.66, 369.99, 440], gain: 0.022, waveform: 'sine' },
  cafe_morning: { bpm: 66, notes: [261.63, 311.13, 392, 466.16], gain: 0.026, waveform: 'triangle' },
  home_evening: { bpm: 56, notes: [220, 277.18, 329.63, 415.3], gain: 0.024, waveform: 'sine' },
  waterfront_golden: { bpm: 60, notes: [196, 246.94, 293.66, 369.99], gain: 0.028, waveform: 'triangle' },
  memory_book: { bpm: 54, notes: [261.63, 329.63, 392, 493.88], gain: 0.03, waveform: 'sine' },
  festival: { bpm: 72, notes: [220, 277.18, 329.63, 440], gain: 0.035, waveform: 'triangle' },
};

export function musicVoicing(state: MusicState): MusicVoicing {
  return VOICINGS[state];
}
