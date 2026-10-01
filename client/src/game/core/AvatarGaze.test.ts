import { describe, expect, it } from 'vitest';
import { gazeAngles } from '../player/gazeMath';
describe('avatar gaze', () => {
  it('takes the short turn across the angle wrap and constrains the neck', () => {
    expect(gazeAngles(-Math.PI + .1, .2, Math.PI - .1).yaw).toBeCloseTo(.2);
    expect(gazeAngles(3, 2, 0)).toEqual({ yaw: .8, pitch: .45 });
    expect(gazeAngles(-3, -2, 0)).toEqual({ yaw: -.8, pitch: -.45 });
  });
  it('neutralizes invalid look values', () => {
    expect(gazeAngles(NaN, Infinity, 0)).toEqual({ yaw: 0, pitch: 0 });
  });
});
