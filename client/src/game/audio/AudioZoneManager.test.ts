import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioZoneManager } from './AudioZoneManager';

function audioHarness() {
  const starts: number[] = [], gains: ReturnType<typeof node>[] = [];
  const oscillators: Array<{ stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null }> = [];
  const sources: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; buffer: unknown; loop: boolean; onended: (() => void) | null }> = [];
  const parameter = () => ({ value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const node = () => ({ connect: (destination: unknown) => destination, disconnect: vi.fn(), gain: parameter() });
  class Context {
    static instance: Context;
    currentTime = 0;
    state = 'running';
    sampleRate = 16;
    destination = node();
    constructor() { Context.instance = this; }
    createGain = () => { const gain = node(); gains.push(gain); return gain; };
    createBiquadFilter = () => ({ ...node(), frequency: parameter(), type: '' });
    createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return { duration: length / sampleRate, getChannelData: () => data };
    });
    createBufferSource = () => {
      const source = { ...node(), start: vi.fn(), stop: vi.fn(), buffer: null, loop: false, onended: null as (() => void) | null };
      sources.push(source); return source;
    };
    createOscillator = () => {
      const oscillator = { ...node(), frequency: parameter(), type: '', start: (at: number) => starts.push(at), stop: vi.fn(), onended: null as (() => void) | null };
      oscillators.push(oscillator); return oscillator;
    };
    resume = vi.fn(async (): Promise<void> => undefined);
    suspend = vi.fn(async (): Promise<void> => undefined);
    close = vi.fn(async (): Promise<void> => undefined);
  }
  vi.stubGlobal('AudioContext', Context);
  return { starts, sources, gains, oscillators, context: () => Context.instance };
}

afterEach(() => vi.unstubAllGlobals());
describe('world music scheduling', () => {
  it('caches six distinct original activity sounds and bounds their live voices', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock();
    const loops = harness.sources.length;
    for (const kind of ['golf_putt', 'golf_cup', 'racket_hit', 'shuttle_fault', 'cycle_bell', 'paddle'] as const) audio.playActivitySound(kind);
    const sounds = harness.sources.slice(loops);
    expect(sounds).toHaveLength(6);
    expect(new Set(sounds.map(sound => sound.buffer)).size).toBe(6);
    const waveforms = sounds.map(sound => [...(sound.buffer as { getChannelData: (channel: number) => Float32Array }).getChannelData(0)]);
    expect(waveforms.every(data => data.every(Number.isFinite) && data.some(sample => sample !== 0))).toBe(true);
    expect(new Set(waveforms.map(data => JSON.stringify(data))).size).toBe(6);
    const buffers = harness.context().createBuffer.mock.calls.length;
    for (let repeat = 0; repeat < 30; repeat++) audio.playActivitySound('golf_putt');
    expect(harness.sources.length).toBeLessThanOrEqual(loops + 8);
    expect(harness.context().createBuffer).toHaveBeenCalledTimes(buffers);
    audio.setMasterVolume(0);
    expect(harness.gains[0]!.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    for (const sound of harness.sources.slice(loops)) expect(sound.disconnect).toHaveBeenCalledTimes(1);
    const mutedCount = harness.sources.length;
    audio.playActivitySound('cycle_bell'); expect(harness.sources).toHaveLength(mutedCount);
    audio.setMasterVolume(1); audio.playActivitySound('cycle_bell');
    expect(harness.sources).toHaveLength(mutedCount + 1);
    audio.dispose();
    for (const sound of harness.sources.slice(loops)) expect(sound.disconnect).toHaveBeenCalledTimes(1);
  });

  it('mixes district layers without rebuilding loops and mutes outdoor detail indoors or in heavy rain', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock();
    expect(harness.sources.filter(source => 'loop' in source && source.loop)).toHaveLength(4);
    const buffers = harness.context().createBuffer.mock.calls.length;
    audio.setDistrictContext('bay_steps', 'clear', false); audio.update();
    const water = harness.gains[4]!, birds = harness.gains[5]!;
    const outdoors = water.gain.setTargetAtTime.mock.lastCall![0];
    audio.setDistrictContext('bay_steps', 'monsoon_rain', true); audio.update();
    expect(water.gain.setTargetAtTime.mock.lastCall![0]).toBeLessThan(outdoors);
    expect(birds.gain.setTargetAtTime.mock.lastCall![0]).toBe(0);
    expect(harness.context().createBuffer).toHaveBeenCalledTimes(buffers);
    expect(harness.sources).toHaveLength(4);
    audio.dispose();
    for (const source of harness.sources) expect(source.disconnect).toHaveBeenCalledTimes(1);
  });

  it('stops active sounds when suspended and never recreates a disposed graph', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock(); const loops = harness.sources.length;
    audio.playActivitySound('paddle');
    audio.setSuspended(true);
    expect(harness.context().suspend).toHaveBeenCalledTimes(1);
    expect(harness.sources[loops]!.disconnect).toHaveBeenCalledTimes(1);
    audio.playActivitySound('racket_hit'); expect(harness.sources).toHaveLength(loops + 1);
    audio.dispose(); await audio.unlock();
    expect(harness.context().close).toHaveBeenCalledTimes(1);
    expect(harness.sources).toHaveLength(loops + 1);
  });
  it('disconnects scheduled music voices and every bus on repeated disposal', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock();
    audio.setMusicContext({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'clear', indoors: false });
    harness.context().currentTime = 0.4; audio.update();
    expect(harness.oscillators).toHaveLength(1);
    const ended = harness.oscillators[0]!.onended!;
    audio.dispose(); audio.dispose(); ended();
    expect(harness.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
    expect(harness.oscillators[0]!.disconnect).toHaveBeenCalledTimes(1);
    for (const gain of harness.gains) expect(gain.disconnect).toHaveBeenCalledTimes(1);
    expect(harness.context().close).toHaveBeenCalledTimes(1);
  });
  it('resumes when a visibility reversal arrives while suspend is still pending', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock();
    let finishSuspend!: () => void;
    harness.context().suspend.mockImplementation(() => new Promise<void>(resolve => { finishSuspend = () => { harness.context().state = 'suspended'; resolve(); }; }));
    audio.setSuspended(true); audio.setSuspended(false);
    finishSuspend(); await Promise.resolve(); await Promise.resolve();
    expect(harness.context().resume).toHaveBeenCalledTimes(1);
    audio.dispose();
  });
  it('does not allocate music while muted, including invalid volume settings', async () => {
    const harness = audioHarness(), audio = new AudioZoneManager();
    await audio.unlock();
    audio.setMusicContext({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'clear', indoors: false });
    audio.setMasterVolume(Number.NaN); harness.context().currentTime = 0.4; audio.update();
    expect(harness.starts).toHaveLength(0);
    audio.setMasterVolume(1); audio.setMusicVolume(0); audio.update();
    expect(harness.starts).toHaveLength(0);
    audio.dispose();
  });
  it('keeps footstep voices bounded, silent while suspended, and disconnects them once', async () => {
    const harness = audioHarness(); const audio = new AudioZoneManager();
    await audio.unlock();
    const loops = harness.sources.length;
    harness.context().state = 'suspended';
    audio.playFootstep(1.6);
    expect(harness.sources).toHaveLength(loops);
    harness.context().state = 'running';
    for (let step = 0; step < 20; step++) audio.playFootstep(1.6);
    expect(harness.sources).toHaveLength(loops + 6);
    for (const source of harness.sources.slice(loops)) expect(source.start).toHaveBeenCalledTimes(1);
    const ended = harness.sources[loops]!, endedCallback = ended.onended!; endedCallback();
    audio.dispose(); endedCallback();
    expect(ended.disconnect).toHaveBeenCalledTimes(1);
    for (const source of harness.sources.slice(loops + 1)) {
      expect(source.stop).toHaveBeenCalledTimes(2); // Scheduled stop, then shutdown cancellation.
      expect(source.disconnect).toHaveBeenCalledTimes(1);
    }
  });
  it('resumes sparse music after a long frame gap without replaying overdue notes', async () => {
    const harness = audioHarness();
    const audio = new AudioZoneManager();
    await audio.unlock();
    audio.setMusicContext({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'clear', indoors: false });
    harness.context().currentTime = 0.4;
    audio.update();
    harness.starts.length = 0;
    harness.context().currentTime = 3600;
    audio.update();
    expect(harness.starts.length).toBeLessThanOrEqual(1);
    expect(harness.starts.every(at => at >= 3600)).toBe(true);
    harness.context().currentTime = 3600.4;
    audio.update();
    expect(harness.starts).toHaveLength(1);
    expect(harness.starts[0]).toBeGreaterThanOrEqual(3600);
    audio.dispose();
  });
  it('does not allocate music voices while the audio context is suspended', async () => {
    const harness = audioHarness();
    const audio = new AudioZoneManager();
    await audio.unlock();
    audio.setMusicContext({ districtId: 'bay_steps', gameMinutes: 18 * 60, weather: 'clear', indoors: false });
    harness.context().state = 'suspended';
    harness.context().currentTime = 1;
    audio.update();
    expect(harness.starts).toHaveLength(0);
    audio.dispose();
  });
});
