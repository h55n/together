export type BoardCard = { pair: number; symbol: string; label: string };
export type BoardGameCommand = { key: string; expectedRevision: number; kind: 'flip' | 'continue'; index?: number };
export type BoardGameState = {
  players: string[]; seed: number; cards: BoardCard[]; revealed: number[]; matched: number[];
  turn: string | null; phase: 'awaiting_first' | 'awaiting_second' | 'mismatch' | 'complete';
  attempts: number; revision: number;
};
const FACES: readonly Omit<BoardCard, 'pair'>[] = [
  { symbol: '🌺', label: 'Hibiscus' }, { symbol: '🫖', label: 'Tea pot' },
  { symbol: '🐚', label: 'Sea shell' }, { symbol: '🪁', label: 'Kite' },
  { symbol: '🥭', label: 'Mango' }, { symbol: '🌙', label: 'Moon' },
];

/** The shuffled deck is persisted once; reopening never reshuffles the table. */
export function createBoardGame(players: readonly string[], seed: number): BoardGameState {
  if (!Number.isSafeInteger(seed) || players.length < 1 || players.length > 6 ||
      new Set(players).size !== players.length || players.some(player => typeof player !== 'string' || !player.trim() || player.length > 128))
    throw new Error('Choose one to six distinct players and an integer shuffle seed.');
  let random = (seed >>> 0) || 0x6d2b79f5;
  const cards = FACES.flatMap((face, pair) => [{ ...face, pair }, { ...face, pair }]);
  for (let index = cards.length - 1; index > 0; index--) {
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    const swap = Math.floor((random >>> 0) / 0x1_0000_0000 * (index + 1));
    [cards[index], cards[swap]] = [cards[swap]!, cards[index]!];
  }
  return { players: [...players], seed, cards, revealed: [], matched: [], turn: players[0]!,
    phase: 'awaiting_first', attempts: 0, revision: 0 };
}

/** Server authority owns persistence and command receipts; this transition is pure. */
export function acceptBoardGameCommand(state: BoardGameState, userId: string, command: BoardGameCommand): BoardGameState {
  if (!state.players.includes(userId)) throw new Error('Join this table before playing.');
  if (typeof command.key !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(command.key) ||
      !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0 ||
      !['flip', 'continue'].includes(command.kind)) throw new Error('Invalid board game command.');
  if (command.expectedRevision !== state.revision) throw new Error('Table changed; refresh before playing.');
  if (state.phase === 'complete') throw new Error('All six pairs are found.');
  if (state.turn !== userId) throw new Error('It is another player’s turn.');
  if (command.kind === 'continue') {
    if (state.phase !== 'mismatch' || command.index !== undefined) throw new Error('Continue after viewing an unmatched pair.');
    return { ...state, revealed: [], phase: 'awaiting_first', revision: state.revision + 1 };
  }
  const index = command.index;
  if (!Number.isInteger(index) || index === undefined || index < 0 || index >= state.cards.length ||
      state.matched.includes(index) || state.revealed.includes(index)) throw new Error('Choose a face-down card.');
  if (state.phase === 'mismatch') throw new Error('Continue before flipping another card.');
  if (state.phase === 'awaiting_first') return { ...state, revealed: [index], phase: 'awaiting_second', revision: state.revision + 1 };
  const first = state.revealed[0]!;
  const paired = state.cards[first]!.pair === state.cards[index]!.pair;
  const matched = paired ? [...state.matched, first, index] : state.matched;
  const complete = matched.length === state.cards.length;
  const turn = complete ? null : state.players[(state.players.indexOf(userId) + 1) % state.players.length]!;
  return { ...state, revealed: paired ? [] : [first, index], matched, turn,
    phase: complete ? 'complete' : paired ? 'awaiting_first' : 'mismatch',
    attempts: state.attempts + 1, revision: state.revision + 1 };
}
