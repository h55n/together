/** Court-local x is the long axis; the existing park net lies at x=0. */
import { cityHeightAt } from '../world/terrain.js';
/** Engineered court plane clears the highest corner of the sloping park. */
export const BADMINTON_SURFACE_Y = Math.max(...[-6.5, 6.5].flatMap(x => [-3.05, 3.05].map(z => cityHeightAt(232 + x, 82 + z)))) + .08;
export type BadmintonSide = 0 | 1;
export type ShuttlePosition = { x: number; y: number; z: number };
export type BadmintonFlight = { from: ShuttlePosition; to: ShuttlePosition; startedAt: number; duration: number; lastHitBy: BadmintonSide; arc?: number };
export type BadmintonMatch = {
  revision: number; players: readonly [string, string | null]; phase: 'ready' | 'rally' | 'finished' | 'cancelled';
  score: readonly [number, number]; server: BadmintonSide; flight: BadmintonFlight | null;
  rallyHits: number; completedRallies: number; acceptedCommandIds: readonly string[]; updatedAt: number;
};
export type BadmintonCommand = { id: string; expectedRevision: number; kind: 'serve' | 'hit' | 'finish' | 'cancel'; aimZ?: number; depth?: number; loft?: number };
export const BADMINTON_COURT = { halfLength: 6.5, halfWidth: 3.05, netHeight: 1.55 } as const;
const opposite = (side: BadmintonSide): BadmintonSide => side === 0 ? 1 : 0;
const sideSign = (side: BadmintonSide): number => side === 0 ? -1 : 1;
const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const inCourt = (position: ShuttlePosition): boolean => Math.abs(position.x) <= BADMINTON_COURT.halfLength && Math.abs(position.z) <= BADMINTON_COURT.halfWidth;
const withinReach = (position: ShuttlePosition, side: BadmintonSide): boolean => inCourt(position) && position.x * sideSign(side) >= 1.5 && position.y >= 0.45 && position.y <= 3.6;

export function createBadmintonMatch(userId: string, now: number, opponentId: string | null = null): BadmintonMatch {
  if (!userId.trim() || (opponentId !== null && !opponentId.trim()) || opponentId === userId || !Number.isFinite(now)) throw new Error('Invalid badminton players or clock');
  return { revision: 0, players: [userId, opponentId], phase: 'ready', score: [0, 0], server: 0, flight: null, rallyHits: 0, completedRallies: 0, acceptedCommandIds: [], updatedAt: now };
}

export function badmintonShuttlePosition(flight: BadmintonFlight, now: number): ShuttlePosition {
  const t = clamp((now - flight.startedAt) / flight.duration, 0, 1);
  return { x: flight.from.x + (flight.to.x - flight.from.x) * t, z: flight.from.z + (flight.to.z - flight.from.z) * t,
    y: flight.from.y * (1 - t) + flight.to.y * t + (flight.arc ?? 3.6) * 4 * t * (1 - t) };
}

function launch(from: ShuttlePosition, side: BadmintonSide, now: number, aimZ: number, depth: number, arc = 3.6): BadmintonFlight {
  return { from, to: { x: sideSign(opposite(side)) * depth, y: 0, z: aimZ }, startedAt: now, duration: 2600, lastHitBy: side, arc };
}

function point(match: BadmintonMatch, winner: BadmintonSide, now: number): BadmintonMatch {
  const score: [number, number] = [...match.score]; score[winner] += 1;
  return { ...match, revision: match.revision + 1, phase: 'ready', score, server: winner, flight: null,
    completedRallies: match.completedRallies + 1, updatedAt: now };
}

/** Call only with trusted server time. Sampling rendering never mutates match state. */
export function advanceBadmintonClock(match: BadmintonMatch, now: number): BadmintonMatch {
  if (!Number.isFinite(now) || now < match.updatedAt) throw new Error('Invalid badminton clock');
  const flight = match.flight;
  if (match.phase !== 'rally' || !flight) return match;
  const landingAt = flight.startedAt + flight.duration;
  const netT = -flight.from.x / (flight.to.x - flight.from.x);
  const netAt = flight.startedAt + flight.duration * netT;
  if (netT > 0 && netT < 1 && now >= netAt && badmintonShuttlePosition(flight, netAt).y < BADMINTON_COURT.netHeight) return point(match, opposite(flight.lastHitBy), now);
  // NPC contact uses its historical contact time even after a delayed update.
  const receiver = opposite(flight.lastHitBy);
  const npcAt = flight.startedAt + flight.duration * 0.78;
  if (match.players[receiver] === null && now >= npcAt && inCourt(flight.to) && withinReach(badmintonShuttlePosition(flight, npcAt), receiver)) {
    const contact = badmintonShuttlePosition(flight, npcAt);
    const target = Math.sin(match.completedRallies * 1.73 + match.rallyHits * 2.1) * 2.1;
    // The next receiver is human, so this recursion has a maximum depth of one.
    return advanceBadmintonClock({ ...match, revision: match.revision + 1, flight: launch(contact, receiver, npcAt, target, 5.1), rallyHits: match.rallyHits + 1, updatedAt: now }, now);
  }
  if (now < landingAt) return now === match.updatedAt ? match : { ...match, updatedAt: now };
  const outside = Math.abs(flight.to.x) > BADMINTON_COURT.halfLength || Math.abs(flight.to.z) > BADMINTON_COURT.halfWidth;
  return point(match, outside ? opposite(flight.lastHitBy) : flight.lastHitBy, now);
}

/** Transport retries replay the same accepted command without awarding another point. */
export function commandBadminton(match: BadmintonMatch, userId: string, command: BadmintonCommand, now: number): BadmintonMatch {
  const side = match.players[0] === userId ? 0 : match.players[1] === userId ? 1 : -1;
  if (side === -1) throw new Error('Join this badminton match before playing');
  if (typeof command.id !== 'string' || !command.id.trim() || command.id.length > 128 || !['serve', 'hit', 'finish', 'cancel'].includes(command.kind)) throw new Error('Invalid badminton command');
  if (!Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0) throw new Error('Invalid badminton revision');
  if (match.acceptedCommandIds.includes(command.id)) return match;
  if (command.expectedRevision !== match.revision) throw new Error('Badminton state changed; refresh before playing');
  if (!Number.isFinite(now) || now < match.updatedAt) throw new Error('Invalid badminton clock');
  if (match.phase === 'finished' || match.phase === 'cancelled') throw new Error('Badminton match has ended');
  let next = advanceBadmintonClock(match, now);
  if (command.kind === 'cancel') next = { ...next, phase: 'cancelled', flight: null };
  else if (command.kind === 'finish') {
    if (next.phase !== 'ready' || next.completedRallies < 1) throw new Error('Finish after the current rally');
    next = { ...next, phase: 'finished', flight: null };
  } else {
    const aim = command.aimZ ?? 0; const depth = command.depth ?? 5.1; const loft = command.loft ?? 3.6;
    if (!Number.isFinite(aim) || !Number.isFinite(depth) || !Number.isFinite(loft) || Math.abs(aim) > 4 || depth < 2 || depth > 7.5 || loft < 0.1 || loft > 4) throw new Error('Invalid badminton aim');
    let from: ShuttlePosition;
    if (command.kind === 'serve') {
      if (next.phase !== 'ready' || (next.server !== side && next.players[next.server] !== null)) throw new Error('Wait for your serve');
      // The human deliberately invites the NPC's next serve, leaving time to finish.
      from = { x: sideSign(next.server) * 4, y: 1.2, z: 0 };
      const npcServe = next.players[next.server] === null;
      next = { ...next, phase: 'rally', flight: launch(from, next.server, now, npcServe ? 0 : aim, npcServe ? 5.1 : depth, npcServe ? 3.6 : loft), rallyHits: 1 };
    } else {
      if (next.phase !== 'rally' || !next.flight || next.flight.lastHitBy === side) throw new Error('Wait for the shuttle');
      from = badmintonShuttlePosition(next.flight, now);
      if (!withinReach(from, side)) throw new Error('Shuttle is outside your reach');
      next = { ...next, phase: 'rally', flight: launch(from, side, now, aim, depth, loft), rallyHits: next.rallyHits + 1 };
    }
  }
  return { ...next, revision: next.revision + 1, updatedAt: now, acceptedCommandIds: [...next.acceptedCommandIds.slice(-127), command.id] };
}
