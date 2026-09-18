import { DEFAULT_CONTROL_BINDINGS, normalizeGamepadAxes, readStandardGamepadButtons, type ControlBindings } from '@together/shared';

export type InputSnapshot = {
  moveX: number;
  moveZ: number;
  jog: boolean;
  interactPressed: boolean;
  cameraTogglePressed: boolean;
  transportDismountPressed: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
};

const NEUTRAL_INPUT: InputSnapshot = {
  moveX: 0,
  moveZ: 0,
  jog: false,
  interactPressed: false,
  cameraTogglePressed: false,
  transportDismountPressed: false,
  lookDeltaX: 0,
  lookDeltaY: 0,
};

const NEUTRAL_GAMEPAD_BUTTONS = { interact: false, jog: false, cameraToggle: false, dismount: false };

export class InputManager {
  private readonly keys = new Set<string>();
  private pressed = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private enabled = false;
  private previousGamepadButtons = { ...NEUTRAL_GAMEPAD_BUTTONS };
  private bindings: ControlBindings = { ...DEFAULT_CONTROL_BINDINGS };

  constructor(private readonly canvas: HTMLCanvasElement) {}

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.resetTransientInput);
    this.canvas.addEventListener('click', this.requestPointerLock);
  }

  disable(): void {
    if (this.enabled) {
      this.enabled = false;
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('blur', this.resetTransientInput);
      this.canvas.removeEventListener('click', this.requestPointerLock);
    }
    this.resetTransientInput();
  }

  setBindings(bindings: ControlBindings): void { this.bindings = { ...bindings }; }

  consumeSnapshot(): InputSnapshot {
    if (!this.enabled) {
      this.pressed.clear();
      this.lookDeltaX = 0;
      this.lookDeltaY = 0;
      this.previousGamepadButtons = { ...NEUTRAL_GAMEPAD_BUTTONS };
      return { ...NEUTRAL_INPUT };
    }

    const left = this.keys.has(this.bindings.left) ? 1 : 0;
    const right = this.keys.has(this.bindings.right) ? 1 : 0;
    const forward = this.keys.has(this.bindings.forward) ? 1 : 0;
    const back = this.keys.has(this.bindings.back) ? 1 : 0;
    const gamepad = navigator.getGamepads?.().find((candidate): candidate is Gamepad => Boolean(candidate?.connected)) ?? null;
    const moveStick = gamepad ? normalizeGamepadAxes(gamepad.axes[0] ?? 0, gamepad.axes[1] ?? 0) : { x: 0, y: 0 };
    const lookStick = gamepad ? normalizeGamepadAxes(gamepad.axes[2] ?? 0, gamepad.axes[3] ?? 0, 0.15) : { x: 0, y: 0 };
    const gamepadButtons = gamepad ? readStandardGamepadButtons(gamepad.buttons.map((button) => button.pressed)) : { ...NEUTRAL_GAMEPAD_BUTTONS };
    const snapshot: InputSnapshot = {
      moveX: Math.abs(moveStick.x) > 0 ? moveStick.x : right - left,
      moveZ: Math.abs(moveStick.y) > 0 ? -moveStick.y : forward - back,
      jog: this.keys.has(this.bindings.jog) || gamepadButtons.jog,
      interactPressed: this.pressed.has(this.bindings.interact) || (gamepadButtons.interact && !this.previousGamepadButtons.interact),
      cameraTogglePressed: this.pressed.has(this.bindings.cameraToggle) || (gamepadButtons.cameraToggle && !this.previousGamepadButtons.cameraToggle),
      transportDismountPressed: this.pressed.has(this.bindings.dismount) || (gamepadButtons.dismount && !this.previousGamepadButtons.dismount),
      lookDeltaX: this.lookDeltaX + lookStick.x * 10,
      lookDeltaY: this.lookDeltaY + lookStick.y * 10,
    };
    this.previousGamepadButtons = gamepadButtons;
    this.pressed = new Set();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return snapshot;
  }

  private readonly resetTransientInput = (): void => {
    this.keys.clear();
    this.pressed.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.previousGamepadButtons = { ...NEUTRAL_GAMEPAD_BUTTONS };
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat) this.pressed.add(event.code);
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.lookDeltaX += event.movementX;
    this.lookDeltaY += event.movementY;
  };

  private readonly requestPointerLock = (): void => {
    if (document.pointerLockElement !== this.canvas) void this.canvas.requestPointerLock();
  };
}
