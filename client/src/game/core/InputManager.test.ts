import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './InputManager';

describe('InputManager disabled state', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps controller look speed constant across 30 and 120 FPS', () => {
    vi.stubGlobal('navigator', { getGamepads: () => [{ connected: true, axes: [0, 0, 1, 0], buttons: [] }] });
    const manager = new InputManager(document.createElement('canvas'));
    manager.enable();
    const slow = Array.from({ length: 30 }, () => manager.consumeSnapshot(1 / 30).lookDeltaX).reduce((a, b) => a + b, 0);
    const fast = Array.from({ length: 120 }, () => manager.consumeSnapshot(1 / 120).lookDeltaX).reduce((a, b) => a + b, 0);
    expect(slow).toBeCloseTo(fast, 5);
    manager.disable();
  });

  it('clears movement and accumulated look when pointer capture is released', () => {
    const canvas = document.createElement('canvas');
    const manager = new InputManager(canvas);
    manager.enable();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(manager.consumeSnapshot().moveZ).toBe(0);
    const motion = new MouseEvent('mousemove');
    Object.defineProperty(motion, 'movementX', { value: 100 });
    window.dispatchEvent(motion);
    expect(manager.consumeSnapshot().lookDeltaX).toBe(0);
    manager.disable();
  });

  it('clears held movement when the browser loses focus', () => {
    const manager = new InputManager(document.createElement('canvas'));
    manager.enable();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(manager.consumeSnapshot().moveZ).toBe(1);
    window.dispatchEvent(new Event('blur'));
    expect(manager.consumeSnapshot().moveZ).toBe(0);
    manager.disable();
  });

  it('reports the bicycle bell once per press of its binding', () => {
    const manager = new InputManager(document.createElement('canvas'));
    manager.enable();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
    expect(manager.consumeSnapshot().bellPressed).toBe(true);
    expect(manager.consumeSnapshot().bellPressed).toBe(false);
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
  it('clears held movement when the browser window loses focus', () => {
    vi.stubGlobal('navigator', { getGamepads: vi.fn(() => []) });
    const canvas = document.createElement('canvas');
    const manager = new InputManager(canvas);
    manager.enable();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(manager.consumeSnapshot().moveZ).toBe(1);

    window.dispatchEvent(new Event('blur'));
    expect(manager.consumeSnapshot().moveZ).toBe(0);

    manager.disable();
  });

});
