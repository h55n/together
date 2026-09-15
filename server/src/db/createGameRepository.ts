import { createClient } from '@supabase/supabase-js';
import type { GameRepository } from './GameRepository.js';
import { LocalGameRepository } from './LocalGameRepository.js';
import { SupabaseGameRepository } from './SupabaseGameRepository.js';
import { logger } from '../logging/logger.js';

let singleton: GameRepository | null = null;

export function createGameRepository(): GameRepository {
  if (singleton) return singleton;
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    logger.warn('Using in-memory game repository; data will reset when server restarts');
    const repository = new LocalGameRepository();
    singleton = repository;
    return repository;
  }
  const repository = new SupabaseGameRepository(
    createClient(url, serviceRole, { auth: { persistSession: false } }),
  );
  singleton = repository;
  return repository;
}
