import { acceptBoardGameCommand, createBoardGame, type BoardGameCommand, acceptGolfShot, advanceBadmintonClock, commandBadminton, createBadmintonMatch, createGolfRound, activityParticipantLimit, advanceActivityState, createActivityState, joinActivityState, type ActivityId, type BadmintonCommand, type GolfShotIntent, activityAllowedInWeather, AMAYA_BAY_VENUES, type WeatherState } from '@together/shared';
import type { ActivitySessionRecord, GameRepository, HouseholdRecord } from '../db/GameRepository.js';
import { createPicnicState, createCafeState, acceptPicnicCommand, acceptCafeCommand, type PicnicCommand, type CafeCommand } from '@together/shared';
import { createTransportRentalState, joinTransportRentalState, acceptTransportRentalCommand, isTransportRentalActivity, type TransportRentalCommand } from '@together/shared';
import { PICNIC_PROVISIONS, cookedDishItemId, CAFE_MENU, cafeDrinkItemId } from '@together/shared';
import type { InventoryService } from './InventoryService.js';
import { TransportLeaseAuthority } from './TransportLeaseAuthority.js';

export class ActivityService {
  private readonly sessionMutationTails = new Map<string, Promise<void>>();
  readonly transportLeaseAuthority = new TransportLeaseAuthority();

  constructor(private readonly repository: GameRepository, private readonly environment: { environment(): { gameMinute: number; weather: WeatherState } } = { environment: () => ({ gameMinute: 8 * 60, weather: 'clear' }) }, private readonly inventory?: InventoryService) {}

  async warmTransportAuthority(householdId: string, userId: string): Promise<void> {
    await this.authorize(householdId, userId);
    for (const session of await this.repository.listActivitySessions(householdId)) this.transportLeaseAuthority.apply(session);
  }

  async start(householdId: string, userId: string, activityId: ActivityId, idempotencyKey: string): Promise<ActivitySessionRecord> {
    if (idempotencyKey.length < 8) throw new Error('Invalid idempotency key');
    await this.authorize(householdId, userId);
    const existing = await this.repository.getActivitySessionByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.householdId !== householdId || existing.activityId !== activityId || !existing.state.participants.includes(userId)) {
        throw new Error('Idempotency key belongs to a different activity request');
      }
      return existing;
    }
    const now = new Date().toISOString();
    const session: ActivitySessionRecord = {
      id: crypto.randomUUID(), idempotencyKey, householdId, activityId,
      state: { ...createActivityState(activityId, userId), revision: 0,
        ...(activityId === 'board_game' ? { boardGame: createBoardGame([userId], Date.now()) } : {}),
        ...(activityId === 'mini_golf' ? { golf: createGolfRound([userId]) } : {}),
        ...(activityId === 'badminton' ? { badminton: createBadmintonMatch(userId, Date.parse(now)) } : {}),
        ...(activityId === 'picnic' ? { picnic: createPicnicState([userId]) } : {}),
        ...(activityId === 'cafe_hangout' ? { cafe: createCafeState([userId]) } : {}),
      }, createdAt: now, updatedAt: now,
    };
    if (isTransportRentalActivity(activityId)) session.state.transportRental = createTransportRentalState({ sessionId: session.id, activityId, participants: [userId] });
    const saved = await this.repository.insertActivitySession(session);
    if (saved.householdId !== householdId || saved.activityId !== activityId || !saved.state.participants.includes(userId)) throw new Error('Idempotency key belongs to a different activity request');
    return saved;
  }

  async join(sessionId: string, userId: string): Promise<ActivitySessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.requireSession(sessionId);
      await this.authorize(session.householdId, userId);
      const revision = session.state.revision ?? 0;
      session.state = joinActivityState(session.state, userId, activityParticipantLimit(session.activityId)[1]);
      if (session.state.picnic) session.state.picnic = { ...session.state.picnic, participants: [...session.state.participants] };
      if (session.state.cafe) session.state.cafe = { ...session.state.cafe, participants: [...session.state.participants] };
      if (session.state.transportRental) session.state.transportRental = joinTransportRentalState(session.state.transportRental, userId);
      if (session.state.boardGame && !session.state.boardGame.players.includes(userId)) {
        if (session.state.boardGame.revision !== 0) throw new Error('This game has started; join the next game');
        session.state.boardGame = createBoardGame(session.state.participants, session.state.boardGame.seed);
      }
      if (session.state.golf && !session.state.golf.players.includes(userId)) {
        if (session.state.golf.revision !== 0) throw new Error('This round has started; join the next round');
        session.state.golf = createGolfRound(session.state.participants);
      }
      if (session.state.badminton && !session.state.badminton.players.includes(userId)) {
        if (session.state.badminton.revision !== 0) throw new Error('This match has started; join the next match');
        session.state.badminton = createBadmintonMatch(session.state.participants[0]!, Date.now(), userId);
      }
      session.updatedAt = new Date().toISOString();
      await this.persist(session, revision);
      return session;
    });
  }

  async advance(sessionId: string, userId: string, stepId: string): Promise<ActivitySessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.requireSession(sessionId);
      await this.authorize(session.householdId, userId);
      if (isTransportRentalActivity(session.activityId)) throw new Error('Use rental commands to depart and return equipment');
      if (!session.state.participants.includes(userId)) throw new Error('Join this activity before taking a turn');
      if (session.activityId === 'mini_golf' || session.activityId === 'badminton' || session.activityId === 'board_game') throw new Error('Use sports commands to play this activity');
      if (session.activityId === 'picnic' || session.activityId === 'cafe_hangout') throw new Error('Use leisure commands to play this activity');
      if (session.activityId === 'photography' && stepId === 'capture') throw new Error('Use photography capture to save a real photo');
      const revision = session.state.revision ?? 0;
      const [minimumParticipants] = activityParticipantLimit(session.activityId);
      if (session.state.participants.length < minimumParticipants) {
        throw new Error(`This activity requires at least ${minimumParticipants} household members`);
      }
      session.state = advanceActivityState(session.state, stepId);
      session.updatedAt = new Date().toISOString();
      await this.persist(session, revision);
      return session;
    });
  }

  async list(householdId: string, userId: string): Promise<ActivitySessionRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listActivitySessions(householdId);
  }

  async startSports(sessionId: string, userId: string): Promise<ActivitySessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.requireSession(sessionId);
      await this.authorize(session.householdId, userId);
      if (!session.state.participants.includes(userId)) throw new Error('Join this activity before playing');
      if (session.state.status === 'complete') return session;
      if (session.state.golf || session.state.badminton || session.state.boardGame || session.state.picnic || session.state.cafe) return session;
      const revision = session.state.revision ?? 0;
      if (isTransportRentalActivity(session.activityId)) session.state.transportRental ??= createTransportRentalState({ sessionId: session.id, activityId: session.activityId, participants: session.state.participants });
      else if (session.activityId === 'mini_golf') session.state.golf = createGolfRound(session.state.participants);
      else if (session.activityId === 'badminton') session.state.badminton = createBadmintonMatch(session.state.participants[0]!, Date.now(), session.state.participants[1] ?? null);
      else if (session.activityId === 'board_game') session.state.boardGame = createBoardGame(session.state.participants, Date.now());
      else if (session.activityId === 'picnic') session.state.picnic = createPicnicState(session.state.participants);
      else if (session.activityId === 'cafe_hangout') session.state.cafe = createCafeState(session.state.participants);
      else throw new Error('Wrong sports activity');
      session.state.completedStepIds = [];
      await this.persist(session, revision);
      return session;
    });
  }

  async boardGameCommand(sessionId: string, userId: string, command: BoardGameCommand): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'board_game', command.key, JSON.stringify(command), session => {
      if (!session.state.boardGame) session.state.boardGame = createBoardGame(session.state.participants, Date.now());
      session.state.boardGame = acceptBoardGameCommand(session.state.boardGame, userId, command);
      session.state.completedStepIds = session.state.boardGame.phase === 'complete' ? ['deal', 'play_round', 'pack_away'] : ['deal'];
      if (session.state.boardGame.phase === 'complete') session.state.status = 'complete';
    });
  }

  async picnicCommand(sessionId: string, userId: string, command: PicnicCommand): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'picnic', command.key, JSON.stringify(command), async session => {
      const state = session.state.picnic ?? createPicnicState(session.state.participants);
      const next = acceptPicnicCommand(state, userId, session.state.participants, command);
      // Validate first so a stale or invalid command never spends groceries; the keyed spend is replay-safe if the save is retried.
      if (command.kind === 'bring_food' && this.inventory) {
        const key = `picnic-food-${session.id}-${command.key}`, metadata = { sessionId: session.id, food: command.food };
        // Home-cooked food goes first; raw groceries cover anything not yet cooked. One key, so a retry replays whichever was spent.
        try { await this.inventory.consumeProvisions(session.householdId, userId, [{ itemId: cookedDishItemId(command.food), quantity: 1 }], key, metadata, `picnic:${command.food}`); }
        catch (cause) {
          if (!(cause instanceof Error) || !cause.message.startsWith('Missing ingredients')) throw cause;
          await this.inventory.consumeProvisions(session.householdId, userId, PICNIC_PROVISIONS[command.food], key, metadata, `picnic:${command.food}`);
        }
      }
      session.state.picnic = next;
      if (session.state.picnic.phase === 'finished') session.state.status = 'complete';
    });
  }

  async rentalCommand(sessionId: string, userId: string, command: TransportRentalCommand): Promise<ActivitySessionRecord> {
    const requested = await this.requireSession(sessionId);
    if (!isTransportRentalActivity(requested.activityId)) throw new Error('This activity has no rental equipment');
    const activityId = requested.activityId;
    const saved = await this.sportsMutation(sessionId, userId, activityId, command.key, JSON.stringify(command), async session => {
      if (session.state.status === 'complete') throw new Error('This outing has ended; begin a new outing');
      if (activityId === 'kayak' && (command.kind === 'rent' || command.kind === 'depart')) this.assertKayakConditions();
      const state = session.state.transportRental ?? createTransportRentalState({ sessionId: session.id, activityId, participants: session.state.participants });
      const history = command.kind === 'rent' ? await this.repository.listActivitySessions(session.householdId) : [];
      if (command.kind === 'rent' && history.some(previous => previous.id !== session.id && previous.state.transportRental?.rentals.some(rental => rental.ownerUserId === userId && rental.status !== 'returned'))) throw new Error('Return your saved equipment before renting another');
      const priorKayakSafetyAcknowledged = history.some(previous => previous.state.transportRental?.rentals.some(rental => rental.ownerUserId === userId && rental.mode === 'kayak' && rental.safetyAcknowledged));
      session.state.transportRental = acceptTransportRentalCommand(state, userId, command, { priorKayakSafetyAcknowledged });
      const rentals = session.state.transportRental.rentals;
      if (rentals.length > 0 && rentals.every(rental => rental.status === 'returned')) session.state.status = 'complete';
    });
    this.transportLeaseAuthority.apply(saved);
    return saved;
  }

  private assertKayakConditions(): void {
    const venue = AMAYA_BAY_VENUES.find(candidate => candidate.id === 'kayak_cove');
    if (!venue) throw new Error('Kayak rental hours are not configured');
    const toMinute = (value: string) => {
      const [hour, minute] = value.split(':').map(Number);
      return hour! * 60 + minute!;
    };
    const { gameMinute, weather } = this.environment.environment();
    const open = toMinute(venue.open), close = toMinute(venue.close);
    if (!Number.isFinite(gameMinute) || gameMinute < open || gameMinute >= close) {
      throw new Error(`Kayak rental is closed; hours are ${venue.open}–${venue.close}`);
    }
    if (!activityAllowedInWeather('kayak', weather)) throw new Error('Kayak rental is closed in dangerous weather');
  }

  async cafeCommand(sessionId: string, userId: string, command: CafeCommand): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'cafe_hangout', command.key, JSON.stringify(command), async session => {
      const state = session.state.cafe ?? createCafeState(session.state.participants);
      const target = command.kind === 'serve_drink' || command.kind === 'sip_drink'
        ? state.orders.find(item => item.id === command.orderId)
        : undefined;
      session.state.cafe = acceptCafeCommand(state, userId, session.state.participants, command);
      if (session.state.cafe.phase === 'finished') session.state.status = 'complete';
      if (!this.inventory || !target) return;
      if (command.kind === 'serve_drink') {
        await this.inventory.purchaseCafeDrink(session.householdId, target.orderedBy, {
          itemId: cafeDrinkItemId(target.drink), price: CAFE_MENU[target.drink],
          idempotencyKey: `cafe-drink-${session.id}-${command.key}`.slice(0, 128),
          metadata: { sessionId: session.id, orderId: target.id, servedTo: command.recipientId },
        });
      } else if (command.kind === 'sip_drink') {
        await this.inventory.consumeProvisions(session.householdId, userId, [{ itemId: cafeDrinkItemId(target.drink), quantity: 1 }],
          `cafe-sip-${session.id}-${command.key}`.slice(0, 128), { sessionId: session.id, orderId: target.id }, `cafe:${target.drink}`);
      }
    });
  }

  async golfShot(sessionId: string, userId: string, intent: GolfShotIntent): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'mini_golf', intent.key, JSON.stringify(intent), session => {
      if (!session.state.golf) session.state.golf = createGolfRound(session.state.participants);
      session.state.golf = acceptGolfShot(session.state.golf, userId, intent);
      if (session.state.golf.status === 'complete') {
        session.state.status = 'complete';
        session.state.completedStepIds = ['line_up', 'putt', 'walk_on'];
      }
    });
  }

  async badmintonCommand(sessionId: string, userId: string, command: BadmintonCommand): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'badminton', command.id, JSON.stringify(command), session => {
      if (!session.state.badminton) session.state.badminton = createBadmintonMatch(session.state.participants[0]!, Date.now(), session.state.participants[1] ?? null);
      session.state.badminton = commandBadminton(session.state.badminton, userId, command, Date.now());
      this.projectBadminton(session);
    });
  }

  async sportsSnapshot(sessionId: string, userId: string): Promise<ActivitySessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.requireSession(sessionId);
      await this.authorize(session.householdId, userId);
      // Active household members may watch; mutation paths still enforce the roster.
      if (session.state.badminton) {
        const revision = session.state.revision ?? 0;
        const previous = session.state.badminton;
        session.state.badminton = advanceBadmintonClock(previous, Date.now());
        if (session.state.badminton !== previous) {
          this.projectBadminton(session);
          await this.persist(session, revision);
        }
      }
      return Object.assign(session, { serverNow: Date.now() });
    });
  }

  private projectBadminton(session: ActivitySessionRecord): void {
    const match = session.state.badminton!;
    if (match.phase === 'cancelled') return;
    const steps: string[] = [];
    if (match.rallyHits > 0 || match.completedRallies > 0) steps.push('serve');
    if (match.completedRallies > 0) steps.push('rally');
    if (match.phase === 'finished') { steps.push('finish'); session.state.status = 'complete'; }
    session.state.completedStepIds = steps;
  }

  async photographyCapture(sessionId: string, userId: string, command: { key: string; expectedRevision: number; memoryId: string },
    verifyImage: (householdId: string, imageId: string) => Promise<void>): Promise<ActivitySessionRecord> {
    return this.sportsMutation(sessionId, userId, 'photography', command.key, JSON.stringify(command), async session => {
      if (!Number.isSafeInteger(command.expectedRevision) || command.expectedRevision !== (session.state.revision ?? 0)) throw new Error('Photography state changed; refresh before saving');
      if (session.state.status !== 'active' || session.state.completedStepIds[0] !== 'frame') throw new Error('Frame your photo before capturing');
      const memory = await this.repository.getMemory(command.memoryId);
      if (!memory || memory.householdId !== session.householdId || memory.type !== 'manual' || !memory.participants.includes(userId)
        || memory.metadata.activitySessionId !== session.id || memory.metadata.source !== 'manual-photo'
        || !Number.isFinite(Date.parse(memory.createdAt)) || Date.parse(memory.createdAt) < Date.parse(session.createdAt) || !/^memory-image:[A-Za-z0-9_-]+$/.test(memory.screenshotPath)) throw new Error('Save a new photo for this photography session');
      await verifyImage(session.householdId, memory.screenshotPath.slice('memory-image:'.length));
      session.state.photographyMemoryId = memory.id;
      session.state.completedStepIds = ['frame', 'capture'];
      session.state.status = 'complete';
    });
  }

  private async sportsMutation(sessionId: string, userId: string, activityId: ActivityId, key: string, fingerprint: string,
    apply: (session: ActivitySessionRecord) => void | Promise<void>): Promise<ActivitySessionRecord> {
    return this.withSessionMutation(sessionId, async () => {
      const session = await this.requireSession(sessionId);
      await this.authorize(session.householdId, userId);
      if (session.activityId !== activityId) throw new Error('Wrong sports activity');
      if (!session.state.participants.includes(userId)) throw new Error('Join this activity before playing');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw new Error('Invalid sports command key');
      const receipt = session.state.receipts?.[key];
      if (receipt) {
        if (receipt.actor !== userId || receipt.fingerprint !== fingerprint) throw new Error('Command key belongs to a different request');
        return Object.assign(session, { serverNow: Date.now() });
      }
      if (Object.keys(session.state.receipts ?? {}).length >= 4096) throw new Error('Start a new sports session');
      const revision = session.state.revision ?? 0;
      await apply(session);
      session.state.receipts = { ...session.state.receipts, [key]: { actor: userId, fingerprint } };
      try { await this.persist(session, revision); }
      catch (cause) {
        // A different instance may have accepted the identical lost-reply retry.
        const saved = await this.requireSession(sessionId);
        const accepted = saved.state.receipts?.[key];
        if (accepted?.actor === userId && accepted.fingerprint === fingerprint) return saved;
        throw cause;
      }
      return Object.assign(session, { serverNow: Date.now() });
    });
  }

  private async persist(session: ActivitySessionRecord, expectedRevision: number): Promise<void> {
    session.state.revision = expectedRevision + 1;
    session.updatedAt = new Date().toISOString();
    if (!await this.repository.compareAndSwapActivitySession(session, expectedRevision)) throw new Error('Activity state changed; refresh before playing');
  }

  private async withSessionMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.sessionMutationTails.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.catch(() => undefined).then(() => gate);
    this.sessionMutationTails.set(sessionId, tail);

    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (this.sessionMutationTails.get(sessionId) === tail) this.sessionMutationTails.delete(sessionId);
    }
  }

  private async requireSession(id: string): Promise<ActivitySessionRecord> {
    const session = await this.repository.getActivitySession(id);
    if (!session) throw new Error('Activity session not found');
    return session;
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) throw new Error('User is not an active household member');
    return household;
  }
}
