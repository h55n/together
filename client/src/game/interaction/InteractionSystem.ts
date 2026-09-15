import { selectInteraction, type ActivityId, type AvatarAction, type HomeAction, type MicroActionStep, type TransportMode } from '@together/shared';

export type WorldInteraction = {
  id: string;
  label: string;
  action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>;
  x: number;
  z: number;
  radius: number;
  priority: number;
  durationSeconds?: number;
  sequence?: readonly MicroActionStep[];
  completionAction?: HomeAction;
  activityId?: ActivityId;
  npcId?: string;
  transportMode?: Extract<TransportMode, 'bicycle' | 'scooter' | 'kayak'>;
};

export class InteractionSystem {
  private current: WorldInteraction | undefined;
  private enabled = true;

  constructor(
    private readonly interactions: readonly WorldInteraction[],
    private readonly onPrompt?: (prompt: string | null) => void,
  ) {}

  update(view: { x: number; z: number; yaw: number }): WorldInteraction | undefined {
    if (!this.enabled) return undefined;
    const next = selectInteraction(view, this.interactions);
    if (next?.id !== this.current?.id) {
      this.current = next;
      this.onPrompt?.(next ? `E · ${next.label}` : null);
    }
    return this.current;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.current = undefined;
    this.onPrompt?.(null);
  }

  active(): WorldInteraction | undefined {
    return this.current;
  }

  dispose(): void {
    this.current = undefined;
    this.onPrompt?.(null);
  }
}
