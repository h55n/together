import type { ReactElement } from 'react';
import { jobById, type JobId } from '@together/shared';

export type JobSessionView = {
  id: string;
  jobId: JobId;
  state: 'active' | 'complete';
  completedActions: string[];
  nextAction: string | null;
  totalActions: number;
};

export function JobShiftPanel(props: {
  session: JobSessionView | null;
  busy: boolean;
  message: string | null;
  onDoAction: (action: string) => void;
  onComplete: () => void;
  onClose: () => void;
}): ReactElement | null {
  if (!props.session) return null;
  const job = jobById(props.session.jobId);
  if (!job) return null;
  const completed = props.session.completedActions.length;
  return <section className="job-panel panel-surface" role="dialog" aria-modal="true" aria-label={`${job.displayName} shift`}>
    <header className="panel-header"><div><p className="eyebrow">On shift · {job.sessionMinutes[0]}–{job.sessionMinutes[1]} min target</p><h2>{job.displayName}</h2></div><button className="quiet-action" onClick={props.onClose}>Leave shift view</button></header>
    <p className="panel-copy">Work happens here in the city. Each step triggers the matching body action; payout is server-authoritative and only becomes available after the full sequence.</p>
    <div className="job-progress" aria-label={`${completed} of ${props.session.totalActions} tasks completed`}>
      {job.actions.map((action, index) => <span key={action} className={index < completed ? 'done' : index === completed ? 'current' : ''}>{humanize(action)}</span>)}
    </div>
    {props.session.state === 'active' && props.session.nextAction ? <button className="primary-action" disabled={props.busy} onClick={() => props.onDoAction(props.session!.nextAction!)}>
      {props.busy ? 'Working…' : `Do · ${humanize(props.session.nextAction)}`}
    </button> : props.session.state === 'active' ? <button className="primary-action" disabled={props.busy} onClick={props.onComplete}>{props.busy ? 'Finishing…' : 'Clock out & get paid'}</button> : <p className="status-copy">Shift complete. Your pay has gone to your personal wallet.</p>}
    {props.message && <p className="status-copy">{props.message}</p>}
  </section>;
}

function humanize(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
