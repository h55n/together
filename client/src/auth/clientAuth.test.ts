import { afterEach, describe, expect, it, vi } from 'vitest';
import { authHeadersForIdentity, resolveAuthStrategy } from './clientAuth';
const auth = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth }) }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('client auth strategy', () => {
  it('keeps resolved identity current after token refresh and unsubscribes cleanly', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anonymous-key');
    auth.getSession.mockResolvedValue({ error: null, data: { session: { user: { id: 'u1' }, access_token: 'old-token' } } });
    const unsubscribe = vi.fn();
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
    const { resolveClientIdentity, subscribeClientIdentity } = await import('./clientAuth');
    await resolveClientIdentity();
    const listener = vi.fn();
    const stop = subscribeClientIdentity(listener);
    const callback = auth.onAuthStateChange.mock.calls.at(-1)![0];
    callback('TOKEN_REFRESHED', { user: { id: 'u1' }, access_token: 'new-token' });
    const expected = { userId: 'u1', accessToken: 'new-token', mode: 'supabase' };
    expect(listener).toHaveBeenCalledWith(expected);
    await expect(resolveClientIdentity()).resolves.toEqual(expected);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
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

  it('allows retry after a temporary sign-in restoration failure and shares successful identity requests', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anonymous-key');
    auth.getSession.mockReset();
    auth.getSession.mockResolvedValueOnce({ error: { message: 'temporary network outage' }, data: { session: null } });
    auth.getSession.mockResolvedValue({ error: null, data: { session: { user: { id: 'restored-user' }, access_token: 'restored-token' } } });
    const { resolveClientIdentity } = await import('./clientAuth');
    await expect(resolveClientIdentity()).rejects.toThrow('temporary network outage');
    const first = resolveClientIdentity();
    const second = resolveClientIdentity();
    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ userId: 'restored-user', accessToken: 'restored-token', mode: 'supabase' });
  });
});
