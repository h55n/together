import { bigint, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarConfig: jsonb('avatar_config').notNull().default({}),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp('last_seen', { withTimezone: true }).notNull().defaultNow(),
});

export const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  propertyId: uuid('property_id'),
  stage: integer('stage').notNull().default(0),
  sharedWallet: integer('shared_wallet').notNull().default(8000),
  hiddenState: jsonb('hidden_state').notNull().default({}),
  activeTimeSeconds: bigint('active_time_seconds', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable(
  'household_members',
  {
    householdId: uuid('household_id').notNull(),
    userId: uuid('user_id').notNull(),
    personalWallet: integer('personal_wallet').notNull().default(1500),
    membershipState: text('membership_state').notNull().default('active'),
    bedroomId: text('bedroom_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.userId] })],
);

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  cityId: text('city_id').notNull().default('amaya_bay'),
  propertyType: text('property_type').notNull(),
  buildingId: text('building_id').notNull(),
  unitId: text('unit_id').notNull(),
  baseLayoutId: text('base_layout_id').notNull(),
});

export const householdHomeState = pgTable('household_home_state', {
  householdId: uuid('household_id').primaryKey(),
  version: integer('version').notNull().default(0),
  surfaceConfig: jsonb('surface_config').notNull().default({}),
  furniture: jsonb('furniture').notNull().default([]),
  decor: jsonb('decor').notNull().default([]),
  inventory: jsonb('inventory').notNull().default([]),
  roomStates: jsonb('room_states').notNull().default({}),
  renovationFlags: jsonb('renovation_flags').notNull().default({}),
  processedMutations: jsonb('processed_mutations').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventories = pgTable('inventories', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerType: text('owner_type').notNull(),
  ownerId: uuid('owner_id').notNull(),
  itemId: text('item_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  metadata: jsonb('metadata').notNull().default({}),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  householdId: uuid('household_id'),
  userId: uuid('user_id'),
  walletType: text('wallet_type').notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  itemRef: text('item_ref'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const storyInstances = pgTable('story_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  eventId: text('event_id').notNull(),
  state: text('state').notNull(),
  branch: text('branch'),
  taskState: jsonb('task_state').notNull().default({}),
  failures: integer('failures').notNull().default(0),
  memoryTag: text('memory_tag'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const npcRelationships = pgTable(
  'npc_relationships',
  {
    householdId: uuid('household_id').notNull(),
    npcId: text('npc_id').notNull(),
    flags: jsonb('flags').notNull().default([]),
    familiarity: integer('familiarity').notNull().default(0),
    lastInteraction: timestamp('last_interaction', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.npcId] })],
);

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  householdId: uuid('household_id').notNull(),
  type: text('type').notNull(),
  screenshotPath: text('screenshot_path').notNull(),
  caption: text('caption').notNull(),
  locationId: text('location_id').notNull(),
  weather: text('weather').notNull(),
  participants: jsonb('participants').notNull().default([]),
  eventId: text('event_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const householdNotes = pgTable('household_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  author: uuid('author').notNull(),
  text: text('text').notNull(),
  placement: jsonb('placement').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable('votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  householdId: uuid('household_id').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  state: jsonb('state').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
