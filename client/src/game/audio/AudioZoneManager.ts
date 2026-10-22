import { musicVoicing, selectMusicState, type DistrictId, type MusicState, type WeatherState } from '@together/shared';

export type ActivitySound = 'golf_putt' | 'golf_cup' | 'racket_hit' | 'shuttle_fault' | 'cycle_bell' | 'paddle';
type BufferVoice = { source: AudioBufferSourceNode; envelope: GainNode };
type MusicVoice = { oscillator: OscillatorNode; envelope: GainNode };
type AmbienceKind = 'wind' | 'water' | 'birds' | 'rain';
type AmbienceLayer = { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode; target: number };

/**
 * Procedural ambience + sparse development music.
 * Authored/licensed stems can replace the synth voice later without changing the
 * state-selection API. Ordinary city walking intentionally spends long periods
 * with ambience only.
 */
export class AudioZoneManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private disposed = false;
  private suspended = false;
  private readonly layers = new Map<AmbienceKind, AmbienceLayer>();
  private districtId: DistrictId | undefined;
  private weather: WeatherState = 'clear';
  private indoors = false;
  private targetAmbienceVolume = 0.018;
  private masterScale = 0.75;
  private musicScale = 0.62;
  private musicState: MusicState = 'silence';
  private nextMusicNoteAt = 0;
  private musicNoteIndex = 0;
  private readonly footstepBuffers = new Map<'hard' | 'soft', AudioBuffer>();
  private readonly footstepVoices = new Set<BufferVoice>();
  private readonly effectBuffers = new Map<ActivitySound, AudioBuffer>();
  private readonly effectVoices = new Set<BufferVoice>();
  private readonly musicVoices = new Set<MusicVoice>();

  async unlock(): Promise<void> {
    if (this.disposed) return;
    if (!this.context) this.createGraph();
    if (!this.suspended && this.context?.state === 'suspended') await this.context.resume();
  }

  setSuspended(suspended: boolean): void {
    if (this.disposed || this.suspended === suspended) return;
    this.suspended = suspended;
    if (suspended) {
      this.stopTransientVoices();
      const context = this.context;
      if (context?.state === 'running') void context.suspend().then(async () => {
        // A quick hide/show may reverse the request before suspend resolves.
        if (this.context === context && !this.disposed && !this.suspended) await context.resume();
      }).catch(() => undefined);
    } else if (this.context?.state === 'suspended') {
      const context = this.context;
      void context.resume().then(async () => {
        if (this.context === context && !this.disposed && this.suspended) await context.suspend();
      }).catch(() => undefined);
    }
  }

  setZone(zone: 'lantern_street' | 'rain' | 'quiet'): void {
    this.targetAmbienceVolume = zone === 'quiet' ? 0.008 : zone === 'rain' ? 0.025 : 0.018;
    if (zone === 'rain') this.weather = 'light_rain';
    else if (zone === 'lantern_street') this.weather = 'clear';
    this.mixDistrictLayers();
  }

  setDistrictContext(districtId: DistrictId | undefined, weather: WeatherState, indoors: boolean): void {
    if (this.districtId === districtId && this.weather === weather && this.indoors === indoors) return;
    this.districtId = districtId; this.weather = weather; this.indoors = indoors;
    this.mixDistrictLayers();
  }

  setMusicContext(context: { districtId?: DistrictId; gameMinutes: number; weather: WeatherState; indoors: boolean }): void {
    this.setDistrictContext(context.districtId, context.weather, context.indoors);
    const next = selectMusicState(context);
    if (next === this.musicState) return;
    this.musicState = next;
    this.musicNoteIndex = 0;
    if (this.context) this.nextMusicNoteAt = this.context.currentTime + 0.35;
  }

  setMasterVolume(volume: number): void {
    this.masterScale = clamp01(volume);
    if (this.masterScale === 0) {
      this.master?.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
      this.stopTransientVoices();
    }
  }

  setMusicVolume(volume: number): void {
    this.musicScale = clamp01(volume);
    if (this.musicScale === 0) {
      this.musicBus?.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
      this.stopMusicVoices();
    }
  }

  playActivitySound(kind: ActivitySound): void {
    const context = this.context;
    if (!context || !this.master || this.disposed || this.suspended || context.state !== 'running' || this.masterScale <= 0 || this.effectVoices.size >= 8) return;
    let buffer = this.effectBuffers.get(kind);
    if (!buffer) {
      buffer = activityBuffer(context, kind);
      this.effectBuffers.set(kind, buffer);
    }
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = buffer; envelope.gain.value = kind === 'cycle_bell' ? 0.085 : kind === 'paddle' ? 0.16 : 0.12;
    source.connect(envelope).connect(this.master);
    const voice = { source, envelope };
    this.effectVoices.add(voice);
    source.onended = () => this.releaseBufferVoice(voice, this.effectVoices);
    source.start(context.currentTime); source.stop(context.currentTime + buffer.duration + 0.02);
  }

  playFootstep(speed: number, surface: 'hard' | 'soft' = 'hard'): void {
    const context = this.context;
    if (!context || !this.master || this.disposed || this.suspended || context.state !== 'running' || !Number.isFinite(speed) || speed <= 0 || this.masterScale <= 0 || this.footstepVoices.size >= 6) return;
    let buffer = this.footstepBuffers.get(surface);
    if (!buffer) {
      const duration = surface === 'hard' ? 0.14 : 0.18;
      buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 1937, previous = 0;
      for (let index = 0; index < data.length; index++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = seed / 4294967296 * 2 - 1;
        previous = previous * 0.65 + noise * 0.35;
        const t = index / context.sampleRate;
        const attack = Math.min(1, t / 0.004);
        const thud = Math.sin(t * Math.PI * 2 * 105) * Math.exp(-t * 38);
        data[index] = attack * (thud * 0.38 + previous * (surface === 'hard' ? 0.28 : 0.12)) * Math.exp(-t * 22);
      }
      this.footstepBuffers.set(surface, buffer);
    }
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = buffer;
    envelope.gain.value = 0.16 + Math.min(3.2, speed) / 3.2 * 0.08;
    source.connect(envelope).connect(this.master);
    const voice = { source, envelope };
    this.footstepVoices.add(voice);
    source.onended = () => this.releaseFootstep(voice);
    source.start(context.currentTime);
    source.stop(context.currentTime + 0.2);
  }

  update(): void {
    if (!this.master || !this.context || !this.ambienceBus || !this.musicBus) return;
    if (this.disposed || this.suspended || this.context.state !== 'running') return;
    this.master.gain.setTargetAtTime(this.masterScale, this.context.currentTime, 0.7);
    this.ambienceBus.gain.setTargetAtTime(this.targetAmbienceVolume, this.context.currentTime, 0.7);
    for (const layer of this.layers.values()) layer.gain.gain.setTargetAtTime(layer.target, this.context.currentTime, 1.2);
    const voice = musicVoicing(this.musicState);
    this.musicBus.gain.setTargetAtTime(voice.gain * this.musicScale, this.context.currentTime, 1.1);
    if (voice.notes.length === 0 || this.masterScale <= 0 || this.musicScale <= 0) return;

    const secondsPerBeat = 60 / voice.bpm;
    const spacing = secondsPerBeat * 2;
    const now = this.context.currentTime;
    if (this.nextMusicNoteAt < now - 0.15) {
      // Background tabs may stop animation frames while audio time advances.
      // Keep the phrase phase, but skip notes that are already in the past.
      const missed = Math.ceil((now - this.nextMusicNoteAt) / spacing);
      this.musicNoteIndex += missed;
      this.nextMusicNoteAt += missed * spacing;
    }
    while (this.nextMusicNoteAt <= this.context.currentTime + 0.15) {
      const frequency = voice.notes[this.musicNoteIndex % voice.notes.length]!;
      this.scheduleNote(frequency, voice.waveform, Math.max(now, this.nextMusicNoteAt), Math.min(2.4, secondsPerBeat * 2.6));
      this.musicNoteIndex += 1;
      // Leave breathing room between notes so music remains sparse.
      this.nextMusicNoteAt += spacing;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTransientVoices();
    this.footstepBuffers.clear();
    this.effectBuffers.clear();
    for (const layer of this.layers.values()) { layer.source.stop(); layer.source.disconnect(); layer.filter.disconnect(); layer.gain.disconnect(); }
    this.layers.clear();
    this.ambienceBus?.disconnect();
    this.musicBus?.disconnect();
    this.master?.disconnect();
    if (this.context) void this.context.close().catch(() => undefined);
    this.ambienceBus = null;
    this.musicBus = null;
    this.master = null;
    this.context = null;
  }

  private createGraph(): void {
    const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.ambienceBus = this.context.createGain();
    this.ambienceBus.gain.value = 0;
    this.musicBus = this.context.createGain();
    this.musicBus.gain.value = 0;
    this.ambienceBus.connect(this.master).connect(this.context.destination);
    this.musicBus.connect(this.master);
    for (const kind of ['wind', 'water', 'birds', 'rain'] as const) {
      const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
      source.buffer = ambienceBuffer(this.context, kind); source.loop = true;
      filter.type = kind === 'birds' ? 'highpass' : kind === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = kind === 'birds' ? 1100 : kind === 'rain' ? 1600 : kind === 'water' ? 1400 : 720;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.ambienceBus);
      this.layers.set(kind, { source, filter, gain, target: 0 });
      source.start();
    }
    this.mixDistrictLayers();
    this.nextMusicNoteAt = this.context.currentTime + 0.5;
  }

  private mixDistrictLayers(): void {
    const coast = this.districtId === 'bay_steps';
    const green = this.districtId === 'mogra_park' || this.districtId === 'hill_garden' || this.districtId === 'rain_tree_lane';
    const rain = this.weather === 'monsoon_rain' || this.weather === 'thunderstorm' ? 1 : this.weather === 'light_rain' ? 0.48 : 0;
    const outside = this.indoors ? 0.12 : 1;
    const mix: Record<AmbienceKind, number> = {
      wind: (this.weather === 'windy_evening' || this.weather === 'thunderstorm' ? 0.8 : 0.42) * outside,
      water: (coast ? 0.9 : 0) * outside,
      birds: rain > 0.6 ? 0 : (green ? 0.45 : coast ? 0.16 : 0.06) * (this.indoors ? 0.02 : 1),
      rain: rain * (this.indoors ? 0.35 : 1),
    };
    for (const [kind, layer] of this.layers) layer.target = mix[kind];
  }

  private releaseBufferVoice(voice: BufferVoice, voices: Set<BufferVoice>): void {
    if (!voices.delete(voice)) return;
    voice.source.onended = null;
    voice.source.disconnect(); voice.envelope.disconnect();
  }

  private stopMusicVoices(): void {
    for (const voice of this.musicVoices) {
      voice.oscillator.stop();
      this.releaseMusicVoice(voice);
    }
  }

  private stopTransientVoices(): void {
    for (const voices of [this.footstepVoices, this.effectVoices]) {
      for (const voice of voices) { voice.source.stop(); this.releaseBufferVoice(voice, voices); }
    }
    this.stopMusicVoices();
  }

  private releaseMusicVoice(voice: MusicVoice): void {
    if (!this.musicVoices.delete(voice)) return;
    voice.oscillator.onended = null;
    voice.oscillator.disconnect(); voice.envelope.disconnect();
  }

  private releaseFootstep(voice: { source: AudioBufferSourceNode; envelope: GainNode }): void {
    this.releaseBufferVoice(voice, this.footstepVoices);
  }

  private scheduleNote(frequency: number, waveform: OscillatorType, at: number, duration: number): void {
    if (!this.context || !this.musicBus || this.musicVoices.size >= 4) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(0.32, at + 0.22);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(this.musicBus);
    const voice = { oscillator, envelope };
    this.musicVoices.add(voice);
    oscillator.onended = () => this.releaseMusicVoice(voice);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** All waveforms are synthesized locally; no recording or external asset. */
function activityBuffer(context: AudioContext, kind: ActivitySound): AudioBuffer {
  const duration = kind === 'cycle_bell' ? 0.95 : kind === 'paddle' ? 0.42 : kind === 'golf_cup' ? 0.34 : 0.19;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 47893, smooth = 0;
  for (let index = 0; index < data.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 4294967296 * 2 - 1;
    smooth = smooth * 0.72 + noise * 0.28;
    const t = index / context.sampleRate, attack = Math.min(1, t / 0.004);
    const sine = (frequency: number) => Math.sin(t * Math.PI * 2 * frequency);
    let sample: number;
    if (kind === 'cycle_bell') sample = (sine(1520) * 0.48 + sine(2293) * 0.21 + sine(3187) * 0.09) * Math.exp(-t * 5.8);
    else if (kind === 'golf_putt') sample = (sine(410) * 0.42 + noise * 0.19) * Math.exp(-t * 42);
    else if (kind === 'golf_cup') sample = (sine(880) * 0.31 + sine(1318) * 0.19 + smooth * 0.15) * Math.exp(-t * 14);
    else if (kind === 'racket_hit') sample = (noise * 0.42 + sine(185) * 0.22) * Math.exp(-t * 48);
    else if (kind === 'shuttle_fault') sample = smooth * 0.45 * Math.exp(-t * 27);
    else sample = smooth * (0.52 + Math.sin(t * 13) * 0.18) * Math.sin(Math.PI * t / duration) ** 2;
    // A short taper removes DC/seam clicks at the buffer end.
    data[index] = attack * sample * Math.min(1, (duration - t) / 0.018);
  }
  return buffer;
}

function ambienceBuffer(context: AudioContext, kind: AmbienceKind): AudioBuffer {
  const duration = kind === 'birds' ? 12 : kind === 'water' ? 8 : 6;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), data = buffer.getChannelData(0);
  let seed = 39283, smooth = 0;
  for (let index = 0; index < data.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 4294967296 * 2 - 1, t = index / context.sampleRate;
    smooth = smooth * (kind === 'wind' ? 0.96 : 0.76) + noise * (kind === 'wind' ? 0.04 : 0.24);
    let sample = 0;
    if (kind === 'birds') {
      for (const start of [2.1, 7.4, 8.05]) {
        const elapsed = t - start;
        if (elapsed >= 0 && elapsed < 0.34) {
          const envelope = Math.sin(Math.PI * elapsed / 0.34) ** 2;
          sample += Math.sin(2 * Math.PI * (2100 * elapsed + 1800 * elapsed * elapsed)) * envelope * 0.28;
        }
      }
    } else if (kind === 'water') sample = smooth * (0.55 + 0.4 * Math.sin(t * Math.PI * 2 / duration)) + noise * 0.07;
    else if (kind === 'rain') sample = noise * 0.31 + smooth * 0.18;
    else sample = smooth * (0.5 + 0.2 * Math.sin(t * Math.PI * 4 / duration));
    const fade = Math.min(1, t / 0.06, (duration - t) / 0.06);
    data[index] = sample * fade;
  }
  return buffer;
}
