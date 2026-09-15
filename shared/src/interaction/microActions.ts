export const MICRO_ACTION_PRIMITIVES = [
  'pick_up','place','carry','pour','hold','scrub','wipe','wash','cut','stir','press','open','close','fold','water','turn','plug','sit','sleep','hand_over','receive','point','inspect','switch_on','switch_off','attach','detach',
] as const;
export type MicroActionPrimitive = typeof MICRO_ACTION_PRIMITIVES[number];

export type MicroActionStep = {
  id: string;
  primitive: MicroActionPrimitive;
  objectState?: string;
  soundEvent?: string;
  animationTag?: string;
  persistence: 'none' | 'object' | 'household';
  replicate: boolean;
};

export type MicroActionSession = {
  id: string;
  steps: readonly MicroActionStep[];
  completedSteps: readonly string[];
  currentIndex: number;
  currentStep: MicroActionStep | undefined;
  status: 'active' | 'completed';
};

export function createMicroActionSession(id: string, steps: readonly MicroActionStep[]): MicroActionSession {
  if (!steps.length) return { id, steps, completedSteps: [], currentIndex: 0, currentStep: undefined, status: 'completed' };
  return { id, steps, completedSteps: [], currentIndex: 0, currentStep: steps[0], status: 'active' };
}

export function advanceMicroAction(session: MicroActionSession, performed: MicroActionPrimitive): MicroActionSession {
  if (session.status === 'completed') return session;
  const expected = session.currentStep;
  if (!expected) throw new Error('Micro-action session is missing current step');
  if (expected.primitive !== performed) throw new Error(`Expected ${expected.primitive}, received ${performed}`);
  const nextIndex = session.currentIndex + 1;
  const completedSteps = [...session.completedSteps, expected.id];
  if (nextIndex >= session.steps.length) return { ...session, completedSteps, currentIndex: nextIndex, currentStep: undefined, status: 'completed' };
  return { ...session, completedSteps, currentIndex: nextIndex, currentStep: session.steps[nextIndex], status: 'active' };
}

export const dishwashingSequence: readonly MicroActionStep[] = [
  { id: 'take_plate', primitive: 'pick_up', animationTag: 'pickup_plate', persistence: 'object', replicate: true },
  { id: 'tap_on', primitive: 'open', objectState: 'tap_on', soundEvent: 'tap_water', persistence: 'object', replicate: true },
  { id: 'wet_plate', primitive: 'wash', objectState: 'wet', soundEvent: 'water_plate', persistence: 'object', replicate: true },
  { id: 'scrub_plate', primitive: 'scrub', objectState: 'soapy', soundEvent: 'dish_scrub', animationTag: 'scrub_dish', persistence: 'object', replicate: true },
  { id: 'rinse_plate', primitive: 'wash', objectState: 'clean', soundEvent: 'dish_rinse', persistence: 'object', replicate: true },
  { id: 'rack_plate', primitive: 'place', objectState: 'rack_clean', soundEvent: 'ceramic_place', persistence: 'household', replicate: true },
  { id: 'tap_off', primitive: 'close', objectState: 'tap_off', soundEvent: 'tap_off', persistence: 'object', replicate: true },
] as const;

export const plantWateringSequence: readonly MicroActionStep[] = [
  { id: 'take_can', primitive: 'pick_up', animationTag: 'pickup_can', persistence: 'none', replicate: true },
  { id: 'water_plant', primitive: 'water', objectState: 'watered', soundEvent: 'watering_can', animationTag: 'water_plant', persistence: 'household', replicate: true },
  { id: 'replace_can', primitive: 'place', persistence: 'none', replicate: true },
] as const;

export const laundryFoldSequence: readonly MicroActionStep[] = [
  { id: 'take_item', primitive: 'pick_up', animationTag: 'pickup_cloth', persistence: 'object', replicate: true },
  { id: 'fold_item', primitive: 'fold', objectState: 'folded', soundEvent: 'cloth_fold', animationTag: 'fold_laundry', persistence: 'household', replicate: true },
  { id: 'stack_item', primitive: 'place', objectState: 'stacked', persistence: 'household', replicate: true },
] as const;

import type { AvatarAction } from '../animation/avatarMotion.js';

export function avatarActionForPrimitive(primitive: MicroActionPrimitive): Exclude<AvatarAction, 'idle' | 'walk' | 'jog'> {
  switch (primitive) {
    case 'pick_up': return 'pick_up';
    case 'place': return 'place';
    case 'carry': return 'carry';
    case 'pour': return 'pour';
    case 'scrub': return 'scrub';
    case 'wipe': return 'wipe';
    case 'wash': return 'wash';
    case 'cut': return 'cut';
    case 'stir': return 'stir';
    case 'fold': return 'fold';
    case 'water': return 'water';
    case 'sit': return 'sit';
    case 'sleep': return 'sleep';
    case 'point':
    case 'inspect': return 'point';
    case 'hold':
    case 'hand_over':
    case 'receive': return 'hand_over';
    case 'press':
    case 'open':
    case 'close':
    case 'turn':
    case 'plug':
    case 'switch_on':
    case 'switch_off':
    case 'attach':
    case 'detach': return 'hand_over';
  }
}

export const trashSequence: readonly MicroActionStep[] = [
  { id: 'take_bag', primitive: 'pick_up', animationTag: 'pickup_trash', persistence: 'object', replicate: true },
  { id: 'carry_bag', primitive: 'carry', objectState: 'carried', persistence: 'object', replicate: true },
  { id: 'open_bin', primitive: 'open', objectState: 'bin_open', soundEvent: 'bin_open', persistence: 'object', replicate: true },
  { id: 'place_bag', primitive: 'place', objectState: 'trash_removed', soundEvent: 'bag_drop', persistence: 'household', replicate: true },
  { id: 'close_bin', primitive: 'close', objectState: 'bin_closed', soundEvent: 'bin_close', persistence: 'object', replicate: true },
] as const;

export const floorCleaningSequence: readonly MicroActionStep[] = [
  { id: 'take_broom', primitive: 'pick_up', animationTag: 'pickup_broom', persistence: 'none', replicate: true },
  { id: 'sweep_pass_a', primitive: 'wipe', objectState: 'floor_part_clean', soundEvent: 'broom_sweep', persistence: 'household', replicate: true },
  { id: 'sweep_pass_b', primitive: 'wipe', objectState: 'floor_cleaner', soundEvent: 'broom_sweep', persistence: 'household', replicate: true },
  { id: 'replace_broom', primitive: 'place', persistence: 'none', replicate: true },
] as const;

export const bathroomCleaningSequence: readonly MicroActionStep[] = [
  { id: 'take_sponge', primitive: 'pick_up', animationTag: 'pickup_sponge', persistence: 'none', replicate: true },
  { id: 'wet_sink', primitive: 'wash', objectState: 'bathroom_wet', soundEvent: 'tap_water', persistence: 'object', replicate: true },
  { id: 'scrub_sink', primitive: 'scrub', objectState: 'bathroom_soapy', soundEvent: 'surface_scrub', persistence: 'household', replicate: true },
  { id: 'rinse_sink', primitive: 'wash', objectState: 'bathroom_rinsed', soundEvent: 'tap_water', persistence: 'household', replicate: true },
  { id: 'wipe_sink', primitive: 'wipe', objectState: 'bathroom_clean', soundEvent: 'cloth_wipe', persistence: 'household', replicate: true },
  { id: 'replace_sponge', primitive: 'place', persistence: 'none', replicate: true },
] as const;

export const repairSequence: readonly MicroActionStep[] = [
  { id: 'inspect_fault', primitive: 'inspect', objectState: 'diagnosed', persistence: 'object', replicate: true },
  { id: 'open_fixture', primitive: 'open', objectState: 'fixture_open', soundEvent: 'tool_click', persistence: 'object', replicate: true },
  { id: 'turn_fitting', primitive: 'turn', objectState: 'fitting_tight', soundEvent: 'tool_turn', persistence: 'object', replicate: true },
  { id: 'attach_part', primitive: 'attach', objectState: 'part_attached', soundEvent: 'tool_click', persistence: 'household', replicate: true },
  { id: 'close_fixture', primitive: 'close', objectState: 'repaired', soundEvent: 'fixture_close', persistence: 'household', replicate: true },
] as const;

export const groceryRestockSequence: readonly MicroActionStep[] = [
  { id: 'carry_bag', primitive: 'carry', animationTag: 'carry_groceries', persistence: 'object', replicate: true },
  { id: 'open_fridge', primitive: 'open', objectState: 'fridge_open', soundEvent: 'fridge_open', persistence: 'object', replicate: true },
  { id: 'place_staples', primitive: 'place', objectState: 'groceries_restocked', soundEvent: 'grocery_place', persistence: 'household', replicate: true },
  { id: 'close_fridge', primitive: 'close', objectState: 'fridge_closed', soundEvent: 'fridge_close', persistence: 'object', replicate: true },
] as const;

export const CHORE_SEQUENCES = {
  dishes: dishwashingSequence,
  trash: trashSequence,
  laundry: laundryFoldSequence,
  floor_clean: floorCleaningSequence,
  plant_care: plantWateringSequence,
  groceries: groceryRestockSequence,
  bathroom_clean: bathroomCleaningSequence,
  repair: repairSequence,
} as const satisfies Record<string, readonly MicroActionStep[]>;
