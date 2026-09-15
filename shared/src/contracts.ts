import { z } from 'zod';

export const cityIdSchema = z.literal('amaya_bay');
export const householdTypeSchema = z.enum(['couple', 'friends']);
export const walletTypeSchema = z.enum(['personal', 'household']);
export const transportStateSchema = z.enum(['walking', 'bicycle', 'scooter', 'auto', 'kayak']);

const finiteNumber = z.number().finite();
export const vector3Schema = z.object({ x: finiteNumber, y: finiteNumber, z: finiteNumber });

export const avatarConfigSchema = z.object({
  bodyFrame: z.enum(['slim', 'average', 'broad']).default('average'),
  height: z.number().min(1.5).max(1.95).default(1.72),
  skinTone: z.number().int().min(1).max(12).default(5),
  faceBase: z.string().min(1).max(40).default('face_01'),
  hair: z.string().min(1).max(60).default('hair_01'),
  facialHair: z.string().max(60).optional(),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2f211b'),
  glasses: z.string().max(60).optional(),
  homeOutfit: z.string().min(1).max(80).default('home_01'),
  outdoorOutfit: z.string().min(1).max(80).default('outdoor_01'),
  sleepOutfit: z.string().min(1).max(80).default('sleep_01'),
}).strict();

export const householdCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: householdTypeSchema,
});

export const householdJoinSchema = z.object({
  inviteCode: z.string().trim().length(6),
}).strict();

export const playerSnapshotSchema = z.object({
  seq: z.number().int().nonnegative(),
  sentAt: z.number().nonnegative(),
  position: vector3Schema,
  yaw: finiteNumber,
  animation: z.string().min(1).max(64),
  transport: transportStateSchema,
}).strict();

export const purchaseRequestSchema = z.object({
  itemId: z.string().min(1).max(100),
  wallet: walletTypeSchema,
  idempotencyKey: z.string().min(8).max(128),
});

export const transformSchema = z.object({
  position: vector3Schema,
  rotationY: finiteNumber,
  scale: z.number().finite().min(0.25).max(4),
}).strict();

export const homeObjectMutationSchema = z.object({
  objectId: z.string().min(1).max(100),
  definitionId: z.string().min(1).max(100),
  roomId: z.string().min(1).max(80),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(128),
  transform: transformSchema,
}).strict();

export const weatherStateSchema = z.enum([
  'clear', 'partly_cloudy', 'overcast', 'light_rain', 'monsoon_rain',
  'thunderstorm', 'misty_morning', 'hot_bright_afternoon', 'windy_evening',
]);

export type AvatarConfig = z.infer<typeof avatarConfigSchema>;
export type HouseholdType = z.infer<typeof householdTypeSchema>;
export type PlayerSnapshot = z.infer<typeof playerSnapshotSchema>;
export type HomeObjectMutation = z.infer<typeof homeObjectMutationSchema>;
export type WeatherState = z.infer<typeof weatherStateSchema>;

export const playerJoinSchema = z.object({
  householdId: z.string().uuid(),
  cityId: cityIdSchema.default('amaya_bay'),
  shardId: z.string().min(1).max(40).default('0'),
}).strict();
