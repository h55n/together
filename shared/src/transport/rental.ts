export type TransportRentalActivity = 'cycling' | 'kayak' | 'scooter_ride';
export type TransportRentalMode = 'bicycle' | 'kayak' | 'scooter';
export type TransportRentalStatus = 'rented' | 'in_use' | 'returned';

export type TransportRental = {
  rentalId: string;
  sessionId: string;
  activityId: TransportRentalActivity;
  ownerUserId: string;
  mode: TransportRentalMode;
  status: TransportRentalStatus;
  safetyAcknowledged: boolean;
};
export type TransportRentalReceipt = { key: string; actor: string; fingerprint: string; revision: number };
export type TransportRentalState = {
  sessionId: string;
  activityId: TransportRentalActivity;
  participants: string[];
  revision: number;
  rentals: TransportRental[];
  kayakSafetyAcknowledgedBy: string[];
  receipts: TransportRentalReceipt[];
};
export type TransportRentalCommand =
  | { key: string; expectedRevision: number; kind: 'rent' }
  | { key: string; expectedRevision: number; kind: 'acknowledge_safety'; rentalId: string }
  | { key: string; expectedRevision: number; kind: 'depart'; rentalId: string }
  | { key: string; expectedRevision: number; kind: 'return'; rentalId: string };
export type TransportRentalContext = { priorKayakSafetyAcknowledged?: boolean };
export type CreateTransportRentalInput = { sessionId: string; activityId: TransportRentalActivity; participants: readonly string[] };

const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
const validKey = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const MAX_RECEIPTS = 128;
const RENTAL_ACTIVITIES: readonly TransportRentalActivity[] = ['cycling', 'kayak', 'scooter_ride'];
const RENTAL_MODES: Record<TransportRentalActivity, TransportRentalMode> = { cycling: 'bicycle', kayak: 'kayak', scooter_ride: 'scooter' };
/** Kayaks and scooters seat at most two (a paddling pair, a rider and a pillion). */
const guestLimit = (activityId: TransportRentalActivity) => activityId === 'cycling' ? 6 : 2;

export function isTransportRentalActivity(activityId: string): activityId is TransportRentalActivity {
  return (RENTAL_ACTIVITIES as readonly string[]).includes(activityId);
}

/** Creates serializable rental state scoped to one persisted activity session. */
export function createTransportRentalState(input: CreateTransportRentalInput): TransportRentalState {
  if (!input || !validId(input.sessionId) || !isTransportRentalActivity(input.activityId)
      || input.participants.length < 1 || input.participants.length > guestLimit(input.activityId)
      || new Set(input.participants).size !== input.participants.length || input.participants.some(id => !validId(id)))
    throw new Error('Choose valid guests and a cycling, kayak or scooter activity for rental.');
  return { sessionId: input.sessionId, activityId: input.activityId, participants: [...input.participants], revision: 0, rentals: [], kayakSafetyAcknowledgedBy: [], receipts: [] };
}

/** Adds an outing participant while invalidating commands based on the older roster revision. */
export function joinTransportRentalState(state: TransportRentalState, userId: string): TransportRentalState {
  if (!validId(userId)) throw new Error('Choose a valid outing guest.');
  if (state.participants.includes(userId)) return state;
  if (state.participants.length >= guestLimit(state.activityId)) throw new Error('This outing has no available guest place.');
  return { ...state, participants: [...state.participants, userId], revision: state.revision + 1 };
}

/** Pure, immutable transition. Prior safety acknowledgement must come from trusted server history. */
export function acceptTransportRentalCommand(
  state: TransportRentalState,
  userId: string,
  command: TransportRentalCommand,
  context: TransportRentalContext = {},
): TransportRentalState {
  if (!state.participants.includes(userId)) throw new Error('Join this outing before using rental equipment.');
  if (!command || !validKey(command.key) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0)
    throw new Error('Invalid transport rental command.');

  const fingerprint = JSON.stringify(command);
  const previous = state.receipts.find(receipt => receipt.key === command.key);
  if (previous) {
    if (previous.actor !== userId || previous.fingerprint !== fingerprint) throw new Error('Transport rental command key reused with different inputs.');
    return state;
  }
  if (command.expectedRevision !== state.revision) throw new Error('Rental activity changed; refresh before continuing.');

  let rentals = state.rentals;
  let kayakSafetyAcknowledgedBy = state.kayakSafetyAcknowledgedBy;
  let changed = false;
  switch (command.kind) {
    case 'rent': {
      if (state.rentals.some(rental => rental.ownerUserId === userId && rental.status !== 'returned'))
        throw new Error('Return your current rental before choosing another.');
      const rentalId = JSON.stringify([state.sessionId, userId, state.revision + 1]);
      const previousReturned = state.rentals.filter(rental => rental.ownerUserId !== userId || rental.status !== 'returned');
      rentals = [...previousReturned, {
        rentalId,
        sessionId: state.sessionId,
        activityId: state.activityId,
        ownerUserId: userId,
        mode: RENTAL_MODES[state.activityId],
        status: 'rented',
        safetyAcknowledged: state.activityId === 'kayak' && (kayakSafetyAcknowledgedBy.includes(userId) || context.priorKayakSafetyAcknowledged === true),
      }];
      if (state.activityId === 'kayak' && context.priorKayakSafetyAcknowledged === true && !kayakSafetyAcknowledgedBy.includes(userId))
        kayakSafetyAcknowledgedBy = [...kayakSafetyAcknowledgedBy, userId];
      changed = true;
      break;
    }
    case 'acknowledge_safety': {
      const rental = ownedRental(state, userId, command.rentalId);
      if (rental.status === 'returned') throw new Error('Return is complete for this rental.');
      if (rental.mode === 'bicycle') throw new Error('Safety introductions are for kayak and scooter rentals.');
      if (!rental.safetyAcknowledged) {
        rentals = replaceRental(state.rentals, rental.rentalId, { ...rental, safetyAcknowledged: true });
        // A kayak introduction is remembered; a helmet goes on for every scooter ride.
        if (rental.mode === 'kayak' && !kayakSafetyAcknowledgedBy.includes(userId)) kayakSafetyAcknowledgedBy = [...kayakSafetyAcknowledgedBy, userId];
        changed = true;
      }
      break;
    }
    case 'depart': {
      const rental = ownedRental(state, userId, command.rentalId);
      if (rental.status === 'returned') throw new Error('Return is complete for this rental.');
      if (rental.mode === 'kayak' && !rental.safetyAcknowledged) throw new Error('Complete the kayak safety introduction before departure.');
      if (rental.mode === 'scooter' && !rental.safetyAcknowledged) throw new Error('Put on the helmet before riding the scooter.');
      if (rental.status !== 'in_use') {
        rentals = replaceRental(state.rentals, rental.rentalId, { ...rental, status: 'in_use' });
        changed = true;
      }
      break;
    }
    case 'return': {
      const rental = ownedRental(state, userId, command.rentalId);
      if (rental.status !== 'returned') {
        rentals = replaceRental(state.rentals, rental.rentalId, { ...rental, status: 'returned' });
        changed = true;
      }
      break;
    }
    default: throw new Error('Unknown transport rental command.');
  }

  const revision = changed ? state.revision + 1 : state.revision;
  return {
    ...state,
    rentals,
    kayakSafetyAcknowledgedBy,
    revision,
    receipts: [...state.receipts.slice(-(MAX_RECEIPTS - 1)), { key: command.key, actor: userId, fingerprint, revision }],
  };
}

function ownedRental(state: TransportRentalState, userId: string, rentalId: string): TransportRental {
  if (!validId(rentalId)) throw new Error('Choose a valid rental.');
  const rental = state.rentals.find(item => item.rentalId === rentalId);
  if (!rental) throw new Error('Rental was not found for this guest in this activity.');
  if (rental.ownerUserId !== userId) throw new Error('Only the rental owner can use or return this equipment.');
  return rental;
}

function replaceRental(rentals: TransportRental[], rentalId: string, next: TransportRental): TransportRental[] {
  return rentals.map(rental => rental.rentalId === rentalId ? next : rental);
}
