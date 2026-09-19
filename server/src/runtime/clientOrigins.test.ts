import { describe, expect, it } from 'vitest';
import { allowedClientOrigins } from './clientOrigins';

describe('allowedClientOrigins', () => {
  it('allows local dev origins outside production', () => {
    expect(allowedClientOrigins({ NODE_ENV: 'development', CLIENT_URL: 'http://localhost:5173' })).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
    ]);
  });

  it('allows only the configured public origin in production', () => {
    expect(allowedClientOrigins({ NODE_ENV: 'production', CLIENT_URL: 'https://together.example.com' })).toEqual([
      'https://together.example.com',
    ]);
  });
});
