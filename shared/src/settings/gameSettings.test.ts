import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGameSettings, QUALITY_PROFILES, resolveStartupGameSettings } from './gameSettings.js';

test('accessibility settings clamp FOV, motion, UI scale and audio to safe ranges', () => {
  const settings = normalizeGameSettings({ fov: 120, headBob: -1, uiScale: 3, masterVolume: 2, reducedMotion: true });
  assert.equal(settings.fov, 95);
  assert.equal(settings.headBob, 0);
  assert.equal(settings.uiScale, 1.5);
  assert.equal(settings.masterVolume, 1);
  assert.equal(settings.reducedMotion, true);
});

test('quality profiles never change gameplay collision and scale render cost only', () => {
  assert.deepEqual(Object.keys(QUALITY_PROFILES), ['low', 'medium', 'high', 'capture']);
  assert.ok(QUALITY_PROFILES.low.pixelRatioCap < QUALITY_PROFILES.medium.pixelRatioCap);
  assert.ok(QUALITY_PROFILES.high.shadowScale >= QUALITY_PROFILES.medium.shadowScale);
  assert.equal(QUALITY_PROFILES.low.shadowsEnabled, false);
  assert.equal(QUALITY_PROFILES.medium.shadowsEnabled, true);
  assert.ok(QUALITY_PROFILES.low.streamRadiusChunks < QUALITY_PROFILES.medium.streamRadiusChunks);
  assert.ok(QUALITY_PROFILES.capture.streamRadiusChunks >= QUALITY_PROFILES.high.streamRadiusChunks);
  assert.equal(QUALITY_PROFILES.low.gameplayScale, 1);
  assert.equal(QUALITY_PROFILES.capture.gameplayScale, 1);
});

test('keyboard bindings are remappable but invalid/duplicate critical bindings fall back safely', async () => {
  const { DEFAULT_CONTROL_BINDINGS } = await import('./gameSettings.js');
  const remapped = normalizeGameSettings({ bindings: { ...DEFAULT_CONTROL_BINDINGS, interact: 'KeyF', cameraToggle: 'KeyQ' } });
  assert.equal(remapped.bindings.interact, 'KeyF');
  assert.equal(remapped.bindings.cameraToggle, 'KeyQ');
  const invalid = normalizeGameSettings({ bindings: { ...DEFAULT_CONTROL_BINDINGS, interact: 'DefinitelyNotAKeyboardCode' } });
  assert.equal(invalid.bindings.interact, DEFAULT_CONTROL_BINDINGS.interact);
});

test('new players start with the lightweight graphics profile', () => {
  assert.equal(normalizeGameSettings({}).quality, 'low');
});

test('legacy saved medium settings receive the safe startup profile once', () => {
  assert.equal(resolveStartupGameSettings({ quality: 'medium' }, true).quality, 'low');
  assert.equal(resolveStartupGameSettings({ quality: 'medium' }, false).quality, 'medium');
});
