import type { AvatarAction } from '../animation/avatarMotion.js';

export type ActivityId = 'picnic' | 'cycling' | 'kayak' | 'badminton' | 'mini_golf' | 'cafe_hangout' | 'board_game' | 'photography';
export type ActivityStep = { id: string; label: string; animation: AvatarAction };
export type ActivityState = {
  activityId: ActivityId;
  participants: string[];
  completedStepIds: string[];
  status: 'active' | 'complete';
  score?: number;
};

const PARTICIPANTS: Record<ActivityId, readonly [number, number]> = {
  picnic: [1, 6], cycling: [1, 6], kayak: [1, 2], badminton: [2, 4], mini_golf: [1, 6], cafe_hangout: [1, 6], board_game: [2, 6], photography: [1, 6],
};

export function activityParticipantLimit(activityId: ActivityId): readonly [number, number] { return PARTICIPANTS[activityId]; }

const ACTIONS: Record<ActivityId, readonly ActivityStep[]> = {
  picnic: [
    { id: 'place_mat', label: 'Lay out the picnic mat', animation: 'place' },
    { id: 'unpack_food', label: 'Unpack the food', animation: 'pick_up' },
    { id: 'sit_together', label: 'Sit down together', animation: 'sit' },
    { id: 'share_food', label: 'Share the food', animation: 'hand_over' },
  ],
  cycling: [
    { id: 'mount_cycle', label: 'Mount the bicycle', animation: 'cycle' },
    { id: 'ride_route', label: 'Ride the route', animation: 'cycle' },
    { id: 'park_cycle', label: 'Park the bicycle', animation: 'place' },
  ],
  kayak: [
    { id: 'safety_check', label: 'Check the life jacket', animation: 'point' },
    { id: 'launch', label: 'Launch the kayak', animation: 'carry' },
    { id: 'paddle', label: 'Paddle through the bay', animation: 'kayak' },
    { id: 'return', label: 'Return the kayak', animation: 'place' },
  ],
  badminton: [
    { id: 'serve', label: 'Serve the shuttle', animation: 'point' },
    { id: 'rally', label: 'Keep a relaxed rally going', animation: 'high_five' },
    { id: 'finish', label: 'Finish the game', animation: 'high_five' },
  ],
  mini_golf: [
    { id: 'line_up', label: 'Line up the putt', animation: 'point' },
    { id: 'putt', label: 'Take the putt', animation: 'point' },
    { id: 'walk_on', label: 'Walk to the next hole', animation: 'walk' },
  ],
  cafe_hangout: [
    { id: 'choose_seat', label: 'Choose a seat', animation: 'sit' },
    { id: 'order_drink', label: 'Order something warm', animation: 'hand_over' },
    { id: 'linger', label: 'Stay a while', animation: 'sit' },
  ],
  board_game: [
    { id: 'deal', label: 'Deal the cards', animation: 'hand_over' },
    { id: 'play_round', label: 'Play a round', animation: 'point' },
    { id: 'pack_away', label: 'Pack the game away', animation: 'place' },
  ],
  photography: [
    { id: 'frame', label: 'Frame the scene', animation: 'point' },
    { id: 'capture', label: 'Take the photo', animation: 'point' },
  ],
};

export function activityActionSequence(activityId: ActivityId): readonly ActivityStep[] {
  return ACTIONS[activityId];
}

export function createActivityState(activityId: ActivityId, userId: string): ActivityState {
  return { activityId, participants: [userId], completedStepIds: [], status: 'active' };
}

export function joinActivityState(state: ActivityState, userId: string, maxParticipants: number): ActivityState {
  if (state.status !== 'active') throw new Error('Activity is already complete');
  if (state.participants.includes(userId)) return state;
  if (state.participants.length >= maxParticipants) throw new Error('Activity is full');
  return { ...state, participants: [...state.participants, userId] };
}

export function advanceActivityState(state: ActivityState, stepId: string): ActivityState {
  if (state.status !== 'active') return state;
  const steps = ACTIONS[state.activityId];
  const next = steps[state.completedStepIds.length];
  if (!next || next.id !== stepId) throw new Error('That is not the next activity step');
  const completedStepIds = [...state.completedStepIds, stepId];
  return { ...state, completedStepIds, status: completedStepIds.length >= steps.length ? 'complete' : 'active' };
}
