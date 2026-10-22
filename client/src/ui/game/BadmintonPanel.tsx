import { useEffect, useRef, useState, type ReactElement } from 'react';
import { badmintonShuttlePosition, type BadmintonCommand } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

export function BadmintonPanel(props: {
  session: ActivitySessionView; userId?: string; busy: boolean; message: string | null;
  onCommand: (command: BadmintonCommand) => Promise<void>; onClose: () => void;
}): ReactElement | null {
  const match = props.session.state.badminton;
  const [aim, setAim] = useState(0); const [depth, setDepth] = useState(5.1);
  const [loft, setLoft] = useState(3.6);
  const [now, setNow] = useState(match?.updatedAt ?? 0);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!match) return;
    const received = performance.now(); let frame = 0;
    const baseline = props.session.serverNow ?? match.updatedAt;
    const animate = () => { setNow(baseline + performance.now() - received); frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [match, props.session.serverNow]);
  if (!match) return null;
  const side = match.players[0] === props.userId ? 0 : match.players[1] === props.userId ? 1 : -1;
  const ended = match.phase === 'finished' || match.phase === 'cancelled';
  const position = match.flight ? badmintonShuttlePosition(match.flight, Math.max(now, props.session.serverNow ?? match.updatedAt)) : null;
  const incoming = side >= 0 && match.phase === 'rally' && !!match.flight && match.flight.lastHitBy !== side;
  const canHit = incoming && !!position && Math.abs(position.x) <= 6.5 && Math.abs(position.z) <= 3.05
    && position.x * (side === 0 ? -1 : 1) >= 1.5 && position.y >= 0.45 && position.y <= 3.6;
  const npcServe = match.players[match.server] === null;
  const canServe = side >= 0 && match.phase === 'ready' && (match.server === side || npcServe);
  const busy = props.busy || pending;
  const send = async (kind: BadmintonCommand['kind']) => {
    if (busy || sending.current || side < 0) return;
    sending.current = true; setPending(true); setError(null);
    try { await props.onCommand({ id: crypto.randomUUID(), expectedRevision: match.revision, kind, ...(kind === 'serve' || kind === 'hit' ? { aimZ: aim, depth, loft } : {}) }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send the shot. Try again.'); }
    finally { sending.current = false; setPending(false); }
  };
  return <section className="badminton-controls" role="dialog" aria-modal="true" aria-label="Badminton court" style={{ position: 'absolute', right: 20, bottom: 90, width: 'min(340px, calc(100vw - 40px))', padding: 16, borderRadius: 18, background: 'rgba(25,43,39,.94)', color: '#fff5dc', pointerEvents: 'auto' }}>
    <strong>Badminton · {match.score[0]} : {match.score[1]}</strong>
    <p style={{ margin: '6px 0', fontSize: 13 }}>{match.players[1] ? 'Two players' : 'You & Neighbour'} · {match.completedRallies} rallies</p>
    <svg viewBox="0 0 280 125" role="img" aria-label="Live shuttle and court" style={{ width: '100%', background: '#34645b', borderRadius: 8 }}>
      <rect x="12" y="10" width="256" height="105" fill="none" stroke="#f6edce" />
      <path d="M140 10V115 M12 62.5H268 M52 10V115 M228 10V115" stroke="#e8dfc4" opacity=".6" />
      <circle cx="58" cy="62.5" r="6" fill="#f0b861" /><circle cx="222" cy="62.5" r="6" fill="#84d9e4" />
      {position && <><circle cx={140 + position.x * 19.7} cy={62.5 + position.z * 17.2} r="3" fill="#172d29" opacity=".6" /><circle cx={140 + position.x * 19.7} cy={62.5 + position.z * 17.2 - position.y * 6} r="4.5" fill="#fffde6" /></>}
    </svg>
    <p aria-live="polite" style={{ margin: '8px 0', minHeight: 40 }}>{ended ? 'Game ended. Take your time here.' : canServe ? npcServe ? 'Ready when you are — invite the next serve or finish.' : 'Your serve.' : canHit ? 'Within reach — return now!' : match.phase === 'ready' ? 'Waiting for the next serve.' : 'Watch the shuttle cross to your side. Early and late swings can miss.'}</p>
    {!ended && <><label style={{ display: 'block' }}>Aim across court <input aria-label="Shot aim" type="range" min="-3.5" max="3.5" step="0.1" value={aim} onChange={event => setAim(Number(event.target.value))} /></label>
      <label style={{ display: 'block' }}>Shot depth <input aria-label="Shot depth" type="range" min="2" max="7" step="0.1" value={depth} onChange={event => setDepth(Number(event.target.value))} /></label>
      <label style={{ display: 'block' }}>Shot height <input aria-label="Shot height" type="range" min="0.1" max="4" step="0.1" value={loft} onChange={event => setLoft(Number(event.target.value))} /></label>
      <div className="entry-actions"><button className="primary-action" disabled={busy || !canServe} onClick={() => void send('serve')}>{npcServe ? 'Next rally' : 'Serve'}</button>
        <button className="primary-action" disabled={busy || !incoming} onClick={() => void send('hit')}>Return</button>
        <button disabled={busy || side < 0 || match.phase !== 'ready' || match.completedRallies < 1} onClick={() => void send('finish')}>Finish game</button>
        <button disabled={busy || side < 0} onClick={() => void send('cancel')}>Leave court</button></div></>}
    {ended && <button onClick={props.onClose}>Close</button>}
    {props.message && <p role="status">{props.message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
