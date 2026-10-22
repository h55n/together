import type { ActivitySessionView } from './ActivityPanel';

/** Select one append-only server revision for every activity response path. */
export function mergeActivitySnapshot(current: ActivitySessionView | null, incoming: ActivitySessionView): ActivitySessionView {
  if (!current || current.id !== incoming.id) return incoming;
  if (current.householdId !== incoming.householdId || current.activityId !== incoming.activityId) return current;
  if ((incoming.state.revision ?? 0) < (current.state.revision ?? 0)) return current;
  if ((incoming.state.golf?.revision ?? 0) < (current.state.golf?.revision ?? 0)) return current;
  if ((incoming.state.badminton?.revision ?? 0) < (current.state.badminton?.revision ?? 0)) return current;
  if ((incoming.state.boardGame?.revision ?? 0) < (current.state.boardGame?.revision ?? 0)) return current;
  if ((incoming.state.picnic?.revision ?? 0) < (current.state.picnic?.revision ?? 0)) return current;
  if ((incoming.state.cafe?.revision ?? 0) < (current.state.cafe?.revision ?? 0)) return current;
  if ((incoming.state.transportRental?.revision ?? 0) < (current.state.transportRental?.revision ?? 0)) return current;
  if (current.serverNow !== undefined && incoming.serverNow !== undefined && incoming.serverNow < current.serverNow) return current;
  if (!current.state.participants.every(userId => incoming.state.participants.includes(userId))) return current;
  if (!current.state.completedStepIds.every((step, index) => incoming.state.completedStepIds[index] === step)) return current;
  if (current.state.status === 'complete' && incoming.state.status !== 'complete') return current;
  const currentTime = Date.parse(current.updatedAt), incomingTime = Date.parse(incoming.updatedAt);
  if (Number.isFinite(currentTime) && Number.isFinite(incomingTime) && incomingTime < currentTime) return current;
  return incoming;
}
