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

export type RemoteProfile = Pick<UserProfileRecord, 'displayName' | 'avatarConfig'>;

type Presence = {
  socketId: string;
  userId: string;
  householdId: string;
  cityId: 'amaya_bay';
  shardId: string;
  snapshot?: PlayerSnapshot;
  profile?: RemoteProfile;
};

export type SocketDependencies = {
  authService: AuthService;
  householdService: HouseholdService;
  timeService: TimeService;
  profileService: ProfileService;
};

export function projectRemoteProfile(profile: UserProfileRecord): RemoteProfile {
  return { displayName: profile.displayName, avatarConfig: profile.avatarConfig };
}

function snapshotInsideAmayaBay(snapshot: PlayerSnapshot): boolean {
  const { x, y, z } = snapshot.position;
  return Math.abs(x) <= 520 && Math.abs(z) <= 520 && y >= -20 && y <= 140;
}

export function registerSocketServer(io: Server, dependencies: SocketDependencies): Map<string, Presence> {
  // Presence is session/socket scoped. Multiple tabs or devices from one user may
  // coexist without overwriting each other's transport/voice state.
  const online = new Map<string, Presence>();

  const firstPresenceForUser = (userId: string, householdId?: string): Presence | undefined =>
    [...online.values()].find((presence) => presence.userId === userId && (!householdId || presence.householdId === householdId));

  const hasOtherPresence = (socketId: string, userId: string, householdId: string): boolean =>
    [...online.values()].some((presence) => presence.socketId !== socketId && presence.userId === userId && presence.householdId === householdId);

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
        const previous = online.get(socket.id);
        if (previous) {
          socket.leave(rooms.household(previous.householdId));
          socket.leave(rooms.cityShard(previous.cityId, previous.shardId));
          online.delete(socket.id);
          if (!hasOtherPresence(socket.id, userId, previous.householdId)) {
            socket.to(rooms.household(previous.householdId)).emit(socketEvents.playerLeave, { userId });
            socket.to(rooms.household(previous.householdId)).emit(socketEvents.voiceLeave, { userId });
          }
        }

        socket.join(rooms.household(join.householdId));
        socket.join(rooms.cityShard(join.cityId, join.shardId));
        const storedProfile = await dependencies.profileService.getProfile(userId);
        const profile = storedProfile ? projectRemoteProfile(storedProfile) : undefined;
        const presence: Presence = {
          socketId: socket.id,
          userId,
          householdId: join.householdId,
          cityId: join.cityId,
          shardId: join.shardId,
          ...(profile ? { profile } : {}),
        };
        online.set(socket.id, presence);
        socket.data.householdId = join.householdId;
        socket.data.shardId = join.shardId;

        const membersByUser = new Map<string, { userId: string; snapshot?: PlayerSnapshot; profile?: RemoteProfile }>();
        for (const member of online.values()) {
          if (member.householdId !== join.householdId || member.userId === userId) continue;
          const existing = membersByUser.get(member.userId);
          membersByUser.set(member.userId, {
            userId: member.userId,
            ...(member.snapshot ?? existing?.snapshot ? { snapshot: member.snapshot ?? existing?.snapshot } : {}),
            ...(member.profile ?? existing?.profile ? { profile: member.profile ?? existing?.profile } : {}),
          });
        }
        socket.emit(socketEvents.householdSnapshot, { household, onlineMembers: [...membersByUser.values()] });
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
      const peers = [...new Set([...online.values()]
        .filter((presence) => presence.householdId === householdId && presence.userId !== userId)
        .map((presence) => presence.userId))];
      socket.emit(socketEvents.voiceJoin, { peers, mode: mode.data });
    });

    socket.on(socketEvents.voiceOffer, (raw) => {
      const parsed = voiceOfferSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(socket.id);
      const target = firstPresenceForUser(parsed.data.targetUserId, source?.householdId);
      if (!source || !target || source.householdId !== target.householdId) return;
      io.to(target.socketId).emit(socketEvents.voiceOffer, { sourceUserId: userId, sdp: parsed.data.sdp, mode: parsed.data.mode });
    });

    socket.on(socketEvents.voiceAnswer, (raw) => {
      const parsed = voiceAnswerSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(socket.id);
      const target = firstPresenceForUser(parsed.data.targetUserId, source?.householdId);
      if (!source || !target || source.householdId !== target.householdId) return;
      io.to(target.socketId).emit(socketEvents.voiceAnswer, { sourceUserId: userId, sdp: parsed.data.sdp });
    });

    socket.on(socketEvents.voiceIce, (raw) => {
      const parsed = voiceIceSchema.safeParse(raw);
      if (!parsed.success) return;
      const source = online.get(socket.id);
      const target = firstPresenceForUser(parsed.data.targetUserId, source?.householdId);
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
      const presence = online.get(socket.id);
      if (!presence) return;
      presence.snapshot = parsed.data;
      socket.to(rooms.household(householdId)).emit(socketEvents.playerSnapshot, {
        userId,
        snapshot: parsed.data,
      });
    });

    const leave = () => {
      const presence = online.get(socket.id);
      if (!presence) return;
      online.delete(socket.id);
      socket.leave(rooms.household(presence.householdId));
      socket.leave(rooms.cityShard(presence.cityId, presence.shardId));
      delete socket.data.householdId;
      delete socket.data.shardId;
      if (hasOtherPresence(socket.id, userId, presence.householdId)) return;
      socket.to(rooms.household(presence.householdId)).emit(socketEvents.playerLeave, { userId });
      socket.to(rooms.household(presence.householdId)).emit(socketEvents.voiceLeave, { userId });
    };
    socket.on(socketEvents.playerLeave, leave);
    socket.on('disconnect', leave);
  });

  logger.info('socket gateway registered');
  return online;
}
