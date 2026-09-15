import type { HouseholdType } from '../contracts.js';

export type StoryPath = HouseholdType | 'all';
export type StoryTrigger = { type: 'flag'; key: string; value: boolean };
export type StoryTask = { id: string; type: 'interaction' | 'micro_action' | 'location' | 'purchase' | 'choice' | 'vote' | 'photo'; target: string; optional?: boolean };
export type StoryOutcome = {
  id: string;
  when?: { minFailures?: number; maxFailures?: number };
  memoryTag?: string;
  setFlags?: Record<string, boolean>;
};
export type StoryDefinition = {
  id: string;
  title: string;
  paths: StoryPath[];
  stageRange: [number, number];
  triggers: StoryTrigger[];
  tasks: StoryTask[];
  outcomes: StoryOutcome[];
  cooldownGameMinutes?: number;
};
export type StoryContext = {
  path: HouseholdType;
  stage: number;
  flags: Readonly<Record<string, boolean>>;
};

export function storyIsEligible(story: StoryDefinition, context: StoryContext): boolean {
  if (!(story.paths.includes('all') || story.paths.includes(context.path))) return false;
  if (context.stage < story.stageRange[0] || context.stage > story.stageRange[1]) return false;
  return story.triggers.every((trigger) => context.flags[trigger.key] === trigger.value);
}

export function chooseStoryOutcome(story: StoryDefinition, failures: number): StoryOutcome | undefined {
  const count = Math.max(0, Math.floor(failures));
  return story.outcomes.find((outcome) => {
    const condition = outcome.when;
    if (!condition) return true;
    if (condition.minFailures !== undefined && count < condition.minFailures) return false;
    if (condition.maxFailures !== undefined && count > condition.maxFailures) return false;
    return true;
  });
}

export type StoryTaskStateValue = 'pending' | 'complete' | 'failed' | 'skipped';

export function storyTasksAreResolvable(
  story: StoryDefinition,
  taskState: Readonly<Record<string, StoryTaskStateValue>>,
): boolean {
  return story.tasks.every((task) => {
    const state = taskState[task.id] ?? 'pending';
    if (task.optional) return true;
    return state === 'complete' || state === 'failed' || state === 'skipped';
  });
}
