import { describe, expect, it } from 'vitest';
import { apiUrl } from './api';

describe('apiUrl', () => {
  it('targets the configured game server for split-origin production deployments', () => {
    expect(apiUrl('/api/health', 'https://game.example.com/')).toBe('https://game.example.com/api/health');
  });

  it('preserves relative API paths for same-origin deployments', () => {
    expect(apiUrl('/api/health', '')).toBe('/api/health');
  });

  it('rejects non-rooted paths to avoid accidental external URL composition', () => {
    expect(() => apiUrl('api/health', 'https://game.example.com')).toThrow(/must begin/);
  });
});
