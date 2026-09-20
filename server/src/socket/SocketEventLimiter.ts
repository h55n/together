export class SocketEventLimiter {
  private windowStartedAt = 0;
  private count = 0;

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isFinite(maxEvents) || maxEvents < 1) throw new Error('maxEvents must be positive');
    if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error('windowMs must be positive');
  }

  allow(): boolean {
    const time = this.now();
    if (this.windowStartedAt === 0 || time - this.windowStartedAt >= this.windowMs) {
      this.windowStartedAt = time;
      this.count = 0;
    }
    this.count += 1;
    return this.count <= this.maxEvents;
  }
}
