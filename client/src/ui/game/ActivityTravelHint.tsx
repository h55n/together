import type { ReactElement } from 'react';

export function ActivityTravelHint({ kind, busy, retry = false, message, endKey = 'KeyX', onFinish, onCancel }: {
  kind: 'cycling' | 'kayak' | 'scooter_ride'; busy: boolean; retry?: boolean; message: string | null;
  endKey?: string;
  onFinish: () => void; onCancel: () => void;
}): ReactElement {
  const finish = kind === 'cycling' ? 'Park bicycle' : kind === 'scooter_ride' ? 'Park scooter' : 'Return kayak';
  return <aside className="activity-travel-hint" aria-label={kind === 'cycling' ? 'Cycling outing' : kind === 'scooter_ride' ? 'Scooter outing' : 'Kayak outing'}>
    <p>Take your time. Use your movement controls to move, steer and brake. {endKey.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', 'Arrow ')} · {finish}.</p>
    {message && <p role="status">{message}</p>}
    <button disabled={busy} onClick={onFinish}>{busy ? 'Saving your outing…' : retry ? 'Retry outing save' : finish}</button>
    <button onClick={onCancel}>Leave outing</button>
  </aside>;
}
