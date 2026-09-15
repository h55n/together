import type { StarterPropertyId } from './properties.js';

export type RenovationDefinition = {
  id: string;
  propertyId: StarterPropertyId;
  displayName: string;
  description: string;
  cost: number;
  impactTags: readonly string[];
};

export type RenovationState = {
  installed: string[];
};

export const RENOVATIONS: readonly RenovationDefinition[] = [
  { id: 'study_corner', propertyId: 'couple_studio', displayName: 'Window Study Corner', description: 'A compact shared desk, shelving and warm task light beside the window.', cost: 9_500, impactTags: ['work', 'cozy'] },
  { id: 'balcony_planter_wall', propertyId: 'couple_studio', displayName: 'Balcony Planter Wall', description: 'A vertical herb and flowering planter system for the balcony.', cost: 8_500, impactTags: ['plants', 'balcony'] },
  { id: 'expanded_counter', propertyId: 'couple_studio', displayName: 'Expanded Kitchen Counter', description: 'Adds preparation surface and a second co-op kitchen station.', cost: 12_500, impactTags: ['cooking', 'storage'] },

  { id: 'study_corner', propertyId: 'one_bhk', displayName: 'Living Room Study Nook', description: 'A quiet workstation integrated into the living room.', cost: 10_000, impactTags: ['work', 'cozy'] },
  { id: 'shelving_wall', propertyId: 'one_bhk', displayName: 'Full Shelving Wall', description: 'Built-in display and storage for books, memories and plants.', cost: 11_500, impactTags: ['storage', 'memory'] },
  { id: 'balcony_enclosure', propertyId: 'one_bhk', displayName: 'Rain Balcony Screen', description: 'Sliding weather screens make the balcony usable during monsoon evenings.', cost: 15_000, impactTags: ['balcony', 'monsoon'] },

  { id: 'open_partition', propertyId: 'courtyard_2bhk', displayName: 'Open Living Partition', description: 'Opens the authored living partition for a larger shared social space.', cost: 16_500, impactTags: ['social', 'space'] },
  { id: 'plant_wall', propertyId: 'courtyard_2bhk', displayName: 'Courtyard Plant Wall', description: 'Layered planters and irrigation turn one courtyard wall green.', cost: 13_500, impactTags: ['plants', 'courtyard'] },
  { id: 'kitchen_extension', propertyId: 'courtyard_2bhk', displayName: 'Kitchen Extension', description: 'Adds storage, prep counter and an additional cooking station.', cost: 18_500, impactTags: ['cooking', 'storage'] },

  { id: 'terrace_garden', propertyId: 'pg_house', displayName: 'Terrace Garden', description: 'Adds planters, seating and string lighting to the shared terrace.', cost: 18_000, impactTags: ['plants', 'social'] },
  { id: 'utility_storage', propertyId: 'pg_house', displayName: 'Utility Storage Upgrade', description: 'Adds organised household storage and laundry shelving.', cost: 9_000, impactTags: ['storage', 'laundry'] },
  { id: 'common_room_divider', propertyId: 'pg_house', displayName: 'Flexible Common Room Divider', description: 'A sliding authored divider creates a quieter study or game corner.', cost: 14_000, impactTags: ['social', 'privacy'] },

  { id: 'roof_gathering', propertyId: 'hostel_floor', displayName: 'Roof Gathering Zone', description: 'Weather-safe seating, lights and a long shared table on the roof.', cost: 20_000, impactTags: ['social', 'roof'] },
  { id: 'notice_wall', propertyId: 'hostel_floor', displayName: 'Household Notice Wall', description: 'A tactile cork-and-shelf wall for notes, photos and shared plans.', cost: 8_000, impactTags: ['notes', 'memory'] },
  { id: 'kitchen_storage', propertyId: 'hostel_floor', displayName: 'Shared Kitchen Storage', description: 'Adds labelled pantry storage and more usable counter surface.', cost: 12_000, impactTags: ['cooking', 'storage'] },
] as const;

export function renovationsForProperty(propertyId: StarterPropertyId): RenovationDefinition[] {
  return RENOVATIONS.filter((option) => option.propertyId === propertyId);
}

export function renovationFor(propertyId: StarterPropertyId, renovationId: string): RenovationDefinition | undefined {
  return RENOVATIONS.find((option) => option.propertyId === propertyId && option.id === renovationId);
}

export function applyRenovation(state: RenovationState, propertyId: StarterPropertyId, renovationId: string): RenovationState {
  const definition = renovationFor(propertyId, renovationId);
  if (!definition) throw new Error('Renovation is not available for this property');
  if (state.installed.includes(renovationId)) throw new Error('Renovation is already installed');
  return { installed: [...state.installed, renovationId] };
}
