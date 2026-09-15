import { io, type Socket } from 'socket.io-client';
import { playerSnapshotSchema, socketEvents, type AvatarConfig, type PlayerSnapshot, type VoiceMode } from '@together/shared';

export type NetworkSession = {
  userId: string;
  householdId: string;
  accessToken?: string;
  shardId?: string;
};

export type RemoteProfile = { displayName: string; avatarConfig: AvatarConfig };

export type HouseholdSnapshotPayload = {
  household: { id: string; inviteCode?: string; name?: string };
  onlineMembers: Array<{ userId: string; snapshot?: PlayerSnapshot; profile?: RemoteProfile }>;
};

export type NetworkCallbacks = {
  onConnectionState?: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  onHouseholdSnapshot?: (snapshot: HouseholdSnapshotPayload) => void;
  onPlayerSnapshot?: (userId: string, snapshot: PlayerSnapshot) => void;
  onPlayerProfile?: (userId: string, profile: RemoteProfile) => void;
  onPlayerLeave?: (userId: string) => void;
  onError?: (message: string) => void;
  onVoiceJoin?: (payload: { userId?: string; peers?: string[]; mode: Exclude<VoiceMode, 'off'> }) => void;
  onVoiceOffer?: (payload: { sourceUserId: string; sdp: string; mode: Exclude<VoiceMode, 'off'> }) => void;
  onVoiceAnswer?: (payload: { sourceUserId: string; sdp: string }) => void;
  onVoiceIce?: (payload: { sourceUserId: string; candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }) => void;
  onVoiceMuteState?: (payload: { userId: string; muted: boolean }) => void;
  onVoiceLeave?: (userId: string) => void;
};

export class GameSocketClient {
  private socket: Socket | null = null;

  constructor(
    private readonly session: NetworkSession,
    private readonly callbacks: NetworkCallbacks = {},
  ) {}

  connect(): void {
    if (this.socket) return;
    this.callbacks.onConnectionState?.('connecting');
    const url = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 700,
      timeout: 10_000,
      auth: {
        ...(this.session.accessToken ? { accessToken: this.session.accessToken } : {}),
        ...(!this.session.accessToken ? { devUserId: this.session.userId } : {}),
      },
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.callbacks.onConnectionState?.('connected');
      socket.emit(socketEvents.playerJoin, {
        householdId: this.session.householdId,
        cityId: 'amaya_bay',
        shardId: this.session.shardId ?? '0:0',
      });
    });
    socket.io.on('reconnect_attempt', () => this.callbacks.onConnectionState?.('reconnecting'));
    socket.on('disconnect', () => this.callbacks.onConnectionState?.('disconnected'));
    socket.on('connect_error', (error) => this.callbacks.onError?.(error.message));
    socket.on(socketEvents.systemError, (payload: unknown) => {
      const value = payload as { message?: unknown };
      this.callbacks.onError?.(typeof value?.message === 'string' ? value.message : 'Network action failed');
    });
    socket.on(socketEvents.householdSnapshot, (payload: HouseholdSnapshotPayload) => {
      this.callbacks.onHouseholdSnapshot?.(payload);
      for (const member of payload.onlineMembers ?? []) {
        if (member.profile) this.callbacks.onPlayerProfile?.(member.userId, member.profile);
        if (member.snapshot) this.callbacks.onPlayerSnapshot?.(member.userId, member.snapshot);
      }
    });
    socket.on(socketEvents.playerJoin, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { userId?: unknown; profile?: unknown };
      if (typeof value.userId !== 'string' || !value.profile || typeof value.profile !== 'object') return;
      const profile = value.profile as RemoteProfile;
      if (typeof profile.displayName === 'string' && profile.avatarConfig) this.callbacks.onPlayerProfile?.(value.userId, profile);
    });
    socket.on(socketEvents.playerSnapshot, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { userId?: unknown; snapshot?: unknown };
      if (typeof value.userId !== 'string') return;
      const parsed = playerSnapshotSchema.safeParse(value.snapshot);
      if (parsed.success) this.callbacks.onPlayerSnapshot?.(value.userId, parsed.data);
    });
    socket.on(socketEvents.voiceJoin, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { userId?: unknown; peers?: unknown; mode?: unknown };
      if (value.mode !== 'household' && value.mode !== 'proximity') return;
      const peers = Array.isArray(value.peers) ? value.peers.filter((peer): peer is string => typeof peer === 'string') : undefined;
      const userId = typeof value.userId === 'string' ? value.userId : undefined;
      this.callbacks.onVoiceJoin?.({ ...(userId ? { userId } : {}), ...(peers ? { peers } : {}), mode: value.mode });
    });
    socket.on(socketEvents.voiceOffer, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { sourceUserId?: unknown; sdp?: unknown; mode?: unknown };
      if (typeof value.sourceUserId === 'string' && typeof value.sdp === 'string' && (value.mode === 'household' || value.mode === 'proximity')) {
        this.callbacks.onVoiceOffer?.({ sourceUserId: value.sourceUserId, sdp: value.sdp, mode: value.mode });
      }
    });
    socket.on(socketEvents.voiceAnswer, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { sourceUserId?: unknown; sdp?: unknown };
      if (typeof value.sourceUserId === 'string' && typeof value.sdp === 'string') this.callbacks.onVoiceAnswer?.({ sourceUserId: value.sourceUserId, sdp: value.sdp });
    });
    socket.on(socketEvents.voiceIce, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { sourceUserId?: unknown; candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown };
      if (typeof value.sourceUserId === 'string' && typeof value.candidate === 'string') this.callbacks.onVoiceIce?.({
        sourceUserId: value.sourceUserId,
        candidate: value.candidate,
        sdpMid: typeof value.sdpMid === 'string' ? value.sdpMid : null,
        sdpMLineIndex: typeof value.sdpMLineIndex === 'number' ? value.sdpMLineIndex : null,
      });
    });
    socket.on(socketEvents.voiceMuteState, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const value = payload as { userId?: unknown; muted?: unknown };
      if (typeof value.userId === 'string' && typeof value.muted === 'boolean') this.callbacks.onVoiceMuteState?.({ userId: value.userId, muted: value.muted });
    });
    socket.on(socketEvents.voiceLeave, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const userId = (payload as { userId?: unknown }).userId;
      if (typeof userId === 'string') this.callbacks.onVoiceLeave?.(userId);
    });
    socket.on(socketEvents.playerLeave, (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const userId = (payload as { userId?: unknown }).userId;
      if (typeof userId === 'string') this.callbacks.onPlayerLeave?.(userId);
    });
  }

  joinVoice(mode: Exclude<VoiceMode, 'off'>): void {
    this.socket?.emit(socketEvents.voiceJoin, { mode });
  }

  leaveVoice(): void { this.socket?.emit(socketEvents.voiceLeave); }
  sendVoiceOffer(targetUserId: string, sdp: string, mode: Exclude<VoiceMode, 'off'>): void { this.socket?.emit(socketEvents.voiceOffer, { targetUserId, sdp, mode }); }
  sendVoiceAnswer(targetUserId: string, sdp: string): void { this.socket?.emit(socketEvents.voiceAnswer, { targetUserId, sdp }); }
  sendVoiceIce(targetUserId: string, candidate: RTCIceCandidate): void {
    this.socket?.emit(socketEvents.voiceIce, { targetUserId, candidate: candidate.candidate, sdpMid: candidate.sdpMid, sdpMLineIndex: candidate.sdpMLineIndex });
  }
  sendVoiceMuteState(muted: boolean): void { this.socket?.emit(socketEvents.voiceMuteState, { muted }); }

  sendSnapshot(snapshot: PlayerSnapshot): void {
    if (!this.socket?.connected) return;
    this.socket.emit(socketEvents.playerSnapshot, snapshot);
  }

  disconnect(): void {
    if (!this.socket) return;
    if (this.socket.connected) this.socket.emit(socketEvents.playerLeave);
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.callbacks.onConnectionState?.('disconnected');
  }
}
