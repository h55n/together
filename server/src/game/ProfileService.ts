import { avatarConfigSchema } from '@together/shared';
import { z } from 'zod';
import type { GameRepository, UserProfileRecord } from '../db/GameRepository.js';

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(32),
  avatarConfig: avatarConfigSchema,
  settings: z.record(z.string(), z.unknown()).default({}),
}).strict();

export class ProfileService {
  constructor(private readonly repository: GameRepository) {}

  async saveProfile(userId: string, raw: unknown): Promise<UserProfileRecord> {
    if (!userId.trim()) throw new Error('User id is required');
    const input = profileInputSchema.parse(raw);
    const profile: UserProfileRecord = {
      userId,
      displayName: input.displayName,
      avatarConfig: input.avatarConfig,
      settings: input.settings,
      updatedAt: new Date().toISOString(),
    };
    await this.repository.saveUserProfile(profile);
    return profile;
  }

  async getProfile(userId: string): Promise<UserProfileRecord | null> {
    return this.repository.getUserProfile(userId);
  }
}
