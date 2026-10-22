export type PicnicFood = 'mangoes' | 'sandwiches' | 'samosas' | 'idli' | 'chai' | 'lemon_soda';
export type PicnicItem = 'basket' | 'cups' | 'flowers' | 'lantern';
export type PicnicPortion = { id: string; food: PicnicFood; broughtBy: string; servedTo?: string; eatenBy?: string };
export type PicnicPlacedItem = { item: PicnicItem; x: number; z: number; placedBy: string };
export type PicnicCommand =
  | { key: string; expectedRevision: number; kind: 'place_mat'; x: number; z: number }
  | { key: string; expectedRevision: number; kind: 'place_item'; item: PicnicItem; x: number; z: number }
  | { key: string; expectedRevision: number; kind: 'bring_food'; food: PicnicFood }
  | { key: string; expectedRevision: number; kind: 'serve_food'; portionId: string; recipientId: string }
  | { key: string; expectedRevision: number; kind: 'eat_food'; portionId: string }
  | { key: string; expectedRevision: number; kind: 'finish' };
export type PicnicReceipt = { key: string; actor: string; fingerprint: string; revision: number };
export type PicnicState = {
  participants: string[];
  revision: number;
  phase: 'active' | 'finished';
  mat: { x: number; z: number; placedBy: string } | null;
  items: PicnicPlacedItem[];
  portions: PicnicPortion[];
  receipts: PicnicReceipt[];
};

/** Household groceries spent to bring one portion; Café Roshan drinks are purchased there, not carried. */
export const PICNIC_PROVISIONS: Record<PicnicFood, readonly { itemId: string; quantity: number }[]> = {
  mangoes: [{ itemId: 'fruit', quantity: 1 }],
  sandwiches: [{ itemId: 'bread', quantity: 1 }, { itemId: 'vegetables', quantity: 1 }],
  samosas: [{ itemId: 'potato', quantity: 1 }, { itemId: 'flour', quantity: 1 }],
  idli: [{ itemId: 'semolina', quantity: 1 }],
  chai: [{ itemId: 'tea', quantity: 1 }, { itemId: 'milk', quantity: 1 }],
  lemon_soda: [{ itemId: 'sugar', quantity: 1 }],
};

/** Household inventory id for a finished dish of a recipe, e.g. `dish:chai`. */
export function cookedDishItemId(recipeId: string): string { return `dish:${recipeId}`; }

const FOODS: readonly PicnicFood[] = ['mangoes', 'sandwiches', 'samosas', 'idli', 'chai', 'lemon_soda'];
const ITEMS: readonly PicnicItem[] = ['basket', 'cups', 'flowers', 'lantern'];
const validId = (value: string) => typeof value === 'string' && value.trim().length > 0 && value.length <= 128;

export function createPicnicState(participants: readonly string[]): PicnicState {
  if (participants.length < 1 || participants.length > 6 || new Set(participants).size !== participants.length || participants.some(id => !validId(id)))
    throw new Error('Choose one to six distinct picnic guests.');
  return { participants: [...participants], revision: 0, phase: 'active', mat: null, items: [], portions: [], receipts: [] };
}

/** Pure transition. Persist its result before broadcasting the updated outing. */
export function acceptPicnicCommand(state: PicnicState, userId: string, sessionParticipants: readonly string[], command: PicnicCommand): PicnicState {
  if (!sessionParticipants.includes(userId)) throw new Error('Join this picnic before interacting.');
  if (!command || typeof command.key !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(command.key) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0)
    throw new Error('Invalid picnic command.');
  const fingerprint = JSON.stringify(command);
  const receipt = state.receipts.find(entry => entry.key === command.key);
  if (receipt) {
    if (receipt.actor !== userId || receipt.fingerprint !== fingerprint) throw new Error('Picnic command key reused with different inputs.');
    return state;
  }
  if (command.expectedRevision !== state.revision) throw new Error('Picnic changed; refresh before continuing.');
  if (state.phase !== 'active') throw new Error('This picnic has been finished.');
  let next: PicnicState = state;
  const pointOkay = (x: number, z: number) => Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 3 && Math.abs(z) <= 3;
  switch (command.kind) {
    case 'place_mat':
      if (!pointOkay(command.x, command.z)) throw new Error('Keep the mat within the picnic lawn.');
      next = { ...state, mat: { x: command.x, z: command.z, placedBy: userId } };
      break;
    case 'place_item':
      if (!ITEMS.includes(command.item) || !pointOkay(command.x, command.z)) throw new Error('Choose a picnic item and keep it within the lawn.');
      if (state.items.length >= 24) throw new Error('There is plenty set out already.');
      next = { ...state, items: [...state.items, { item: command.item, x: command.x, z: command.z, placedBy: userId }] };
      break;
    case 'bring_food':
      if (!FOODS.includes(command.food)) throw new Error('Choose food to bring to the picnic.');
      if (state.portions.length >= 24) throw new Error('The picnic has plenty to share.');
      next = { ...state, portions: [...state.portions, { id: `portion-${state.revision + 1}`, food: command.food, broughtBy: userId }] };
      break;
    case 'serve_food': {
      if (!sessionParticipants.includes(command.recipientId)) throw new Error('Serve food to a picnic guest.');
      const portion = state.portions.find(item => item.id === command.portionId);
      if (!portion || portion.servedTo || portion.eatenBy) throw new Error('That food is not ready to serve.');
      next = { ...state, portions: state.portions.map(item => item.id === portion.id ? { ...item, servedTo: command.recipientId } : item) };
      break;
    }
    case 'eat_food': {
      const portion = state.portions.find(item => item.id === command.portionId);
      if (!portion || portion.servedTo !== userId || portion.eatenBy) throw new Error('That food has not been served to you.');
      next = { ...state, portions: state.portions.map(item => item.id === portion.id ? { ...item, eatenBy: userId } : item) };
      break;
    }
    case 'finish': next = { ...state, phase: 'finished' }; break;
    default: throw new Error('Unknown picnic command.');
  }
  return { ...next, revision: state.revision + 1, receipts: [...state.receipts.slice(-127), { key: command.key, actor: userId, fingerprint, revision: state.revision + 1 }] };
}
