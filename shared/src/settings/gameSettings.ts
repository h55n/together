export type QualityTier = 'low' | 'medium' | 'high' | 'capture';

export type ControlBindings = { forward: string; back: string; left: string; right: string; jog: string; interact: string; cameraToggle: string; dismount: string };
export const DEFAULT_CONTROL_BINDINGS: ControlBindings = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jog: 'ShiftLeft', interact: 'KeyE', cameraToggle: 'KeyV', dismount: 'KeyX' };

export type GameSettings = {
  fov: number;
  headBob: number;
  cameraShake: number;
  uiScale: number;
  masterVolume: number;
  reducedMotion: boolean;
  highContrastPrompt: boolean;
  subtitles: boolean;
  quality: QualityTier;
  bindings: ControlBindings;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  fov: 78,
  headBob: 0.018,
  cameraShake: 0,
  uiScale: 1,
  masterVolume: 0.75,
  reducedMotion: false,
  highContrastPrompt: false,
  subtitles: true,
  quality: 'medium',
  bindings: DEFAULT_CONTROL_BINDINGS,
};

export const QUALITY_PROFILES: Record<QualityTier, {
  pixelRatioCap: number;
  shadowScale: number;
  vegetationScale: number;
  shadowsEnabled: boolean;
  streamRadiusChunks: number;
  gameplayScale: 1;
}> = {
  low: { pixelRatioCap: 1, shadowScale: 0.65, vegetationScale: 0.65, shadowsEnabled: false, streamRadiusChunks: 3, gameplayScale: 1 },
  medium: { pixelRatioCap: 1.5, shadowScale: 1, vegetationScale: 1, shadowsEnabled: true, streamRadiusChunks: 5, gameplayScale: 1 },
  high: { pixelRatioCap: 2, shadowScale: 1.2, vegetationScale: 1.2, shadowsEnabled: true, streamRadiusChunks: 5, gameplayScale: 1 },
  capture: { pixelRatioCap: 2, shadowScale: 1.45, vegetationScale: 1.35, shadowsEnabled: true, streamRadiusChunks: 6, gameplayScale: 1 },
};

export function normalizeGameSettings(input: Partial<GameSettings>): GameSettings {
  const quality: QualityTier = input.quality && input.quality in QUALITY_PROFILES ? input.quality : DEFAULT_GAME_SETTINGS.quality;
  return {
    fov: clamp(input.fov ?? DEFAULT_GAME_SETTINGS.fov, 70, 95),
    headBob: clamp(input.headBob ?? DEFAULT_GAME_SETTINGS.headBob, 0, 0.04),
    cameraShake: clamp(input.cameraShake ?? DEFAULT_GAME_SETTINGS.cameraShake, 0, 1),
    uiScale: clamp(input.uiScale ?? DEFAULT_GAME_SETTINGS.uiScale, 0.8, 1.5),
    masterVolume: clamp(input.masterVolume ?? DEFAULT_GAME_SETTINGS.masterVolume, 0, 1),
    reducedMotion: input.reducedMotion ?? DEFAULT_GAME_SETTINGS.reducedMotion,
    highContrastPrompt: input.highContrastPrompt ?? DEFAULT_GAME_SETTINGS.highContrastPrompt,
    subtitles: input.subtitles ?? DEFAULT_GAME_SETTINGS.subtitles,
    quality,
    bindings: normalizeBindings(input.bindings),
  };
}

function normalizeBindings(input: Partial<ControlBindings> | undefined): ControlBindings {
  const next = { ...DEFAULT_CONTROL_BINDINGS };
  if (!input) return next;
  for (const key of Object.keys(DEFAULT_CONTROL_BINDINGS) as Array<keyof ControlBindings>) {
    const candidate = input[key];
    if (typeof candidate === 'string' && /^(Key[A-Z]|Digit[0-9]|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Space|Enter|Arrow(Up|Down|Left|Right))$/.test(candidate)) next[key] = candidate;
  }
  return next;
}

function clamp(value: number, min: number, max: number): number {
  const finite = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, finite));
}
