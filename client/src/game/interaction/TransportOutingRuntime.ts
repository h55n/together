import { TRANSPORT_PROFILES } from '@together/shared';

type Mode = 'bicycle' | 'kayak' | 'scooter';
type Point = { x: number; z: number };
type Frame = { position: Point; mode: string; deltaSeconds: number; enabled: boolean; safeWeather: boolean };
type Finish = { underway: boolean; kind: Mode };
type CancelReason = 'transport_changed' | 'unsafe_weather' | 'menu' | 'invalid_sample' | 'relocated' | 'cancelled' | 'disposed';
type Outcome = ({ state: 'finished' } & Finish) | { state: 'cancelled'; reason: CancelReason };
type Snapshot = { state: 'active'; underway: boolean } | Outcome;

/** Free leisure: no score, timer target, route quota or automatic completion. */
export class TransportOutingRuntime {
  private previous: Point;
  private departureOrigin: Point;
  private underway = false;
  private ended = false;
  private armed = false;
  private terminal: Outcome | null = null;
  private settle!: (outcome: Outcome) => void;
  readonly completion: Promise<Outcome>;

  constructor(private readonly kind: Mode, origin: Point, private readonly colliderRadius = 0.32) {
    this.previous = { ...origin };
    this.departureOrigin = { ...origin };
    this.completion = new Promise(resolve => { this.settle = resolve; });
  }

  sample(frame: Frame): Snapshot {
    if (this.ended) return this.snapshot();
    if (frame.mode !== this.kind) { this.cancel('transport_changed'); return this.snapshot(); }
    if (!frame.safeWeather) { this.cancel('unsafe_weather'); return this.snapshot(); }
    if (!frame.enabled) { if (this.armed) this.cancel('menu'); return this.snapshot(); }
    this.armed = true;
    const current = frame.position;
    if (![current.x, current.z, frame.deltaSeconds].every(Number.isFinite)) { this.cancel('invalid_sample'); return this.snapshot(); }
    const previous = this.previous;
    this.previous = { ...current };
    const dt = frame.deltaSeconds;
    if (dt <= 0 || dt > 0.25) { if (!this.underway) this.departureOrigin = { ...current }; return this.snapshot(); }
    const distance = Math.hypot(current.x - previous.x, current.z - previous.z);
    if (distance > TRANSPORT_PROFILES[this.kind].maxSpeed * dt + 0.04) { this.cancel('relocated'); return this.snapshot(); }
    // Existing capsule radius is a physics jitter tolerance, not a travel goal.
    if (distance > 0.0001 && Math.hypot(current.x - this.departureOrigin.x, current.z - this.departureOrigin.z) > this.colliderRadius) this.underway = true;
    return this.snapshot();
  }

  /** Only an explicit player park/return request finishes the operation. */
  finish(): Finish | null {
    if (this.ended) return null;
    this.ended = true;
    const finish = { underway: this.underway, kind: this.kind };
    this.terminal = { state: 'finished', ...finish };
    this.settle(this.terminal);
    return finish;
  }

  snapshot(): Snapshot { return this.terminal ?? { state: 'active', underway: this.underway }; }
  cancel(reason: CancelReason = 'cancelled'): void {
    if (this.ended) return;
    this.ended = true;
    this.terminal = { state: 'cancelled', reason };
    this.settle(this.terminal);
  }
  dispose(): void { this.cancel('disposed'); }
}
