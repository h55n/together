import { useRef, useState, type ReactElement } from 'react';
import type { BoardGameCommand } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

export function BoardGamePanel(props: {
  session: ActivitySessionView; userId?: string; busy: boolean; message: string | null;
  onCommand: (command: BoardGameCommand) => Promise<void>; onClose: () => void;
}): ReactElement | null {
  const match = props.session.state.boardGame;
  const [posting, setPosting] = useState(false), [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  if (!match) return null;
  const myTurn = !!props.userId && match.turn === props.userId;
  const enabled = myTurn && !props.busy && !posting && match.phase !== 'complete';
  const send = async (kind: BoardGameCommand['kind'], index?: number) => {
    if (!enabled || sending.current) return;
    sending.current = true; setPosting(true); setError(null);
    try { await props.onCommand({ key: crypto.randomUUID(), expectedRevision: match.revision, kind, ...(index === undefined ? {} : { index }) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this card move.'); }
    finally { sending.current = false; setPosting(false); }
  };
  const pairs = match.matched.length / 2;
  return <section className="game-panel activity-panel" role="dialog" aria-modal="true" aria-label="Pairs around the table">
    <header className="panel-header"><div><p className="eyebrow">A quiet game together</p><h2>Pairs around the table</h2></div><button className="panel-close" onClick={props.onClose}>Leave table</button></header>
    <p className="panel-copy">Find the matching illustrations together. Turn over two cards, remember what you see, and pass the turn.</p>
    <p role="status">{match.phase === 'complete' ? 'All six pairs found. Thanks for a lovely game.' : match.phase === 'mismatch' ? 'Those cards are different. Take a moment to remember them, then continue.' : myTurn ? match.phase === 'awaiting_second' ? 'Choose a second card.' : 'Your turn — choose a card.' : `It is ${match.turn}’s turn.`}</p>
    <p>{pairs} of 6 pairs found · {match.attempts} attempt{match.attempts === 1 ? '' : 's'}</p>
    <div role="group" aria-label="Twelve illustrated cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
      {match.cards.map((card, index) => {
        const matched = match.matched.includes(index), faceUp = matched || match.revealed.includes(index);
        return <button key={index} type="button" aria-label={faceUp ? `Card ${index + 1}: ${card.label}${matched ? ', matched' : ''}` : `Card ${index + 1}, face down`} aria-pressed={faceUp}
          disabled={!enabled || matched || faceUp || match.phase === 'mismatch'} onClick={() => void send('flip', index)}
          style={{ minHeight: 86, borderRadius: 12, border: matched ? '2px solid #e2ba63' : '1px solid #7b9a82',
            background: faceUp ? '#f6eace' : '#346052', color: faceUp ? '#29493b' : '#f6eace', opacity: matched ? 0.85 : 1 }}>
          <span aria-hidden="true" style={{ display: 'block', fontSize: 28 }}>{faceUp ? card.symbol : '✦'}</span>
          <span style={{ fontSize: 12 }}>{faceUp ? card.label : index + 1}</span>
        </button>;
      })}
    </div>
    {match.phase === 'mismatch' && <button className="primary-action" disabled={!enabled} onClick={() => void send('continue')}>Continue — turn the cards over</button>}
    {(error || props.message) && <p role="alert">{error ?? props.message}</p>}
    {!props.userId || !match.players.includes(props.userId) ? <p>You are watching this table. Join the next game to play.</p> : null}
    <p className="muted-copy">{match.players.length} player{match.players.length === 1 ? '' : 's'} around the table. The pairs belong to everyone.</p>
  </section>;
}
