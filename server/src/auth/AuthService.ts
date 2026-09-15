import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthIdentity = { userId: string; isAnonymous: boolean };

export interface AuthService {
  verifyAccessToken(token: string | undefined, devUserId?: string): Promise<AuthIdentity>;
}

class LocalAuthService implements AuthService {
  async verifyAccessToken(_token: string | undefined, devUserId?: string): Promise<AuthIdentity> {
    if (process.env.NODE_ENV === 'production') throw new Error('Local auth is disabled in production');
    if (!devUserId || devUserId.length < 3) throw new Error('Development user identity is required');
    return { userId: devUserId, isAnonymous: true };
  }
}

class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async verifyAccessToken(token: string | undefined): Promise<AuthIdentity> {
    if (!token) throw new Error('Authentication token is required');
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) throw new Error('Authentication token is invalid');
    return { userId: data.user.id, isAnonymous: data.user.is_anonymous ?? false };
  }
}

export function createAuthService(): AuthService {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return new LocalAuthService();
  return new SupabaseAuthService(createClient(url, serviceRole, { auth: { persistSession: false } }));
}
