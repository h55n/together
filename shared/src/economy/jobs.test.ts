import test from 'node:test';
import assert from 'node:assert/strict';
import { locationAnchor } from '../world/city.js';
import { JOB_DEFINITIONS, jobForVenue } from './jobs.js';

test('physical city venues resolve to their authored V1 jobs', () => {
  assert.equal(jobForVenue('cafe_roshan')?.id, 'cafe_roshan');
  assert.equal(jobForVenue('lantern_market')?.id, 'market_helper');
  assert.equal(jobForVenue('naina_nursery')?.id, 'nursery_assistant');
  assert.equal(jobForVenue('common_coffee_desk')?.id, 'freelance_remote');
  assert.equal(jobForVenue('lantern_cycle_courier')?.id, 'delivery_rider');
  assert.equal(jobForVenue('bay_tea_cart'), undefined);
});

test('every location-bound job resolves to a physical authored city anchor', () => {
  for (const job of JOB_DEFINITIONS) {
    if (job.locationId === 'flexible') continue;
    assert.ok(locationAnchor(job.locationId), `${job.id} is missing ${job.locationId}`);
  }
});
