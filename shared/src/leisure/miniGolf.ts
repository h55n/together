import { cityHeightAt } from '../world/terrain.js';

export type GolfPoint = { x: number; z: number };
export type GolfHole = { index: number; center: GolfPoint; tee: GolfPoint; cup: GolfPoint; halfWidth: number; halfDepth: number };
export const GOLF_BALL_RADIUS = 0.11;
export const MINI_GOLF_HOLES: readonly GolfHole[] = Array.from({ length: 6 }, (_, index) => ({
  index, center: { x: 278 + (index % 3) * 9 - 9, z: 252 + Math.floor(index / 3) * 11 - 5 },
  tee: { x: -2.3, z: 0 }, cup: { x: 2.3, z: 0 }, halfWidth: 3.55, halfDepth: 1.55,
}));
export type GolfShot = { angle: number; power: number };
export type GolfTracePoint = GolfPoint & { seconds: number };
export type GolfShotResult = { ball: GolfPoint; captured: boolean; trace: GolfTracePoint[] };

function segmentDistance(a: GolfPoint, b: GolfPoint, target: GolfPoint): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.z - a.z) * dz) / lengthSquared)) : 0;
  return Math.hypot(a.x + t * dx - target.x, a.z + t * dz - target.z);
}

/** Deterministic solver shared by server authority and accepted-shot presentation. */
export function simulateGolfShot(hole: GolfHole, origin: GolfPoint, shot: GolfShot): GolfShotResult {
  if (![origin.x, origin.z, shot.angle, shot.power].every(Number.isFinite) || Math.abs(shot.angle) > Math.PI || shot.power <= 0 || shot.power > 1)
    throw new Error('Choose a finite direction and power above zero and at most one.');
  const width = hole.halfWidth - GOLF_BALL_RADIUS, depth = hole.halfDepth - GOLF_BALL_RADIUS;
  if (Math.abs(origin.x) > width || Math.abs(origin.z) > depth) throw new Error('Ball lies outside this hole.');
  const dt = 1 / 120;
  let ball = { ...origin };
  const speed = 0.35 + shot.power * 4.2;
  let vx = Math.cos(shot.angle) * speed, vz = Math.sin(shot.angle) * speed;
  const trace: GolfTracePoint[] = [{ ...ball, seconds: 0 }];
  let elapsed = 0;
  const height = (x: number, z: number) => cityHeightAt(hole.center.x + x, hole.center.z + z);
  // Numerical cap only: the player still chooses every subsequent stroke.
  for (let tick = 1; tick <= 120 * 12; tick++) {
    elapsed = tick * dt;
    const previous = { ...ball };
    const epsilon = 0.02;
    const ax = -2.8 * (height(ball.x + epsilon, ball.z) - height(ball.x - epsilon, ball.z)) / (2 * epsilon);
    const az = -2.8 * (height(ball.x, ball.z + epsilon) - height(ball.x, ball.z - epsilon)) / (2 * epsilon);
    vx += ax * dt; vz += az * dt;
    const magnitude = Math.hypot(vx, vz);
    const remaining = Math.max(0, magnitude - 0.85 * dt);
    if (magnitude) { vx *= remaining / magnitude; vz *= remaining / magnitude; }
    ball = { x: ball.x + vx * dt, z: ball.z + vz * dt };
    if (Math.abs(ball.x) > width) { ball.x = Math.sign(ball.x) * width; vx *= -0.62; }
    if (Math.abs(ball.z) > depth) { ball.z = Math.sign(ball.z) * depth; vz *= -0.62; }
    if (Math.hypot(vx, vz) <= 1.3 && segmentDistance(previous, ball, hole.cup) <= 0.12) {
      ball = { ...hole.cup }; trace.push({ ...ball, seconds: tick * dt });
      return { ball, captured: true, trace };
    }
    if (tick % 4 === 0) trace.push({ ...ball, seconds: tick * dt });
    if (Math.hypot(vx, vz) < 0.02 && Math.hypot(ax, az) < 0.85) break;
  }
  trace.push({ ...ball, seconds: elapsed });
  return { ball, captured: false, trace };
}

export type GolfShotIntent = GolfShot & { key: string; expectedRevision: number };
export type GolfShotReceipt = GolfShotIntent & { userId: string; hole: number; result: GolfShotResult };
export type GolfRound = {
  version: 1;
  players: string[];
  hole: number;
  revision: number;
  status: 'active' | 'complete';
  turn: string | null;
  balls: Record<string, GolfPoint>;
  strokes: Record<string, number[]>;
  captured: Record<string, boolean>;
  lastShot?: GolfShotReceipt;
};

/** Roster is fixed for the whole outing; later arrivals can spectate. */
export function createGolfRound(players: readonly string[]): GolfRound {
  if (players.length < 1 || players.length > 6 || new Set(players).size !== players.length ||
      players.some(player => typeof player !== 'string' || !player.trim() || player.length > 128))
    throw new Error('Choose one to six distinct players.');
  return {
    version: 1, players: [...players], hole: 0, revision: 0, status: 'active', turn: players[0]!,
    balls: Object.fromEntries(players.map(player => [player, { ...MINI_GOLF_HOLES[0]!.tee }])),
    strokes: Object.fromEntries(players.map(player => [player, Array<number>(6).fill(0)])),
    captured: Object.fromEntries(players.map(player => [player, false])),
  };
}

/** Pure authoritative transition. Persist the returned state before publishing it. */
export function acceptGolfShot(round: GolfRound, userId: string, intent: GolfShotIntent): GolfRound {
  if (!round.players.includes(userId)) throw new Error('Player is not in this round.');
  if (typeof intent.key !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(intent.key))
    throw new Error('Invalid shot key.');
  if (!Number.isSafeInteger(intent.expectedRevision) || intent.expectedRevision < 0)
    throw new Error('Invalid round revision.');
  const previous = round.lastShot;
  if (previous?.key === intent.key) {
    if (previous.userId !== userId || previous.expectedRevision !== intent.expectedRevision ||
        previous.angle !== intent.angle || previous.power !== intent.power)
      throw new Error('Shot key reused with different inputs.');
    return round;
  }
  if (intent.expectedRevision !== round.revision) throw new Error('Round changed; refresh before putting.');
  if (round.status !== 'active') throw new Error('Round is complete.');
  if (round.turn !== userId || round.captured[userId]) throw new Error('It is another player’s turn.');
  const hole = MINI_GOLF_HOLES[round.hole];
  if (!hole || !round.balls[userId]) throw new Error('Invalid golf state.');
  const result = simulateGolfShot(hole, round.balls[userId]!, intent);
  const strokes = { ...round.strokes, [userId]: [...round.strokes[userId]!] };
  strokes[userId]![round.hole] = strokes[userId]![round.hole]! + 1;
  const next: GolfRound = {
    ...round, revision: round.revision + 1, strokes,
    balls: { ...round.balls, [userId]: result.ball },
    captured: { ...round.captured, [userId]: result.captured },
    lastShot: { key: intent.key, expectedRevision: intent.expectedRevision, angle: intent.angle,
      power: intent.power, userId, hole: round.hole, result },
  };
  if (next.players.every(player => next.captured[player])) {
    if (next.hole === MINI_GOLF_HOLES.length - 1) {
      next.status = 'complete'; next.turn = null;
    } else {
      next.hole++;
      next.balls = Object.fromEntries(next.players.map(player => [player, { ...MINI_GOLF_HOLES[next.hole]!.tee }]));
      next.captured = Object.fromEntries(next.players.map(player => [player, false]));
      next.turn = next.players[0]!;
    }
  } else {
    const current = next.players.indexOf(userId);
    next.turn = Array.from({ length: next.players.length }, (_, offset) => next.players[(current + offset + 1) % next.players.length]!)
      .find(player => !next.captured[player])!;
  }
  return next;
}
