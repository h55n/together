import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './InputManager';

describe('InputManager disabled state', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('clears held movement when the browser loses focus', () => {
    const manager = new InputManager(document.createElement('canvas'));
    manager.enable();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(manager.consumeSnapshot().moveZ).toBe(1);
    window.dispatchEvent(new Event('blur'));
    expect(manager.consumeSnapshot().moveZ).toBe(0);
    manager.disable();
  });

  it('supports canvas drag look without rotating from movements over menus', () => {
    const canvas = document.createElement('canvas'); document.body.append(canvas);
    const manager = new InputManager(canvas); manager.enable();
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    const drag = new MouseEvent('mousemove', { bubbles: true });
    Object.defineProperties(drag, { movementX: { value: 24 }, movementY: { value: -8 } });
    canvas.dispatchEvent(drag);
    expect(manager.consumeSnapshot().lookDeltaX).toBe(24);
    window.dispatchEvent(new MouseEvent('mouseup'));
    window.dispatchEvent(drag);
    expect(manager.consumeSnapshot().lookDeltaX).toBe(0);
    manager.disable(); canvas.remove();
  });

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
