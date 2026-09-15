import {
  advanceMicroAction,
  avatarActionForPrimitive,
  createMicroActionSession,
  type HomeAction,
  type MicroActionSession,
  type MicroActionStep,
} from '@together/shared';
import type { PlayerController } from '../player/PlayerController';

export type SequencedInteraction = {
  id: string;
  label: string;
  sequence: readonly MicroActionStep[];
  completionAction?: HomeAction;
};

export class MicroActionRuntime {
  private session: MicroActionSession | null = null;
  private source: SequencedInteraction | null = null;
  private cooldown = 0;
  private promptShownForStep: string | null = null;

  constructor(
    private readonly onPrompt?: (prompt: string | null) => void,
    private readonly onComplete?: (action: HomeAction, interactionId: string) => void,
    private readonly onFinished?: () => void,
  ) {}

  isActive(): boolean {
    return this.session !== null;
  }

  start(source: SequencedInteraction, player: PlayerController): void {
    if (this.session) return;
    this.source = source;
    this.session = createMicroActionSession(source.id, source.sequence);
    player.setInteractionLock(true);
    if (this.session.status === 'completed') {
      this.finish(player);
      return;
    }
    this.performCurrent(player);
  }

  update(deltaSeconds: number, interactPressed: boolean, player: PlayerController): void {
    if (!this.session) return;
    this.cooldown = Math.max(0, this.cooldown - Math.max(0, deltaSeconds));
    if (this.cooldown > 0) return;
    if (this.session.status === 'completed') {
      this.finish(player);
      return;
    }
    const current = this.session.currentStep;
    if (!current) {
      this.finish(player);
      return;
    }
    if (this.promptShownForStep !== current.id) {
      this.promptShownForStep = current.id;
      this.onPrompt?.(`E · ${labelForStep(current)}`);
    }
    if (interactPressed) this.performCurrent(player);
  }

  cancel(player: PlayerController): void {
    if (!this.session) return;
    this.session = null;
    this.source = null;
    this.cooldown = 0;
    this.promptShownForStep = null;
    player.setInteractionLock(false);
    this.onPrompt?.(null);
    this.onFinished?.();
  }

  private performCurrent(player: PlayerController): void {
    const current = this.session?.currentStep;
    if (!current || !this.session) return;
    const action = avatarActionForPrimitive(current.primitive);
    const duration = durationForStep(current);
    player.beginMicroAction(action, duration, true);
    this.session = advanceMicroAction(this.session, current.primitive);
    this.cooldown = duration;
    this.promptShownForStep = null;
    this.onPrompt?.(null);
  }

  private finish(player: PlayerController): void {
    const source = this.source;
    if (source?.completionAction) this.onComplete?.(source.completionAction, source.id);
    this.session = null;
    this.source = null;
    this.cooldown = 0;
    this.promptShownForStep = null;
    player.setInteractionLock(false);
    this.onPrompt?.(null);
    this.onFinished?.();
  }
}

function durationForStep(step: MicroActionStep): number {
  switch (step.primitive) {
    case 'scrub': return 1.15;
    case 'wipe': return 0.95;
    case 'wash': return 0.9;
    case 'cut': return 0.82;
    case 'stir': return 1.05;
    case 'fold': return 1.1;
    case 'water': return 1.1;
    case 'carry': return 0.75;
    case 'sleep': return 2.4;
    case 'sit': return 1.5;
    default: return 0.62;
  }
}

function labelForStep(step: MicroActionStep): string {
  return step.id.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase());
}
