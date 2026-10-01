import { describe, expect, it, vi } from 'vitest';
import { observeDeviceLoss } from './DeviceLoss';
describe('renderer device loss', () => {
  it('requests a fresh compatibility renderer after a lost device', async () => {
    const recover = vi.fn();
    observeDeviceLoss(Promise.resolve({ reason: 'unknown' }), () => false, recover);
    await Promise.resolve(); expect(recover).toHaveBeenCalledOnce();
  });
  it('does not restart a disposed renderer or intentionally destroyed device', async () => {
    const recover = vi.fn();
    observeDeviceLoss(Promise.resolve({ reason: 'unknown' }), () => true, recover);
    observeDeviceLoss(Promise.resolve({ reason: 'destroyed' }), () => false, recover);
    await Promise.resolve(); expect(recover).not.toHaveBeenCalled();
  });
});
