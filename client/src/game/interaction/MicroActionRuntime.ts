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
  private pending: { completion: Promise<boolean>; result: boolean | null } | null = null;
  private promptShownForStep: string | null = null;

  constructor(
    private readonly onPrompt?: (prompt: string | null) => void,
    private readonly onStep?: (step: MicroActionStep, interactionId: string) => void,
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

  update(_deltaSeconds: number, interactPressed: boolean, player: PlayerController): void {
    if (!this.session) return;
    if (this.pending) {
      if (this.pending.result === null) return;
      const completed = this.pending.result;
      this.pending = null;
      if (!completed) { this.cancel(player); return; }
      const current = this.session.currentStep;
      if (!current) { this.cancel(player); return; }
      this.onStep?.(current, this.source?.id ?? this.session.id);
      this.session = advanceMicroAction(this.session, current.primitive);
      if (this.session.status === 'completed') this.finish(player);
      return;
    }
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
    const pending = this.pending;
    this.pending = null;
    if (pending && player.waitForMicroActionCompletion() === pending.completion) player.cancelMicroAction();
    this.session = null;
    this.source = null;
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
    if (!player.beginMicroAction(action, duration, true)) { this.cancel(player); return; }
    const pending = { completion: player.waitForMicroActionCompletion(), result: null as boolean | null };
    this.pending = pending;
    void pending.completion.then(
      completed => { if (this.pending === pending) pending.result = completed; },
      () => { if (this.pending === pending) pending.result = false; },
    );
    this.promptShownForStep = null;
    this.onPrompt?.(null);
  }

  private finish(player: PlayerController): void {
    const source = this.source;
    if (source?.completionAction) this.onComplete?.(source.completionAction, source.id);
    this.session = null;
    this.source = null;
    this.pending = null;
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
