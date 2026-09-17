import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './InputManager';

describe('InputManager disabled state', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns neutral input without polling gamepads while disabled', () => {
    const getGamepads = vi.fn(() => [{
      connected: true,
      axes: [1, -1, 1, -1],
      buttons: Array.from({ length: 16 }, () => ({ pressed: true })),
    }]);
    vi.stubGlobal('navigator', { getGamepads });
    const manager = new InputManager({} as HTMLCanvasElement);

    expect(manager.consumeSnapshot()).toEqual({
      moveX: 0,
      moveZ: 0,
      jog: false,
      interactPressed: false,
      cameraTogglePressed: false,
      transportDismountPressed: false,
      lookDeltaX: 0,
      lookDeltaY: 0,
    });
    expect(getGamepads).not.toHaveBeenCalled();
  });
});
