import { useRef, useState, type ReactElement } from 'react';
import { PICNIC_PROVISIONS, cookedDishItemId, type PicnicCommand, type PicnicFood, type PicnicItem, type PicnicState } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

const FOOD_LABELS: Record<PicnicFood, string> = { mangoes: 'Mangoes', sandwiches: 'Sandwiches', samosas: 'Samosas', idli: 'Idli', chai: 'Chai', lemon_soda: 'Lemon soda' };
const ITEM_LABELS: Record<PicnicItem, string> = { basket: 'Basket', cups: 'Cups', flowers: 'Flowers', lantern: 'Lantern' };
type PicnicInput = PicnicCommand extends infer Command ? Command extends PicnicCommand ? Omit<Command, 'key' | 'expectedRevision'> : never : never;

export function PicnicPanel(props: {
  session: ActivitySessionView; userId?: string; participantNames?: Readonly<Record<string, string>>; busy: boolean; message: string | null; inventory?: readonly { itemId: string; quantity: number }[];
  onCommand: (command: PicnicCommand) => Promise<void>; onClose: () => void;
}): ReactElement | null {
  const state = (props.session.state as typeof props.session.state & { picnic?: PicnicState }).picnic;
  const [food, setFood] = useState<PicnicFood>('mangoes'), [x, setX] = useState(0), [z, setZ] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState<string | null>(null), [posting, setPosting] = useState(false);
  const sending = useRef(false);
  if (!state) return null;
  const participants = props.session.state.participants;
  const displayName = (id: string) => id === props.userId ? 'You' : props.participantNames?.[id] || `Guest ${participants.indexOf(id) + 1}`;
  const member = !!props.userId && participants.includes(props.userId);
  const enabled = member && state.phase === 'active' && !props.busy && !posting;
  const send = async (input: PicnicInput) => {
    if (!enabled || sending.current) return;
    sending.current = true; setPosting(true); setError(null);
    try { await props.onCommand({ ...input, key: crypto.randomUUID(), expectedRevision: state.revision } as PicnicCommand); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this picnic action.'); }
    finally { sending.current = false; setPosting(false); }
  };
  const guests = participants;
  const quantityOf = (itemId: string) => props.inventory?.find(stack => stack.itemId === itemId)?.quantity ?? 0;
  const cooked = quantityOf(cookedDishItemId(food)) > 0;
  const missing = props.inventory && !cooked ? PICNIC_PROVISIONS[food].filter(need => quantityOf(need.itemId) < need.quantity) : [];
  return <section className="game-panel activity-panel" role="dialog" aria-modal="true" aria-label="Picnic on the lawn">
    <header className="panel-header"><div><p className="eyebrow">A little afternoon outside</p><h2>Picnic on the lawn</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">Settle in, arrange a few things, and share something you brought. Stay as long as you like.</p>
    {state.phase === 'finished' ? <p role="status">You packed up this picnic. The lawn is still here whenever you want to return.</p> : <>
      <div className="entry-actions" role="group" aria-label="Place the picnic mat">
        <label>Mat x <input aria-label="Mat x position" type="range" min="-3" max="3" step="0.5" value={x} onChange={event => setX(Number(event.currentTarget.value))}/></label>
        <label>z <input aria-label="Mat z position" type="range" min="-3" max="3" step="0.5" value={z} onChange={event => setZ(Number(event.currentTarget.value))}/></label>
        <button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'place_mat', x, z })}>{state.mat ? 'Move picnic mat here' : 'Place picnic mat'}</button>
      </div>
      <div className="entry-actions" role="group" aria-label="Arrange picnic items">
        {(['basket', 'cups', 'flowers', 'lantern'] as const).map((item, index) => <button key={item} className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'place_item', item, x: Math.max(-3, Math.min(3, x + (index - 1.5) * 0.45)), z: Math.max(-3, Math.min(3, z + 0.55)) })}>Place {ITEM_LABELS[item].toLowerCase()}</button>)}
      </div>
      <div className="entry-actions" role="group" aria-label="Bring food">
        <label>Food to bring <select value={food} disabled={!enabled} onChange={event => setFood(event.currentTarget.value as PicnicFood)}>{Object.entries(FOOD_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <button className="primary-action" disabled={!enabled || missing.length > 0} onClick={() => void send({ kind: 'bring_food', food })}>Add {FOOD_LABELS[food]}</button>
        {cooked && <p className="muted-copy">Packing home-cooked {FOOD_LABELS[food].toLowerCase()} from the shelf.</p>}
        {missing.length > 0 && <p className="muted-copy">Needs {missing.map(need => need.itemId.replace(/_/g, ' ')).join(', ')} from the household shelf.</p>}
      </div>
      <div aria-label="Picnic food">
        {state.portions.length === 0 ? <p className="muted-copy">Nothing on the mat yet. Bring something to share.</p> : state.portions.map(portion => <article key={portion.id} className="activity-step">
          <strong>{FOOD_LABELS[portion.food]}</strong><span>{portion.eatenBy ? `Enjoyed by ${displayName(portion.eatenBy)}` : portion.servedTo ? `Served to ${displayName(portion.servedTo)}` : `Brought by ${displayName(portion.broughtBy)}`}</span>
          {!portion.servedTo && !portion.eatenBy && <><label>For <select aria-label={`Recipient for ${FOOD_LABELS[portion.food]}`} value={recipient || guests[0]} onChange={event => setRecipient(event.currentTarget.value)}>{guests.map(id => <option key={id} value={id}>{displayName(id)}</option>)}</select></label><button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'serve_food', portionId: portion.id, recipientId: recipient || guests[0]! })}>Serve {FOOD_LABELS[portion.food]}</button></>}
          {portion.servedTo === props.userId && !portion.eatenBy && <button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'eat_food', portionId: portion.id })}>Eat {FOOD_LABELS[portion.food]}</button>}
        </article>)}
      </div>
      <button className="secondary-action" disabled={!enabled} onClick={() => void send({ kind: 'finish' })}>Finish picnic</button>
    </>}
    {(error || props.message) && <p role="alert">{error ?? props.message}</p>}
    {!member && <p>You are watching this picnic. Join the outing to arrange and share food.</p>}
    <p className="muted-copy">{participants.length} guest{participants.length === 1 ? '' : 's'} · {state.items.length} picnic item{state.items.length === 1 ? '' : 's'} arranged</p>
  </section>;
}
