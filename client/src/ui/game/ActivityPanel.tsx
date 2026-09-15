import type { ReactElement } from 'react';
import { activityActionSequence, type ActivityId, type ActivityState, type ActivityStep } from '@together/shared';
import { activities } from '@together/content';

export type ActivitySessionView = {
  id: string;
  householdId: string;
  activityId: ActivityId;
  state: ActivityState;
  createdAt: string;
  updatedAt: string;
};

export function ActivityPanel(props: {
  session: ActivitySessionView | null;
  userId?: string;
  busy: boolean;
  message: string | null;
  onStep: (step: ActivityStep) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  const session = props.session;
  if (!session) return null;
  const definition = activities.find((entry) => entry.id === session.activityId);
  const steps = activityActionSequence(session.activityId);
  const next = steps[session.state.completedStepIds.length] ?? null;
  const joined = props.userId ? session.state.participants.includes(props.userId) : false;
  return <section className="game-panel activity-panel" aria-label={definition?.displayName ?? 'Shared activity'}>
    <header className="panel-header"><div><p className="eyebrow">Just being together</p><h2>{definition?.displayName ?? session.activityId.replaceAll('_', ' ')}</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">No XP, no streak, no productivity target. This is simply something to do in Amaya Bay.</p>
    <div className="activity-progress">{steps.map((step, index) => <div className={index < session.state.completedStepIds.length ? 'activity-step complete' : index === session.state.completedStepIds.length ? 'activity-step current' : 'activity-step'} key={step.id}><span>{index + 1}</span><strong>{step.label}</strong></div>)}</div>
    {props.message && <p className="status-copy">{props.message}</p>}
    <div className="entry-actions">
      {session.state.status === 'complete' ? <button className="primary-action" onClick={props.onClose}>Stay a little longer</button> : next ? <button className="primary-action" disabled={props.busy || !joined} onClick={() => void props.onStep(next)}>{props.busy ? 'Doing…' : next.label}</button> : null}
    </div>
    <p className="muted-copy">{session.state.participants.length} household member{session.state.participants.length === 1 ? '' : 's'} here.</p>
  </section>;
}
