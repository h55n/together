export type ProgressionStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_THRESHOLDS_SECONDS: readonly number[] = [
  0,
  1 * 60 * 60,
  4 * 60 * 60,
  10 * 60 * 60,
  20 * 60 * 60,
  30 * 60 * 60,
  40 * 60 * 60,
];

const STAGE_NAMES = [
  'Arrival',
  'First Days',
  'Settling In',
  'Belonging',
  'Growing Home',
  'Our Life',
  'Open Living',
] as const;

export function stageForActiveSeconds(activeTimeSeconds: number): ProgressionStage {
  const seconds = Number.isFinite(activeTimeSeconds) ? Math.max(0, activeTimeSeconds) : 0;
  let stage: ProgressionStage = 0;
  for (let index = 1; index < STAGE_THRESHOLDS_SECONDS.length; index += 1) {
    if (seconds >= (STAGE_THRESHOLDS_SECONDS[index] ?? Infinity)) stage = index as ProgressionStage;
  }
  return stage;
}

export function progressionStageName(stage: number): typeof STAGE_NAMES[number] {
  const clamped = Math.max(0, Math.min(6, Math.floor(stage)));
  return STAGE_NAMES[clamped] ?? 'Arrival';
}
