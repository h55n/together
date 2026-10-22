import { QUALITY_PROFILES, type QualityTier } from '@together/shared';

export type AdaptiveQualitySnapshot = {
  p95FrameMs: number;
  framesOver33ms: number;
};

export type AdaptiveVisualBudget = {
  pixelRatioCap: number;
  resolutionScale: number;
  shadowScale: number;
  vegetationScale: number;
  shadowsEnabled: boolean;
  streamRadiusChunks: number;
  gameplayScale: 1;
};

const HITCH_SAMPLE_COUNT = 30;
// Avoid re-enabling expensive work after only four seconds of a lighter
// workload. At 60Hz each recovery step needs about thirty stable seconds.
const STABLE_SAMPLE_COUNT = 1800;

export class AdaptiveQualityController {
  private reductionStep = 0;
  private hitchSamples = 0;
  private stableSamples = 0;
  private cachedBudgetStep = -1;
  private cachedBudget: AdaptiveVisualBudget | null = null;

  constructor(private readonly quality: QualityTier) {}

  sample(snapshot: AdaptiveQualitySnapshot): AdaptiveVisualBudget {
    if (this.quality === 'low') return this.budget();

    if (snapshot.p95FrameMs > 33 && snapshot.framesOver33ms >= HITCH_SAMPLE_COUNT) {
      this.hitchSamples += 1;
      this.stableSamples = 0;
      if (this.hitchSamples >= HITCH_SAMPLE_COUNT) {
        this.reductionStep = Math.min(maxReductionFor(this.quality), this.reductionStep + 1);
        this.hitchSamples = 0;
      }
    } else if (snapshot.p95FrameMs <= 22) {
      this.stableSamples += 1;
      this.hitchSamples = 0;
      if (this.stableSamples >= STABLE_SAMPLE_COUNT && this.reductionStep > 0) {
        this.reductionStep -= 1;
        this.stableSamples = 0;
      }
    } else {
      this.hitchSamples = 0;
      this.stableSamples = 0;
    }

    return this.budget();
  }

  private budget(): AdaptiveVisualBudget {
    if (this.cachedBudget && this.cachedBudgetStep === this.reductionStep) return this.cachedBudget;
    this.cachedBudgetStep = this.reductionStep;
    this.cachedBudget = toBudget(this.quality, this.reductionStep);
    return this.cachedBudget;
  }
}

function maxReductionFor(quality: QualityTier): number {
  return quality === 'medium' ? 4 : quality === 'high' ? 3 : 2;
}

function toBudget(quality: QualityTier, reductionStep: number): AdaptiveVisualBudget {
  const profile = QUALITY_PROFILES[quality];
  if ((quality === 'medium' || quality === 'high') && reductionStep >= maxReductionFor(quality)) {
    // The measured Low workload is the final fallback, retaining the user's
    // selected quality so sustained recovery can restore it gradually.
    return { ...QUALITY_PROFILES.low, resolutionScale: 0.85 };
  }
  const streamRadiusChunks = Math.max(3, profile.streamRadiusChunks - (reductionStep >= 1 ? 1 : 0));
  const vegetationScale = profile.vegetationScale * (reductionStep >= 2 ? 0.82 : 1);
  const shadowScale = profile.shadowScale * (reductionStep >= 3 ? 0.7 : 1);
  const pixelRatioCap = profile.pixelRatioCap;
  return { pixelRatioCap, resolutionScale: 1, shadowScale, vegetationScale, shadowsEnabled: profile.shadowsEnabled, streamRadiusChunks, gameplayScale: 1 };
}
