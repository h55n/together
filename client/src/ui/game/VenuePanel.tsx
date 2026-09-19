import { useMemo, useState, type ReactElement } from 'react';
import { items } from '@together/content';
import { FURNITURE_CATALOG, jobForVenue, type JobId, type VenueGameplayRole } from '@together/shared';
import type { NetworkSession } from '../../network/GameSocketClient';
import { authHeadersForIdentity } from '../../auth/clientAuth';

export type VenueSession = { venueId: string; displayName: string; role: VenueGameplayRole };

export function VenuePanel(props: {
  venue: VenueSession | null;
  networkSession?: NetworkSession;
  onClose: () => void;
  onMoment: (message: string) => void;
  onStartJob: (jobId: JobId) => void;
}): ReactElement | null {
  const [wallet, setWallet] = useState<'household' | 'personal'>('household');
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const groceries = useMemo(() => items.filter((item) => item.persistence === 'household' && item.category !== 'household'), []);
  if (!props.venue) return null;
  const localJob = jobForVenue(props.venue.venueId);

  const doPurchase = async (itemId: string): Promise<void> => {
    if (!props.networkSession) return;
    setBusyItem(itemId); setMessage(null);
    try {
      const response = await fetch(`/api/households/${props.networkSession.householdId}/groceries`, {
        method: 'POST',
        headers: authHeadersForIdentity(props.networkSession, true),
        body: JSON.stringify({ itemId, quantity: 1, wallet, idempotencyKey: `grocery:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not add that item to the basket');
      const item = items.find((candidate) => candidate.id === itemId);
      setMessage(`${item?.displayName ?? 'Item'} added to household groceries.`);
      props.onMoment(`${item?.displayName ?? 'Groceries'} are in the bag.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Purchase failed');
    } finally { setBusyItem(null); }
  };

  const doFurniturePurchase = async (itemId: string): Promise<void> => {
    if (!props.networkSession) return;
    setBusyItem(itemId); setMessage(null);
    try {
      const response = await fetch(`/api/households/${props.networkSession.householdId}/purchases`, {
        method: 'POST',
        headers: authHeadersForIdentity(props.networkSession, true),
        body: JSON.stringify({ itemId, wallet, idempotencyKey: `furniture:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as { error?: string; sharedWallet?: number; personalWallet?: number };
      if (!response.ok) throw new Error(data.error ?? 'Furniture purchase failed');
      const item = FURNITURE_CATALOG.find((candidate) => candidate.id === itemId);
      setMessage(`${item?.displayName ?? 'Furniture'} is now in household storage. Place it at home with C · Decorate.`);
      props.onMoment(`Bought ${item?.displayName ?? 'furniture'} for the home.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Purchase failed'); }
    finally { setBusyItem(null); }
  };


  return <section className="venue-panel panel-surface" role="dialog" aria-modal="true" aria-label={props.venue.displayName}>
    <header className="panel-header"><div><p className="eyebrow">You are here</p><h2>{props.venue.displayName}</h2></div><button className="quiet-action" onClick={props.onClose}>Close</button></header>
    {localJob && <div className="venue-job-callout"><p className="panel-copy">{localJob.displayName} shifts happen at this location through embodied tasks.</p><button className="primary-action" onClick={() => props.onStartJob(localJob.id)}>Start shift</button></div>}
    {props.venue.role === 'grocery_shop' ? <>
      <p className="panel-copy">Pick up what you need while you are physically at this shop. Prices come from the server-owned Amaya Bay catalog.</p>
      <div className="segmented compact"><button className={wallet === 'household' ? 'active' : ''} onClick={() => setWallet('household')}>Household wallet</button><button className={wallet === 'personal' ? 'active' : ''} onClick={() => setWallet('personal')}>Personal wallet</button></div>
      <div className="market-grid">{groceries.map((item) => <button key={item.id} className="market-item" disabled={busyItem !== null} onClick={() => void doPurchase(item.id)}><span>{item.displayName}</span><strong>₹{item.price}</strong><small>{item.category}</small></button>)}</div>
    </> : props.venue.role === 'furniture_shop' ? <>
      <p className="panel-copy">Browse the real city showroom, buy a piece, then take it home and place it in the actual room. Purchased furniture goes into shared household storage.</p>
      <div className="segmented compact"><button className={wallet === 'household' ? 'active' : ''} onClick={() => setWallet('household')}>Household wallet</button><button className={wallet === 'personal' ? 'active' : ''} onClick={() => setWallet('personal')}>Personal wallet</button></div>
      <div className="market-grid furniture-market">{FURNITURE_CATALOG.map((item) => <button key={item.id} className="market-item" disabled={busyItem !== null} onClick={() => void doFurniturePurchase(item.id)}><span>{item.displayName}</span><strong>₹{item.price.toLocaleString('en-IN')}</strong><small>{item.category}</small></button>)}</div>
    </> : <VenueActivity role={props.venue.role} onMoment={(text) => { props.onMoment(text); setMessage(text); }} />}
    {message && <p className="status-copy">{message}</p>}
  </section>;
}

function VenueActivity({ role, onMoment }: { role: VenueGameplayRole; onMoment: (message: string) => void }): ReactElement {
  const copy: Record<VenueGameplayRole, { body: string; action: string; result: string }> = {
    grocery_shop: { body: '', action: '', result: '' },
    hangout: { body: 'Sit for a while. The city does not need to reward every quiet moment.', action: 'Spend some time here', result: 'You settle in for an unhurried break.' },
    repair_service: { body: 'Household repairs and transport maintenance can route through this local service.', action: 'Ask about repairs', result: 'You make a note of what can be repaired here.' },
    laundry_service: { body: 'A neighborhood option for days when home laundry can wait.', action: 'Drop by', result: 'The hum of machines and folded clothes makes the place feel ordinary in a good way.' },
    furniture_shop: { body: 'Browse objects for the home before placing them through decorate mode.', action: 'Browse showroom', result: 'You look through the staged room pieces and picture them at home.' },
    plant_shop: { body: 'Plants here can support the household garden and nursery stories.', action: 'Browse plants', result: 'You wander between pots, damp soil and green shade.' },
    retail_browse: { body: 'A normal city stop: browse without turning it into a progression requirement.', action: 'Look around', result: 'You spend a few minutes browsing.' },
    civic_service: { body: 'Community, pharmacy and banking services live in the city instead of a dashboard.', action: 'Step inside', result: 'You take care of a small piece of city life.' },
    rental: { body: 'Transport and leisure equipment are rented from their real locations.', action: 'Check availability', result: 'You check the day’s equipment and conditions.' },
  };
  const entry = copy[role];
  return <div className="venue-activity"><p className="panel-copy">{entry.body}</p><button className="primary-action" onClick={() => onMoment(entry.result)}>{entry.action}</button></div>;
}
