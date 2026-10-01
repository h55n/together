import { QUALITY_PROFILES, type QualityTier } from '@together/shared';

export type AdaptiveQualitySnapshot = {
  p95FrameMs: number;
  framesOver33ms: number;
};

export type AdaptiveVisualBudget = {
  pixelRatioCap: number;
  shadowScale: number;
  vegetationScale: number;
  shadowsEnabled: boolean;
  streamRadiusChunks: number;
  gameplayScale: 1;
};

const HITCH_SAMPLE_COUNT = 30;
const STABLE_SAMPLE_COUNT = 240;

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
  const streamRadiusChunks = Math.max(3, profile.streamRadiusChunks - (reductionStep >= 1 ? 1 : 0));
  const vegetationScale = profile.vegetationScale * (reductionStep >= 2 ? 0.82 : 1);
  const shadowScale = profile.shadowScale * (reductionStep >= 3 ? 0.7 : 1);
  const pixelRatioCap = profile.pixelRatioCap * (reductionStep >= 4 ? 0.85 : 1);
  return { pixelRatioCap, shadowScale, vegetationScale, shadowsEnabled: profile.shadowsEnabled, streamRadiusChunks, gameplayScale: 1 };
}
