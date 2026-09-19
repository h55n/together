import { describe, expect, it } from 'vitest';
import { authHeadersForIdentity, resolveAuthStrategy } from './clientAuth';

describe('client auth strategy', () => {
  it('uses development identity only when Supabase client config is absent outside production', () => {
    expect(resolveAuthStrategy({ production: false })).toBe('development');
  });

  it('requires complete Supabase client config and refuses dev identity in production', () => {
    expect(() => resolveAuthStrategy({ production: true })).toThrow(/Production client requires/);
    expect(() => resolveAuthStrategy({ production: false, supabaseUrl: 'https://example.supabase.co' })).toThrow(/requires both/);
    expect(resolveAuthStrategy({
      production: true,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    })).toBe('supabase');
  });

  it('uses bearer auth when a Supabase access token exists and dev header otherwise', () => {
    expect(authHeadersForIdentity({ userId: 'u1', accessToken: 'token' }, true)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
    expect(authHeadersForIdentity({ userId: 'u2' })).toEqual({ 'x-dev-user-id': 'u2' });
  });
});
