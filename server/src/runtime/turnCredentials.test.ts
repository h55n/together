import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createVoiceIceConfig } from './turnCredentials';

describe('createVoiceIceConfig', () => {
  it('uses STUN-only development fallback when no TURN secret exists', () => {
    expect(createVoiceIceConfig('user-a', {}, 0)).toEqual({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      expiresAt: null,
    });
  });

  it('mints short-lived coturn REST credentials without exposing the shared secret', () => {
    const now = Date.UTC(2026, 8, 19, 12, 0, 0);
    const config = createVoiceIceConfig('user:a', {
      STUN_URL: 'stun:stun.example.com:3478',
      TURN_URL: 'turns:turn.example.com:5349',
      TURN_SHARED_SECRET: 'server-only-secret',
      TURN_TTL_SECONDS: '900',
    }, now);

    const expiry = Math.floor(now / 1000) + 900;
    const username = `${expiry}:user_a`;
    const expectedCredential = createHmac('sha1', 'server-only-secret').update(username).digest('base64');
    expect(config.iceServers).toEqual([
      { urls: 'stun:stun.example.com:3478' },
      { urls: 'turns:turn.example.com:5349', username, credential: expectedCredential },
    ]);
    expect(JSON.stringify(config)).not.toContain('server-only-secret');
    expect(config.expiresAt).toBe(new Date(expiry * 1000).toISOString());
  });
});
