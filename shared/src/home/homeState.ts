import { z } from 'zod';
export type HomeState = {
  dishesDirty: number;
  laundryDirty: number;
  trashBags: number;
  floorDust: number;
  bathroomGrime: number;
  groceries: number;
  unresolvedRepairs: string[];
  plants: Record<string, number>;
};

const positiveAmount = z.number().finite().positive().max(100);
export const homeActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('wash_dish'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('fold_laundry'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('take_trash'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('sweep_floor'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('clean_bathroom'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('restock_groceries'), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('water_plant'), plantId: z.string().min(1).max(100), amount: positiveAmount }).strict(),
  z.object({ type: z.literal('repair'), repairId: z.string().min(1).max(100) }).strict(),
]);
export type HomeAction = z.infer<typeof homeActionSchema>;

export function createStarterHomeState(): HomeState {
  return {
    dishesDirty: 0,
    laundryDirty: 0,
    trashBags: 0,
    floorDust: 0.08,
    bathroomGrime: 0.06,
    groceries: 0.6,
    unresolvedRepairs: [],
    plants: {},
  };
}

export function applyHomeAction(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'wash_dish':
      return { ...state, dishesDirty: reduceCount(state.dishesDirty, action.amount) };
    case 'fold_laundry':
      return { ...state, laundryDirty: reduceCount(state.laundryDirty, action.amount) };
    case 'take_trash':
      return { ...state, trashBags: reduceCount(state.trashBags, action.amount) };
    case 'sweep_floor':
      return { ...state, floorDust: reduceUnit(state.floorDust, action.amount) };
    case 'clean_bathroom':
      return { ...state, bathroomGrime: reduceUnit(state.bathroomGrime, action.amount) };
    case 'restock_groceries':
      return { ...state, groceries: clamp01(state.groceries + positive(action.amount)) };
    case 'water_plant': {
      const previous = state.plants[action.plantId] ?? 0;
      return { ...state, plants: { ...state.plants, [action.plantId]: clamp01(previous + positive(action.amount)) } };
    }
    case 'repair':
      return { ...state, unresolvedRepairs: state.unresolvedRepairs.filter((id) => id !== action.repairId) };
  }
}

function reduceCount(value: number, amount: number): number {
  return Math.max(0, Math.round(value - positive(amount)));
}

function reduceUnit(value: number, amount: number): number {
  return clamp01(value - positive(amount));
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
