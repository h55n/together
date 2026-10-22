import { AMAYA_BAY_CITY, AMAYA_BAY_SUBAREAS, AMAYA_BAY_VENUES, locationAnchor, venueGameplayRole } from '@together/shared';

export type StoryPoint = { x: number; z: number };

/** Story content names a few places by older or generic ids. */
const TARGET_ALIASES: Readonly<Record<string, string>> = {
  common_library: 'the_common_library',
  // House viewings happen in the residential colonies of Mogra Court.
  property_visit: 'mogra_court',
};

/**
 * Where a story's location task happens in the world. Anchors are exact; subareas and
 * districts use their centres; role targets (e.g. `furniture_shop`) use the first matching venue.
 */
export function storyTargetPosition(target: string, home: StoryPoint | null): StoryPoint | null {
  if (target === 'home') return home;
  target = TARGET_ALIASES[target] ?? target;
  const anchor = locationAnchor(target);
  if (anchor) return { x: anchor.position.x, z: anchor.position.z };
  const subarea = AMAYA_BAY_SUBAREAS.find(area => area.id === target);
  if (subarea) return { ...subarea.center };
  const district = AMAYA_BAY_CITY.districts.find(entry => entry.id === target);
  if (district) return { ...district.center };
  const venue = AMAYA_BAY_VENUES.find(entry => entry.id === target || venueGameplayRole(entry.category) === target);
  return venue ? { x: venue.position.x, z: venue.position.z } : null;
}

/** The first still-pending location task of an active story, with its world position. */
export function nextStoryLocation(
  tasks: ReadonlyArray<{ id: string; type: string; target: string }>,
  taskState: Readonly<Record<string, string>>,
  home: StoryPoint | null,
): { taskId: string; target: string; position: StoryPoint } | null {
  for (const task of tasks) {
    if (task.type !== 'location' || (taskState[task.id] ?? 'pending') !== 'pending') continue;
    const position = storyTargetPosition(task.target, home);
    if (position) return { taskId: task.id, target: task.target, position };
  }
  return null;
}
