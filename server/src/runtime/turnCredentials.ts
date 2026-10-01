import { createHmac } from 'node:crypto';

export type VoiceIceServer = {
  urls: string;
  username?: string;
  credential?: string;
};

export type VoiceIceConfig = {
  iceServers: VoiceIceServer[];
  expiresAt: string | null;
};

export function createVoiceIceConfig(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): VoiceIceConfig {
  const iceServers: VoiceIceServer[] = [];
  const stunUrl = env.STUN_URL?.trim() || 'stun:stun.l.google.com:19302';
  if (stunUrl) iceServers.push({ urls: stunUrl });

  const turnUrl = env.TURN_URL?.trim();
  const secret = env.TURN_SHARED_SECRET?.trim();
  if (!turnUrl || !secret) return { iceServers, expiresAt: null };

  const ttl = clampTtl(Number(env.TURN_TTL_SECONDS ?? 3600));
  const expirySeconds = Math.floor(nowMs / 1000) + ttl;
  const username = `${expirySeconds}:${sanitizeUserId(userId)}`;
  const credential = createHmac('sha1', secret).update(username).digest('base64');
  iceServers.push({ urls: turnUrl, username, credential });

  return { iceServers, expiresAt: new Date(expirySeconds * 1000).toISOString() };
}

function clampTtl(value: number): number {
  if (!Number.isFinite(value)) return 3600;
  return Math.max(300, Math.min(86_400, Math.floor(value)));
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 96) || 'user';
}
