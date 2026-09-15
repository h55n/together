import { z } from 'zod';

const targetUserId = z.string().min(1).max(128);
const sdp = z.string().min(1).max(200_000);

export const voiceModeSchema = z.enum(['off', 'household', 'proximity']);
export type VoiceMode = z.infer<typeof voiceModeSchema>;

export const voiceOfferSchema = z.object({
  targetUserId,
  sdp,
  mode: z.enum(['household', 'proximity']),
}).strict();

export const voiceAnswerSchema = z.object({
  targetUserId,
  sdp,
}).strict();

export const voiceIceSchema = z.object({
  targetUserId,
  candidate: z.string().min(1).max(16_000),
  sdpMid: z.string().max(128).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(32).nullable().optional(),
}).strict();

export const voiceMuteStateSchema = z.object({ muted: z.boolean() }).strict();

export type VoiceOffer = z.infer<typeof voiceOfferSchema>;
export type VoiceAnswer = z.infer<typeof voiceAnswerSchema>;
export type VoiceIce = z.infer<typeof voiceIceSchema>;

export type VoiceIceServerConfig = {
  urls: string;
  username?: string;
  credential?: string;
};

export function buildVoiceIceServers(config: {
  stunUrl?: string | undefined;
  turnUrl?: string | undefined;
  turnUsername?: string | undefined;
  turnCredential?: string | undefined;
}): VoiceIceServerConfig[] {
  const servers: VoiceIceServerConfig[] = [];
  if (config.stunUrl) servers.push({ urls: config.stunUrl });
  if (config.turnUrl) {
    const turn: VoiceIceServerConfig = { urls: config.turnUrl };
    if (config.turnUsername) turn.username = config.turnUsername;
    if (config.turnCredential) turn.credential = config.turnCredential;
    servers.push(turn);
  }
  return servers;
}
