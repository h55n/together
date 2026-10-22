import { useRef, useState, type ReactElement } from 'react';
import { AMAYA_BAY_VENUES, type TransportRentalCommand } from '@together/shared';
import type { ActivitySessionView } from './ActivityPanel';

export function TransportRentalPanel({ session, userId, busy, message, onCommand, onClose }: {
  session: ActivitySessionView; userId?: string; busy: boolean; message: string | null;
  onCommand: (command: TransportRentalCommand) => Promise<void>; onClose: () => void;
}): ReactElement {
  const state = session.state.transportRental!;
  const rental = [...state.rentals].reverse().find(item => item.ownerUserId === userId);
  const kayak = state.activityId === 'kayak', scooter = state.activityId === 'scooter_ride';
  const noun = kayak ? 'kayak' : scooter ? 'scooter' : 'bicycle';
  const kayakHut = AMAYA_BAY_VENUES.find(venue => venue.id === 'kayak_cove');
  const [acknowledged, setAcknowledged] = useState(false);
  const pending = useRef(false);
  const enabled = !!userId && state.participants.includes(userId) && !busy;
  const send = async (kind: TransportRentalCommand['kind']) => {
    if (!enabled || pending.current) return;
    pending.current = true;
    try {
      const command = kind === 'rent' ? { key: crypto.randomUUID(), expectedRevision: state.revision, kind }
        : { key: crypto.randomUUID(), expectedRevision: state.revision, kind, rentalId: rental!.rentalId };
      await onCommand(command as TransportRentalCommand);
    } finally { pending.current = false; }
  };
  return <section className="game-panel activity-panel" role="dialog" aria-modal="true" aria-label={kayak ? 'Kayak rental' : scooter ? 'Scooter rental' : 'Bicycle rental'}>
    <header className="panel-header"><div><p className="eyebrow">Take your time outside</p><h2>{kayak ? 'Kayak at Bay Steps' : scooter ? 'A scooter by the bay' : 'A bicycle for the day'}</h2></div><button className="panel-close" onClick={onClose}>Close</button></header>
    {kayak && kayakHut && <p>The rental hut opens at {kayakHut.open} and closes at {kayakHut.close} or during dangerous weather. You can always return checked-out equipment.</p>}
    {!rental ? <><p>Choose your equipment. Your rental will stay saved when you leave and return.</p><button disabled={!enabled} onClick={() => void send('rent')}>Rent {noun}</button></>
      : rental.status === 'returned' ? <><p>Equipment returned. Come back whenever you want another outing.</p>{session.state.status === 'active' && <button disabled={!enabled} onClick={() => void send('rent')}>Rent another {noun}</button>}</>
        : scooter && !rental.safetyAcknowledged ? <><h3>Helmet on</h3><p>Fasten your helmet before every ride. Keep to the streets, ease off the throttle near people, and park whenever you like.</p><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.currentTarget.checked)}/> My helmet is on and fastened</label><button disabled={!enabled || !acknowledged} onClick={() => void send('acknowledge_safety')}>Put on helmet</button><button disabled={!enabled} onClick={() => void send('return')}>Return equipment</button></>
        : kayak && !rental.safetyAcknowledged ? <><h3>Safety introduction</h3><p>Wear your life jacket. Use your movement controls to paddle and steer, stay within the sheltered bay, and choose Return kayak whenever you want to head back. Rentals close in dangerous weather.</p><label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.currentTarget.checked)}/> I understand how to paddle and return safely</label><button disabled={!enabled || !acknowledged} onClick={() => void send('acknowledge_safety')}>Complete safety introduction</button><button disabled={!enabled} onClick={() => void send('return')}>Return equipment</button></>
          : <><p>{rental.status === 'in_use' ? 'Your equipment is still checked out. Continue your outing or return it.' : 'Your equipment is ready. Explore at your own pace.'}</p><button disabled={!enabled} onClick={() => void send('depart')}>{rental.status === 'in_use' ? 'Continue outing' : kayak ? 'Launch kayak' : scooter ? 'Ride scooter' : 'Ride bicycle'}</button><button disabled={!enabled} onClick={() => void send('return')}>Return equipment</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
