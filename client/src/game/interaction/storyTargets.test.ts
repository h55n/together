import { describe, expect, it } from 'vitest';
import { storyEvents } from '@together/content';
import { nextStoryLocation, storyTargetPosition } from './storyTargets';

describe('story location targets', () => {
  it('places every authored story location task somewhere in Amaya Bay', () => {
    const home = { x: -230, z: 170 };
    for (const story of storyEvents) for (const task of story.tasks) {
      if (task.type !== 'location') continue;
      const position = storyTargetPosition(task.target, home);
      expect(position, `${story.id}:${task.target}`).not.toBeNull();
      expect(Math.abs(position!.x)).toBeLessThanOrEqual(450);
      expect(Math.abs(position!.z)).toBeLessThanOrEqual(450);
    }
  });

  it('points at the first pending location task and skips completed ones', () => {
    const tasks = [{ id: 'visit', type: 'location', target: 'bay_kayak_hut' }, { id: 'photo', type: 'photo', target: 'kayak' }];
    expect(nextStoryLocation(tasks, {}, null)?.taskId).toBe('visit');
    expect(nextStoryLocation(tasks, { visit: 'complete' }, null)).toBeNull();
  });
});
