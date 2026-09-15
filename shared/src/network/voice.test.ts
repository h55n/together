import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceAnswerSchema, voiceIceSchema, voiceOfferSchema } from './voice.js';

test('voice signaling only accepts targeted bounded WebRTC descriptions', () => {
  assert.equal(voiceOfferSchema.parse({ targetUserId: 'b', sdp: 'v=0\r\n...', mode: 'household' }).mode, 'household');
  assert.equal(voiceAnswerSchema.safeParse({ targetUserId: '', sdp: 'x' }).success, false);
  assert.equal(voiceOfferSchema.safeParse({ targetUserId: 'b', sdp: 'x'.repeat(200_001), mode: 'proximity' }).success, false);
});

test('ICE signaling validates candidate payload shape without storing microphone data', () => {
  const parsed = voiceIceSchema.parse({ targetUserId: 'b', candidate: 'candidate:1 1 UDP 1 0.0.0.0 9 typ host', sdpMid: '0', sdpMLineIndex: 0 });
  assert.equal(parsed.targetUserId, 'b');
  assert.equal('audio' in parsed, false);
});

import { buildVoiceIceServers } from './voice.js';

test('voice ICE server configuration omits undefined TURN credentials', () => {
  assert.deepEqual(buildVoiceIceServers({ stunUrl: 'stun:example.org:3478' }), [
    { urls: 'stun:example.org:3478' },
  ]);
  assert.deepEqual(buildVoiceIceServers({ turnUrl: 'turn:example.org:3478' }), [
    { urls: 'turn:example.org:3478' },
  ]);
  assert.deepEqual(buildVoiceIceServers({ turnUrl: 'turn:example.org:3478', turnUsername: 'u', turnCredential: 'p' }), [
    { urls: 'turn:example.org:3478', username: 'u', credential: 'p' },
  ]);
});
