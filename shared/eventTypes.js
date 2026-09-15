// shared/eventTypes.js
// All Socket.io event name constants — single source of truth

export const EVENTS = {
  // Player lifecycle
  PLAYER_JOIN:         'player:join',
  PLAYER_MOVE:         'player:move',
  PLAYER_LEAVE:        'player:leave',
  PLAYER_EXPRESSION:   'player:expression',
  PLAYER_INTERACT:     'player:interact',

  // Chores
  CHORE_START:         'chore:start',
  CHORE_COMPLETE:      'chore:complete',
  CHORE_ABANDON:       'chore:abandon',
  CHORE_BOARD_SYNC:    'chore:board_sync',

  // Apartment / building
  FURNITURE_PLACE:     'furniture:place',
  FURNITURE_REMOVE:    'furniture:remove',
  ROOM_PAINT:          'room:paint',
  FLOOR_MATERIAL:      'room:floor_material',

  // Story
  STORY_TRIGGER:       'story:trigger',
  STORY_TASK:          'story:task_complete',
  STORY_RESOLVE:       'story:resolve',

  // Economy
  WALLET_DEPOSIT:      'wallet:deposit',
  WALLET_UPDATE:       'wallet:update',
  VIBE_UPDATE:         'vibe:update',
  RELATIONSHIP_UPDATE: 'relationship:update',

  // World / time
  WEATHER_SYNC:        'weather:sync',
  TIME_SYNC:           'time:sync',

  // Social
  NEIGHBOUR_KNOCK:     'neighbour:knock',
  NEIGHBOUR_ACCEPT:    'neighbour:accept',
  NEIGHBOUR_DECLINE:   'neighbour:decline',
  CHAT_NOTE:           'chat:note',
  MEMORY_CREATED:      'memory:created',

  // Jobs
  JOB_START:           'job:start',
  JOB_END:             'job:end',
  JOB_EARN:            'job:earn',

  // System
  ERROR:               'system:error',
  HOUSEHOLD_SYNC:      'household:sync',
};

// Room naming conventions
export const ROOMS = {
  user:      (userId)      => `user:${userId}`,
  household: (householdId) => `household:${householdId}`,
  city:      (cityId)      => `city:${cityId}`,
  interior:  (householdId, roomId) => `interior:${householdId}:${roomId}`,
};
