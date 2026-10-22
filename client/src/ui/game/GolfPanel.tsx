import { useEffect, useRef, useState, type ReactElement } from 'react';
import { MINI_GOLF_HOLES, type GolfShotIntent } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

export function GolfPanel(props: {
  session: ActivitySessionView; userId?: string; busy: boolean; message: string | null;
  onShot: (shot: GolfShotIntent) => Promise<void>; onClose: () => void;
  onAim?: (angle: number, power: number) => void;
}): ReactElement | null {
  const round = props.session.state.golf;
  const [angle, setAngle] = useState(0), [power, setPower] = useState(0.5);
  const [posting, setPosting] = useState(false), [elapsed, setElapsed] = useState(Infinity);
  const sending = useRef(false), revision = useRef(round?.revision);
  const [error, setError] = useState<string | null>(null);
  const roundRevision = round?.revision;
  const shotDuration = round?.lastShot?.result.trace.at(-1)?.seconds ?? 0;
  useEffect(() => {
    if (roundRevision === undefined || roundRevision === revision.current) return;
    revision.current = roundRevision;
    let frame = 0; const start = performance.now();
    setElapsed(0);
    const animate = () => { const value = (performance.now() - start) / 1000; setElapsed(value); if (value < shotDuration) frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [roundRevision, shotDuration]);
  if (!round) return null;
  const receipt = round.lastShot;
  const rolling = elapsed < (receipt?.result.trace.at(-1)?.seconds ?? 0);
  const hole = MINI_GOLF_HOLES[rolling && receipt ? receipt.hole : round.hole]!;
  const trace = rolling && receipt ? receipt.result.trace : [];
  const traceIndex = trace.findIndex(point => point.seconds >= elapsed);
  const moving = traceIndex >= 0 ? trace[traceIndex] : undefined;
  const mine = !!props.userId && round.players.includes(props.userId);
  const canPutt = mine && round.turn === props.userId && round.status === 'active' && !props.busy && !posting && !rolling;
  const ball = round.balls[props.userId ?? round.turn ?? round.players[0]!] ?? hole.tee;
  const putt = async () => {
    if (!canPutt || sending.current) return;
    sending.current = true; setPosting(true); setError(null);
    try { await props.onShot({ key: crypto.randomUUID(), expectedRevision: round.revision, angle, power }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this putt.'); }
    finally { sending.current = false; setPosting(false); }
  };
  return <section className="game-panel activity-panel" role="dialog" aria-modal="true" aria-label="Hill Mini-Golf">
    <header className="panel-header"><div><p className="eyebrow">A little friendly competition</p><h2>Hill Mini-Golf · Hole {hole.index + 1}/6</h2></div><button className="panel-close" onClick={props.onClose}>Leave round</button></header>
    <p>{round.status === 'complete' ? 'Six greens played. Your outing is complete.' : rolling ? 'Ball rolling…' : round.turn === props.userId ? 'Your turn. Aim, choose power, and putt.' : `Waiting for ${round.turn} to putt.`}</p>
    <svg viewBox="-4 -2 8 4" role="img" aria-label="Overhead golf green, cup, balls and aiming direction" style={{ width: '100%', background: '#376646', borderRadius: 12 }}>
      <rect x={-hole.halfWidth} y={-hole.halfDepth} width={hole.halfWidth * 2} height={hole.halfDepth * 2} rx=".18" fill="#70a36a" stroke="#eadbc3" strokeWidth=".1" />
      <circle cx={hole.cup.x} cy={hole.cup.z} r=".13" fill="#13251c" />
      {receipt && receipt.hole === hole.index && <polyline points={receipt.result.trace.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#fff9" strokeWidth=".025" />}
      {!rolling && canPutt && <line x1={ball.x} y1={ball.z} x2={ball.x + Math.cos(angle) * (0.5 + power)} y2={ball.z + Math.sin(angle) * (0.5 + power)} stroke="#ffda79" strokeWidth=".06" />}
      {round.players.map((player, index) => { const point = rolling && receipt ? player === receipt.userId ? moving ?? receipt.result.ball : hole.tee : round.balls[player]!; return <circle key={player} cx={point.x} cy={point.z} r=".11" fill={['white', '#ffce72', '#8ce5d5', '#c9a5ff', '#f49cb4', '#96c4ff'][index]} opacity={!rolling && round.captured[player] ? 0 : 1} />; })}
    </svg>
    <label>Aim: {Math.round(angle * 180 / Math.PI)}°<input aria-label="Aim" type="range" min={-180} max={180} step={1} value={Math.round(angle * 180 / Math.PI)} disabled={!canPutt} onChange={event => { const value = Number(event.target.value) * Math.PI / 180; setAngle(value); props.onAim?.(value, power); }} /></label>
    <label>Power: {Math.round(power * 100)}%<input aria-label="Power" type="range" min={1} max={100} value={Math.round(power * 100)} disabled={!canPutt} onChange={event => { const value = Number(event.target.value) / 100; setPower(value); props.onAim?.(angle, value); }} /></label>
    <button className="primary-action" disabled={!canPutt} onClick={() => void putt()}>{posting ? 'Saving putt…' : 'Putt'}</button>
    {(props.message || error) && <p role="status">{error ?? props.message}</p>}
    {!mine && <p>You are watching this round. Join the next outing to play.</p>}
    <table><caption>Friendly score</caption><thead><tr><th>Player</th>{MINI_GOLF_HOLES.map(h => <th key={h.index}>{h.index + 1}</th>)}<th>Total</th></tr></thead><tbody>{round.players.map(player => <tr key={player}><th>{player === props.userId ? 'You' : player}</th>{round.strokes[player]!.map((strokes, index) => <td key={index}>{strokes || '–'}</td>)}<td>{round.strokes[player]!.reduce((sum, strokes) => sum + strokes, 0)}</td></tr>)}</tbody></table>
  </section>;
}
