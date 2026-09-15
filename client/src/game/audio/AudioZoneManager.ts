import { musicVoicing, selectMusicState, type DistrictId, type MusicState, type WeatherState } from '@together/shared';

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
  private source: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private targetAmbienceVolume = 0.018;
  private masterScale = 0.75;
  private musicScale = 0.62;
  private musicState: MusicState = 'silence';
  private nextMusicNoteAt = 0;
  private musicNoteIndex = 0;

  async unlock(): Promise<void> {
    if (!this.context) this.createGraph();
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  setZone(zone: 'lantern_street' | 'rain' | 'quiet'): void {
    this.targetAmbienceVolume = zone === 'quiet' ? 0.008 : zone === 'rain' ? 0.025 : 0.018;
    if (this.filter) this.filter.frequency.value = zone === 'rain' ? 850 : 1250;
  }

  setMusicContext(context: { districtId?: DistrictId; gameMinutes: number; weather: WeatherState; indoors: boolean }): void {
    const next = selectMusicState(context);
    if (next === this.musicState) return;
    this.musicState = next;
    this.musicNoteIndex = 0;
    if (this.context) this.nextMusicNoteAt = this.context.currentTime + 0.35;
  }

  setMasterVolume(volume: number): void {
    this.masterScale = clamp01(volume);
  }

  setMusicVolume(volume: number): void {
    this.musicScale = clamp01(volume);
  }

  update(): void {
    if (!this.master || !this.context || !this.ambienceBus || !this.musicBus) return;
    this.master.gain.setTargetAtTime(this.masterScale, this.context.currentTime, 0.7);
    this.ambienceBus.gain.setTargetAtTime(this.targetAmbienceVolume, this.context.currentTime, 0.7);
    const voice = musicVoicing(this.musicState);
    this.musicBus.gain.setTargetAtTime(voice.gain * this.musicScale, this.context.currentTime, 1.1);
    if (voice.notes.length === 0) return;

    const secondsPerBeat = 60 / voice.bpm;
    while (this.nextMusicNoteAt <= this.context.currentTime + 0.15) {
      const frequency = voice.notes[this.musicNoteIndex % voice.notes.length]!;
      this.scheduleNote(frequency, voice.waveform, this.nextMusicNoteAt, Math.min(2.4, secondsPerBeat * 2.6));
      this.musicNoteIndex += 1;
      // Leave breathing room between notes so music remains sparse.
      this.nextMusicNoteAt += secondsPerBeat * 2;
    }
  }

  dispose(): void {
    this.source?.stop();
    this.source?.disconnect();
    this.filter?.disconnect();
    this.ambienceBus?.disconnect();
    this.musicBus?.disconnect();
    this.master?.disconnect();
    if (this.context) void this.context.close();
    this.source = null;
    this.filter = null;
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
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1250;

    const seconds = 3;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.985 + white * 0.015;
      channel[i] = previous * 0.65;
    }
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.filter).connect(this.ambienceBus).connect(this.master).connect(this.context.destination);
    this.musicBus.connect(this.master);
    this.source.start();
    this.nextMusicNoteAt = this.context.currentTime + 0.5;
  }

  private scheduleNote(frequency: number, waveform: OscillatorType, at: number, duration: number): void {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(0.32, at + 0.22);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(this.musicBus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
