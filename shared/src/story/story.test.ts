import assert from 'node:assert/strict';
import test from 'node:test';
import { storyIsEligible, chooseStoryOutcome, storyTasksAreResolvable, type StoryDefinition } from './story.js';

const event: StoryDefinition = {
  id: 'first_dinner', title: 'First Dinner', paths: ['all'], stageRange: [0, 1],
  triggers: [{ type: 'flag', key: 'moved_in', value: true }],
  tasks: [{ id: 'cook', type: 'micro_action', target: 'serve_meal' }],
  outcomes: [
    { id: 'warm_meal', when: { maxFailures: 0 }, memoryTag: 'first_meal' },
    { id: 'burned_rice', when: { minFailures: 1 }, memoryTag: 'funny_failure' },
  ],
};

test('story eligibility respects path, stage and authored trigger flags', () => {
  assert.equal(storyIsEligible(event, { path: 'couple', stage: 0, flags: { moved_in: true } }), true);
  assert.equal(storyIsEligible(event, { path: 'friends', stage: 2, flags: { moved_in: true } }), false);
  assert.equal(storyIsEligible(event, { path: 'friends', stage: 0, flags: {} }), false);
});

test('story failure selects an alternate authored memory outcome', () => {
  assert.equal(chooseStoryOutcome(event, 0)?.id, 'warm_meal');
  assert.equal(chooseStoryOutcome(event, 1)?.id, 'burned_rice');
});

test('story task readiness requires every non-optional task while allowing optional tasks to remain pending', () => {
  const taskState = { cook: 'complete', photo: 'pending' } as const;
  const withOptional: StoryDefinition = { ...event, tasks: [...event.tasks, { id: 'photo', type: 'photo', target: 'meal', optional: true }] };
  assert.equal(storyTasksAreResolvable(withOptional, taskState), true);
  assert.equal(storyTasksAreResolvable(event, { cook: 'pending' }), false);
  assert.equal(storyTasksAreResolvable(event, { cook: 'failed' }), true);
});
