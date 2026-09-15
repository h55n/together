import test from 'node:test';
import assert from 'node:assert/strict';
import { activityAllowedInWeather, weatherWetness } from './weather.js';

test('weather changes leisure mood without harshly closing ordinary life', () => {
  assert.equal(activityAllowedInWeather('kayak', 'clear'), true);
  assert.equal(activityAllowedInWeather('kayak', 'light_rain'), true);
  assert.equal(activityAllowedInWeather('kayak', 'monsoon_rain'), false);
  assert.equal(activityAllowedInWeather('kayak', 'thunderstorm'), false);
  assert.equal(activityAllowedInWeather('cafe_hangout', 'thunderstorm'), true);
  assert.equal(activityAllowedInWeather('photography', 'monsoon_rain'), true);
});

test('wetness is progressive across rain states', () => {
  assert.equal(weatherWetness('clear'), 0);
  assert.ok(weatherWetness('light_rain') > 0);
  assert.ok(weatherWetness('monsoon_rain') > weatherWetness('light_rain'));
});
