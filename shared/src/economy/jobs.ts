export type JobId = 'cafe_roshan' | 'market_helper' | 'delivery_rider' | 'nursery_assistant' | 'freelance_remote';
export type ShiftQuality = 'early' | 'standard' | 'trusted';
export type JobDefinition = {
  id: JobId;
  displayName: string;
  locationId: string;
  sessionMinutes: [number, number];
  payouts: Record<ShiftQuality, number>;
  actions: readonly string[];
};

export const JOB_DEFINITIONS: readonly JobDefinition[] = [
  { id: 'cafe_roshan', displayName: 'Café Roshan Barista', locationId: 'lantern_cafe_roshan', sessionMinutes: [6, 12], payouts: { early: 550, standard: 700, trusted: 1150 }, actions: ['take_order', 'grind', 'brew', 'heat_milk', 'serve', 'wipe'] },
  { id: 'market_helper', displayName: 'Market Helper', locationId: 'lantern_market', sessionMinutes: [6, 10], payouts: { early: 500, standard: 650, trusted: 1000 }, actions: ['carry_crate', 'restock', 'bag', 'clean_spill'] },
  { id: 'delivery_rider', displayName: 'Delivery Rider', locationId: 'lantern_delivery', sessionMinutes: [7, 12], payouts: { early: 600, standard: 800, trusted: 1200 }, actions: ['collect', 'load_carrier', 'ride', 'handover'] },
  { id: 'nursery_assistant', displayName: 'Plant Nursery Assistant', locationId: 'rain_tree_nursery', sessionMinutes: [6, 11], payouts: { early: 520, standard: 680, trusted: 1050 }, actions: ['water', 'repot', 'sweep', 'arrange', 'prune'] },
  { id: 'freelance_remote', displayName: 'Freelance / Remote Work', locationId: 'flexible', sessionMinutes: [6, 12], payouts: { early: 450, standard: 620, trusted: 950 }, actions: ['type', 'plan', 'arrange_documents', 'focus'] },
] as const;

export function jobById(id: string): JobDefinition | undefined {
  return JOB_DEFINITIONS.find((job) => job.id === id);
}

const JOB_VENUE_IDS: Partial<Record<string, JobId>> = {
  cafe_roshan: 'cafe_roshan',
  lantern_market: 'market_helper',
  naina_nursery: 'nursery_assistant',
  lantern_cycle_courier: 'delivery_rider',
  common_coffee_desk: 'freelance_remote',
};

export function jobForVenue(venueId: string): JobDefinition | undefined {
  const jobId = JOB_VENUE_IDS[venueId];
  return jobId ? jobById(jobId) : undefined;
}
