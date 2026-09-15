export type MemoryCaptureSignals = {
  participantsVisible: number;
  participantsExpected: number;
  occlusionRatio: number;
  composition: number;
  storyRelevance: number;
  scenicValue: number;
  lightingQuality: number;
  secondsSinceAutomaticCapture: number;
};

/** Returns a normalized 0..1 score; sparse capture is enforced separately by cooldown. */
export function scoreMemoryCapture(signals: MemoryCaptureSignals): number {
  const participantCoverage = signals.participantsExpected <= 0
    ? 1
    : clamp01(signals.participantsVisible / signals.participantsExpected);
  const visibility = participantCoverage * (1 - clamp01(signals.occlusionRatio));
  const recency = clamp01(signals.secondsSinceAutomaticCapture / 600);
  return clamp01(
    visibility * 0.28
    + clamp01(signals.composition) * 0.18
    + clamp01(signals.storyRelevance) * 0.22
    + clamp01(signals.scenicValue) * 0.12
    + clamp01(signals.lightingQuality) * 0.12
    + recency * 0.08,
  );
}

export function shouldAutoCapture(score: number, secondsSinceAutomaticCapture: number): boolean {
  return secondsSinceAutomaticCapture >= 300 && score >= 0.72;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

const MEMORY_IMAGE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function makeMemoryImagePath(imageId: string): string {
  if (!MEMORY_IMAGE_ID.test(imageId)) throw new Error('Invalid memory image id');
  return `memory-image:${imageId}`;
}

export function memoryImageIdFromPath(path: string): string | null {
  if (!path.startsWith('memory-image:')) return null;
  const imageId = path.slice('memory-image:'.length);
  return MEMORY_IMAGE_ID.test(imageId) ? imageId : null;
}
