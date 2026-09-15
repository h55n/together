export type NormalizedGamepadAxes = { x: number; y: number };
export type StandardGamepadButtons = { interact: boolean; jog: boolean; cameraToggle: boolean; dismount: boolean };

export function normalizeGamepadAxes(x: number, y: number, deadzone = 0.18): NormalizedGamepadAxes {
  const finiteX = Number.isFinite(x) ? x : 0;
  const finiteY = Number.isFinite(y) ? y : 0;
  const magnitude = Math.min(1, Math.hypot(finiteX, finiteY));
  const safeDeadzone = Math.max(0, Math.min(0.95, deadzone));
  if (magnitude <= safeDeadzone || magnitude === 0) return { x: 0, y: 0 };
  const scaledMagnitude = Math.min(1, (magnitude - safeDeadzone) / (1 - safeDeadzone));
  const scale = scaledMagnitude / magnitude;
  return { x: clamp(finiteX * scale), y: clamp(finiteY * scale) };
}

export function readStandardGamepadButtons(buttons: readonly boolean[]): StandardGamepadButtons {
  return {
    interact: Boolean(buttons[0]),
    dismount: Boolean(buttons[2]),
    cameraToggle: Boolean(buttons[3] || buttons[9]),
    jog: Boolean(buttons[5] || buttons[10]),
  };
}

function clamp(value: number): number { return Math.max(-1, Math.min(1, value)); }
