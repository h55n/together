import type { Server, Socket } from 'socket.io';
import {
  playerJoinSchema,
  playerSnapshotSchema,
  rooms,
  socketEvents,
  type PlayerSnapshot,
  voiceAnswerSchema,
  voiceIceSchema,
  voiceModeSchema,
  voiceMuteStateSchema,
  voiceOfferSchema,
} from '@together/shared';
import type { AuthService } from '../auth/AuthService.js';
import type { HouseholdService } from '../game/HouseholdService.js';
import type { TimeService } from '../game/TimeService.js';
import type { ProfileService } from '../game/ProfileService.js';
import type { UserProfileRecord } from '../db/GameRepository.js';
import { logger } from '../logging/logger.js';

type Presence = {
  socketId: string;
  userId: string;
  householdId: string;
  cityId: 'amaya_bay';
  shardId: string;
  snapshot?: PlayerSnapshot;
  profile?: UserProfileRecord;
};

export type SocketDependencies = {
  authService: AuthService;
  householdService: HouseholdService;
  timeService: TimeService;
  profileService: ProfileService;
};

function snapshotInsideAmayaBay(snapshot: PlayerSnapshot): boolean {
  const { x, y, z } = snapshot.position;
  return Math.abs(x) <= 520 && Math.abs(z) <= 520 && y >= -20 && y <= 140;
}

export function registerSocketServer(io: Server, dependencies: SocketDependencies): Map<string, Presence> {
  const online = new Map<string, Presence>();

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { accessToken?: string; devUserId?: string };
      const identity = await dependencies.authService.verifyAccessToken(auth.accessToken, auth.devUserId);
      socket.data.userId = identity.userId;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = String(socket.data.userId);
    socket.join(rooms.user(userId));
    socket.emit(socketEvents.timeSync, dependencies.timeService.snapshot());

    socket.on(socketEvents.playerJoin, async (raw) => {
      try {
        const join = playerJoinSchema.parse(raw);
        const household = await dependencies.householdService.getHouseholdForMember(join.householdId, userId);
        socket.join(rooms.household(join.householdId));
        socket.join(rooms.cityShard(join.cityId, join.shardId));
        const profile = await dependencies.profileService.getProfile(userId) ?? undefined;
        const presence: Presence = {
          socketId: socket.id,
          userId,
          householdId: join.householdId,
          cityId: join.cityId,
          shardId: join.shardId,
          ...(profile ? { profile } : {}),
        };
        online.set(userId, presence);
        socket.data.householdId = join.householdId;
        socket.emit(socketEvents.householdSnapshot, {
          household,
          onlineMembers: [...online.values()]
            .filter((member) => member.householdId === join.householdId && member.userId !== userId)
            .map(({ userId: memberId, snapshot, profile: memberProfile }) => ({ userId: memberId, ...(snapshot ? { snapshot } : {}), ...(memberProfile ? { profile: memberProfile } : {}) })),
        });
        socket.to(rooms.household(join.householdId)).emit(socketEvents.playerJoin, { userId, ...(profile ? { profile } : {}) });
      } catch (error) {
        socket.emit(socketEvents.systemError, {
          code: 'JOIN_REJECTED',
          message: error instanceof Error ? error.message : 'Unable to join household room',
        });
      }
    });

    socket.on(socketEvents.voiceJoin, (raw) => {
      const householdId = typeof socket.data.householdId === 'string' ? socket.data.householdId : undefined;
      if (!householdId) return;
      const mode = voiceModeSchema.safeParse((raw as { mode?: unknown } | undefined)?.mode);
      if (!mode.success || mode.data === 'off') return;
      socket.data.voiceMode = mode.data;
      socket.to(rooms.household(householdId)).emit(socketEvents.voiceJoin, { userId, mode: mode.data });
      const peers = [...online.values()].filter((presence) => presence.householdId === householdId && presence.userId !== userId).map((presence) => presence.userId);
      socket.emit(socketEvents.voiceJoin, { peers, mode: mode.data });
    });

    socket.on(socketEvents.voiceOffer, (raw) => {
      const parsed = voiceOfferSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(userId);
      const target = online.get(parsed.data.targetUserId);
      if (!source || !target || source.householdId !== target.householdId) return;
      io.to(target.socketId).emit(socketEvents.voiceOffer, { sourceUserId: userId, sdp: parsed.data.sdp, mode: parsed.data.mode });
    });

    socket.on(socketEvents.voiceAnswer, (raw) => {
      const parsed = voiceAnswerSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(userId);
      const target = online.get(parsed.data.targetUserId);
      if (!source || !target || source.householdId !== target.householdId) return;
      io.to(target.socketId).emit(socketEvents.voiceAnswer, { sourceUserId: userId, sdp: parsed.data.sdp });
    });

    socket.on(socketEvents.voiceIce, (raw) => {
      const parsed = voiceIceSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(userId);
      const target = online.get(parsed.data.targetUserId);
      if (!source || !target || source.householdId !== target.householdId) return;
      io.to(target.socketId).emit(socketEvents.voiceIce, {
        sourceUserId: userId,
        candidate: parsed.data.candidate,
        sdpMid: parsed.data.sdpMid ?? null,
        sdpMLineIndex: parsed.data.sdpMLineIndex ?? null,
      });
    });

    socket.on(socketEvents.voiceMuteState, (raw) => {
      const parsed = voiceMuteStateSchema.safeParse(raw);
      const householdId = typeof socket.data.householdId === 'string' ? socket.data.householdId : undefined;
      if (!parsed.success || !householdId) return;
      socket.to(rooms.household(householdId)).emit(socketEvents.voiceMuteState, { userId, muted: parsed.data.muted });
    });

    socket.on(socketEvents.voiceLeave, () => {
      const householdId = typeof socket.data.householdId === 'string' ? socket.data.householdId : undefined;
      if (!householdId) return;
      delete socket.data.voiceMode;
      socket.to(rooms.household(householdId)).emit(socketEvents.voiceLeave, { userId });
    });

    socket.on(socketEvents.playerSnapshot, (raw) => {
      const parsed = playerSnapshotSchema.safeParse(raw);
      const householdId = typeof socket.data.householdId === 'string' ? socket.data.householdId : undefined;
      if (!parsed.success || !householdId || !snapshotInsideAmayaBay(parsed.data)) return;
      const presence = online.get(userId);
      if (!presence) return;
      presence.snapshot = parsed.data;
      socket.to(rooms.household(householdId)).emit(socketEvents.playerSnapshot, {
        userId,
        snapshot: parsed.data,
      });
    });

    const leave = () => {
      const presence = online.get(userId);
      if (!presence) return;
      online.delete(userId);
      socket.to(rooms.household(presence.householdId)).emit(socketEvents.playerLeave, { userId });
      socket.to(rooms.household(presence.householdId)).emit(socketEvents.voiceLeave, { userId });
    };
    socket.on(socketEvents.playerLeave, leave);
    socket.on('disconnect', leave);
  });

  logger.info('socket gateway registered');
  return online;
}
