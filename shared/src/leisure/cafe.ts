export type CafeDrink = 'chai' | 'filter_coffee' | 'cold_coffee' | 'lemon_soda';
export type CafeOrder = { id: string; drink: CafeDrink; orderedBy: string; servedTo?: string; sippedBy?: string };
export type CafeCommand =
  | { key: string; expectedRevision: number; kind: 'choose_seat'; seat: number }
  | { key: string; expectedRevision: number; kind: 'order_drink'; drink: CafeDrink }
  | { key: string; expectedRevision: number; kind: 'serve_drink'; orderId: string; recipientId: string }
  | { key: string; expectedRevision: number; kind: 'sip_drink'; orderId: string }
  | { key: string; expectedRevision: number; kind: 'finish' };
export type CafeReceipt = { key: string; actor: string; fingerprint: string; revision: number };
export type CafeState = { participants: string[]; revision: number; phase: 'active' | 'finished'; seats: Record<string, number>; orders: CafeOrder[]; receipts: CafeReceipt[] };

const DRINKS: readonly CafeDrink[] = ['chai', 'filter_coffee', 'cold_coffee', 'lemon_soda'];
const validId = (value: string) => typeof value === 'string' && value.trim().length > 0 && value.length <= 128;

export function createCafeState(participants: readonly string[]): CafeState {
  if (participants.length < 1 || participants.length > 6 || new Set(participants).size !== participants.length || participants.some(id => !validId(id)))
    throw new Error('Choose one to six distinct café guests.');
  return { participants: [...participants], revision: 0, phase: 'active', seats: {}, orders: [], receipts: [] };
}

/** Pure transition for an open-ended café visit; guests decide when to head out. */
export function acceptCafeCommand(state: CafeState, userId: string, sessionParticipants: readonly string[], command: CafeCommand): CafeState {
  if (!sessionParticipants.includes(userId)) throw new Error('Join this café visit before interacting.');
  if (!command || typeof command.key !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(command.key) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0)
    throw new Error('Invalid café command.');
  const fingerprint = JSON.stringify(command);
  const receipt = state.receipts.find(entry => entry.key === command.key);
  if (receipt) {
    if (receipt.actor !== userId || receipt.fingerprint !== fingerprint) throw new Error('Café command key reused with different inputs.');
    return state;
  }
  if (command.expectedRevision !== state.revision) throw new Error('Café table changed; refresh before continuing.');
  if (state.phase !== 'active') throw new Error('This café visit has been finished.');
  let next: CafeState = state;
  switch (command.kind) {
    case 'choose_seat': {
      if (!Number.isInteger(command.seat) || command.seat < 1 || command.seat > 6) throw new Error('Choose an available seat.');
      if (Object.entries(state.seats).some(([guest, seat]) => guest !== userId && seat === command.seat)) throw new Error('That seat is taken.');
      next = { ...state, seats: { ...state.seats, [userId]: command.seat } };
      break;
    }
    case 'order_drink':
      if (!DRINKS.includes(command.drink)) throw new Error('Choose a drink from the café menu.');
      if (state.orders.length >= 24) throw new Error('The table has plenty of drinks for now.');
      next = { ...state, orders: [...state.orders, { id: `order-${state.revision + 1}`, drink: command.drink, orderedBy: userId }] };
      break;
    case 'serve_drink': {
      if (!sessionParticipants.includes(command.recipientId)) throw new Error('Serve the drink to a café guest.');
      const order = state.orders.find(item => item.id === command.orderId);
      if (!order || order.servedTo || order.sippedBy) throw new Error('That drink is not ready to serve.');
      next = { ...state, orders: state.orders.map(item => item.id === order.id ? { ...item, servedTo: command.recipientId } : item) };
      break;
    }
    case 'sip_drink': {
      const order = state.orders.find(item => item.id === command.orderId);
      if (!order || order.servedTo !== userId || order.sippedBy) throw new Error('That drink has not been served to you.');
      next = { ...state, orders: state.orders.map(item => item.id === order.id ? { ...item, sippedBy: userId } : item) };
      break;
    }
    case 'finish': next = { ...state, phase: 'finished' }; break;
    default: throw new Error('Unknown café command.');
  }
  return { ...next, revision: state.revision + 1, receipts: [...state.receipts.slice(-127), { key: command.key, actor: userId, fingerprint, revision: state.revision + 1 }] };
}
