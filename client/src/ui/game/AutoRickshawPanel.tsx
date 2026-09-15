import type { ReactElement } from 'react';
import { AUTO_DESTINATIONS, autoFare } from '@together/shared';

export function AutoRickshawPanel(props: {
  open: boolean;
  from: { x: number; z: number };
  busy: boolean;
  message: string | null;
  onRide: (destinationId: string, skip: boolean) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  return <section className="game-panel auto-panel" aria-label="Auto-rickshaw destinations">
    <header className="panel-header"><div><p className="eyebrow">City transport</p><h2>Where to?</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">Autos are a small convenience, not a progression gate. Ride through the city or skip after boarding.</p>
    <div className="auto-destinations">
      {AUTO_DESTINATIONS.map((destination) => {
        const fare = autoFare(props.from, destination.position);
        return <article key={destination.id} className="auto-destination"><div><strong>{destination.displayName}</strong><span>₹{fare}</span></div><div className="auto-actions"><button disabled={props.busy} className="secondary-action" onClick={() => void props.onRide(destination.id, false)}>Ride</button><button disabled={props.busy} className="quiet-action" onClick={() => void props.onRide(destination.id, true)}>Board & skip</button></div></article>;
      })}
    </div>
    {props.message && <p className="status-copy">{props.message}</p>}
  </section>;
}
