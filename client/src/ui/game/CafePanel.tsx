import { useRef, useState, type ReactElement } from 'react';
import { CAFE_MENU, type CafeCommand, type CafeDrink, type CafeState } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

const DRINK_LABELS: Record<CafeDrink, string> = { chai: 'Chai', filter_coffee: 'Filter coffee', cold_coffee: 'Cold coffee', lemon_soda: 'Lemon soda' };
type CafeInput = CafeCommand extends infer Command ? Command extends CafeCommand ? Omit<Command, 'key' | 'expectedRevision'> : never : never;

export function CafePanel(props: {
  session: ActivitySessionView; userId?: string; participantNames?: Readonly<Record<string, string>>; busy: boolean; message: string | null;
  onCommand: (command: CafeCommand) => Promise<void>; onClose: () => void;
}): ReactElement | null {
  const state = (props.session.state as typeof props.session.state & { cafe?: CafeState }).cafe;
  const [drink, setDrink] = useState<CafeDrink>('chai'), [recipient, setRecipient] = useState('');
  const [error, setError] = useState<string | null>(null), [posting, setPosting] = useState(false);
  const sending = useRef(false);
  if (!state) return null;
  const participants = props.session.state.participants;
  const displayName = (id: string) => id === props.userId ? 'You' : props.participantNames?.[id] || `Guest ${participants.indexOf(id) + 1}`;
  const member = !!props.userId && participants.includes(props.userId);
  const enabled = member && state.phase === 'active' && !props.busy && !posting;
  const send = async (input: CafeInput) => {
    if (!enabled || sending.current) return;
    sending.current = true; setPosting(true); setError(null);
    try { await props.onCommand({ ...input, key: crypto.randomUUID(), expectedRevision: state.revision } as CafeCommand); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this café action.'); }
    finally { sending.current = false; setPosting(false); }
  };
  const guests = participants;
  return <section className="game-panel activity-panel" role="dialog" aria-modal="true" aria-label="Coffee at Café Roshan">
    <header className="panel-header"><div><p className="eyebrow">Take a seat, take your time</p><h2>Coffee at Café Roshan</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">Find a seat, order something you like, and pass a cup across the table. Whoever placed an order pays when the drink is served, and a served cup goes home in the household cupboard until it is sipped.</p>
    {state.phase === 'finished' ? <p role="status">You left the café. Roshan will keep a table for next time.</p> : <>
      <div className="entry-actions" role="group" aria-label="Choose a café seat">{Array.from({ length: 6 }, (_, index) => index + 1).map(seat => <button key={seat} className={state.seats[props.userId ?? ''] === seat ? 'primary-action' : 'secondary-action'} aria-pressed={state.seats[props.userId ?? ''] === seat} disabled={!enabled || Object.entries(state.seats).some(([guest, assigned]) => guest !== props.userId && assigned === seat)} onClick={() => void send({ kind: 'choose_seat', seat })}>Choose seat {seat}</button>)}</div>
      <div className="entry-actions" role="group" aria-label="Order a café drink"><label>Drink <select value={drink} disabled={!enabled} onChange={event => setDrink(event.currentTarget.value as CafeDrink)}>{Object.entries(DRINK_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button className="primary-action" disabled={!enabled} onClick={() => void send({ kind: 'order_drink', drink })}>Order {DRINK_LABELS[drink]}</button></div>
      <div aria-label="Café orders">{state.orders.length === 0 ? <p className="muted-copy">The table is quiet. Order a drink when you’re ready.</p> : state.orders.map(order => <article key={order.id} className="activity-step"><strong>{DRINK_LABELS[order.drink]} · ₹{CAFE_MENU[order.drink]}</strong><span>{order.sippedBy ? `Sipped by ${displayName(order.sippedBy)}` : order.servedTo ? `Served to ${displayName(order.servedTo)}` : `Ordered by ${displayName(order.orderedBy)}`}</span>
        {!order.servedTo && !order.sippedBy && <><label>For <select aria-label={`Recipient for ${DRINK_LABELS[order.drink]}`} value={recipient || guests[0]} onChange={event => setRecipient(event.currentTarget.value)}>{guests.map(id => <option key={id} value={id}>{displayName(id)}</option>)}</select></label><button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'serve_drink', orderId: order.id, recipientId: recipient || guests[0]! })}>Serve · charged to {displayName(order.orderedBy)}</button></>}
        {order.servedTo === props.userId && !order.sippedBy && <button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'sip_drink', orderId: order.id })}>Sip {DRINK_LABELS[order.drink]} · ₹{CAFE_MENU[order.drink]}</button>}
      </article>)}</div>
      <button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'finish' })}>Finish café visit</button>
    </>}
    {(error || props.message) && <p role="alert">{error ?? props.message}</p>}
    {!member && <p>You are watching this table. Join the visit to choose a seat and order.</p>}
    <p className="muted-copy">{participants.length} guest{participants.length === 1 ? '' : 's'} · {state.orders.length} drink{state.orders.length === 1 ? '' : 's'} ordered</p>
  </section>;
}
