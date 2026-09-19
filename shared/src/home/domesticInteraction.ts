import { CHORE_SEQUENCES, type MicroActionStep } from '../interaction/microActions.js';

export type DomesticInteractionProgress = {
  interactionId: string;
  lastStepId: string;
  completedStepIds: string[];
  sequenceComplete: boolean;
  updatedByUserId: string;
  updatedAt: string;
  objectState?: string;
  soundEvent?: string;
  animationTag?: string;
  persistence: MicroActionStep['persistence'];
  replicate: boolean;
};

export function domesticSequenceForInteraction(interactionId: string): readonly MicroActionStep[] | undefined {
  const suffix = interactionId.split(':').at(-1);
  if (!suffix || !(suffix in CHORE_SEQUENCES)) return undefined;
  return CHORE_SEQUENCES[suffix as keyof typeof CHORE_SEQUENCES];
}

export function applyDomesticInteractionStep(
  previous: DomesticInteractionProgress | undefined,
  interactionId: string,
  stepId: string,
  userId: string,
  updatedAt: string,
): DomesticInteractionProgress {
  if (!interactionId) throw new Error('Domestic interaction id is required');
  if (!stepId) throw new Error('Domestic step id is required');
  if (!userId) throw new Error('Domestic step user is required');

  const sequence = domesticSequenceForInteraction(interactionId);
  if (!sequence) throw new Error(`Unknown domestic interaction: ${interactionId}`);

  const restarting = !previous || previous.interactionId !== interactionId || previous.sequenceComplete;
  const completedStepIds = restarting ? [] : [...previous.completedStepIds];
  const expected = sequence[completedStepIds.length];
  if (!expected) throw new Error(`Domestic interaction ${interactionId} has no remaining step`);
  if (expected.id !== stepId) {
    throw new Error(`Expected domestic step ${expected.id}, received ${stepId}`);
  }

  const nextCompleted = [...completedStepIds, expected.id];
  const next: DomesticInteractionProgress = {
    interactionId,
    lastStepId: expected.id,
    completedStepIds: nextCompleted,
    sequenceComplete: nextCompleted.length === sequence.length,
    updatedByUserId: userId,
    updatedAt,
    persistence: expected.persistence,
    replicate: expected.replicate,
  };

  const priorObjectState = restarting ? undefined : previous?.objectState;
  const objectState = expected.objectState ?? priorObjectState;
  if (objectState !== undefined) next.objectState = objectState;
  if (expected.soundEvent !== undefined) next.soundEvent = expected.soundEvent;
  if (expected.animationTag !== undefined) next.animationTag = expected.animationTag;
  return next;
}
