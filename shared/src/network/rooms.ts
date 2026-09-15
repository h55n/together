export const rooms = {
  user: (userId: string) => `user:${userId}`,
  household: (householdId: string) => `household:${householdId}`,
  cityShard: (cityId: string, shardId: string) => `city:${cityId}:shard:${shardId}`,
  interior: (householdId: string, zoneId: string) => `interior:${householdId}:${zoneId}`,
  voice: (householdId: string) => `voice:${householdId}`,
} as const;
