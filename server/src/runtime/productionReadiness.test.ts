import { describe, expect, it } from 'vitest';
import { productionReadiness } from './productionReadiness';

describe('productionReadiness', () => {
  it('allows local development without production infrastructure', () => {
    expect(productionReadiness({ NODE_ENV: 'development' })).toEqual({ ready: true, issues: [] });
  });

  it('fails closed when production persistence/auth/origin configuration is incomplete', () => {
    const result = productionReadiness({ NODE_ENV: 'production', ALLOW_DEV_AUTH: 'true' });
    expect(result.ready).toBe(false);
    expect(result.issues).toContain('SUPABASE_URL is required in production');
    expect(result.issues).toContain('SUPABASE_SERVICE_ROLE_KEY is required in production');
    expect(result.issues).toContain('CLIENT_URL is required in production');
    expect(result.issues).toContain('ALLOW_DEV_AUTH must not be enabled in production');
  });

  it('accepts a minimally valid production runtime configuration', () => {
    expect(productionReadiness({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      CLIENT_URL: 'https://together.example.com',
      ALLOW_DEV_AUTH: 'false',
    })).toEqual({ ready: true, issues: [] });
  });
});
