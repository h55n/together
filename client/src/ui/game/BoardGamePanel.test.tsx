import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { acceptBoardGameCommand, createBoardGame, type BoardGameCommand } from '@together/shared';
import { BoardGamePanel } from './BoardGamePanel';
import type { ActivitySessionView } from './ActivityPanel';

describe('shared illustrated pairs table', () => {
  it('allows actual first and second flips, requires explicit continue for mismatch and guards duplicate commands', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
    let match = createBoardGame(['solo'], 8), finish!: () => void;
    const command = vi.fn((_: BoardGameCommand) => new Promise<void>(resolve => { finish = resolve; })), close = vi.fn();
    const render = () => root.render(<BoardGamePanel session={{ id: 'table', state: { boardGame: match } } as ActivitySessionView} userId="solo" busy={false} message={null} onCommand={command} onClose={close} />);
    try {
      await act(async () => render());
      const cards = () => host.querySelectorAll<HTMLButtonElement>('[role="group"] button');
      expect(cards()).toHaveLength(12); expect(cards()[0]!.getAttribute('aria-label')).toContain('face down');
      await act(async () => { cards()[0]!.click(); cards()[0]!.click(); });
      expect(command).toHaveBeenCalledOnce();
      match = acceptBoardGameCommand(match, 'solo', command.mock.calls[0]![0]);
      await act(async () => { finish(); render(); });
      expect(cards()[0]!.getAttribute('aria-label')).toContain(match.cards[0]!.label);
      const mismatch = match.cards.findIndex(card => card.pair !== match.cards[0]!.pair);
      await act(async () => cards()[mismatch]!.click());
      match = acceptBoardGameCommand(match, 'solo', command.mock.calls[1]![0]);
      await act(async () => { finish(); render(); });
      expect(Array.from(cards()).every(card => card.disabled)).toBe(true);
      expect(host.textContent).toContain('Those cards are different');
      const continueButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.startsWith('Continue'))!;
      await act(async () => continueButton.click());
      expect(command.mock.calls[2]![0]).toMatchObject({ kind: 'continue', expectedRevision: 2 });
      await act(async () => host.querySelector('button')!.click()); expect(close).toHaveBeenCalledOnce();
      await act(async () => finish());
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
  it('turn and spectator views cannot submit another player’s flips', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
    const match = createBoardGame(['a', 'b'], 1), command = vi.fn(async (_: BoardGameCommand) => {});
    try {
      for (const userId of ['b', 'spectator']) {
        await act(async () => root.render(<BoardGamePanel session={{ id: 'table', state: { boardGame: match } } as ActivitySessionView} userId={userId} busy={false} message={null} onCommand={command} onClose={() => {}} />));
        expect(Array.from(host.querySelectorAll<HTMLButtonElement>('[role="group"] button')).every(card => card.disabled)).toBe(true);
      }
      expect(command).not.toHaveBeenCalled();
    } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
  });
});
