export type LoopUpdate = (deltaSeconds: number) => void;
export type FixedUpdate = (fixedDeltaSeconds: number) => void;

export const MAX_FRAME_DELTA_SECONDS = 0.1;
export const DEFAULT_FIXED_STEP_SECONDS = 1 / 60;
export const MAX_FIXED_STEPS_PER_FRAME = 4;

export function clampFrameDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return 0;
  return Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS);
}

export function consumeFixedSteps(
  accumulator: number,
  step = DEFAULT_FIXED_STEP_SECONDS,
  maxSteps = MAX_FIXED_STEPS_PER_FRAME,
): { steps: number; remainder: number } {
  let remainder = Math.max(0, accumulator);
  let steps = 0;
  while (remainder + 1e-9 >= step && steps < maxSteps) {
    remainder -= step;
    steps += 1;
  }
  if (steps === maxSteps && remainder >= step) remainder = 0;
  if (Math.abs(remainder) < 1e-9) remainder = 0;
  return { steps, remainder };
}

export class GameLoop {
  private accumulator = 0;
  private previousSeconds: number | null = null;

  constructor(
    private readonly update: LoopUpdate,
    private readonly fixedUpdate: FixedUpdate,
    private readonly fixedStep = DEFAULT_FIXED_STEP_SECONDS,
  ) {}

  frame(timestampMs: number): void {
    const now = timestampMs / 1000;
    if (this.previousSeconds === null) {
      this.previousSeconds = now;
      return;
    }

    const delta = clampFrameDelta(now - this.previousSeconds);
    this.previousSeconds = now;
    this.accumulator += delta;

    const result = consumeFixedSteps(this.accumulator, this.fixedStep);
    for (let i = 0; i < result.steps; i += 1) this.fixedUpdate(this.fixedStep);
    this.accumulator = result.remainder;
    this.update(delta);
  }

  reset(): void {
    this.accumulator = 0;
    this.previousSeconds = null;
  }
}
