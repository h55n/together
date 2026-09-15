import assert from 'node:assert/strict';
import test from 'node:test';
import { musicVoicing, selectMusicState } from './music.js';

test('music remains silent through ordinary daytime walking most of the time', () => {
  assert.equal(selectMusicState({ districtId: 'mogra_court', gameMinutes: 11 * 60, weather: 'clear', indoors: false }), 'silence');
  assert.equal(selectMusicState({ districtId: 'the_common', gameMinutes: 14 * 60, weather: 'partly_cloudy', indoors: false }), 'silence');
});

test('hero contexts select sparse warm music states without overriding heavy weather', () => {
  assert.equal(selectMusicState({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'clear', indoors: false }), 'waterfront_golden');
  assert.equal(selectMusicState({ districtId: 'lantern_street', gameMinutes: 9 * 60, weather: 'clear', indoors: false }), 'cafe_morning');
  assert.equal(selectMusicState({ districtId: 'mogra_court', gameMinutes: 20 * 60, weather: 'light_rain', indoors: true }), 'home_evening');
  assert.equal(selectMusicState({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'thunderstorm', indoors: false }), 'silence');
});

test('music states map to sparse warm voicings instead of constant dense score', () => {
  const { bpm, notes, gain } = musicVoicing('waterfront_golden');
  assert.ok(bpm >= 52 && bpm <= 72);
  assert.ok(notes.length >= 3 && notes.length <= 5);
  assert.ok(gain <= 0.045);
  assert.deepEqual(musicVoicing('silence').notes, []);
});
