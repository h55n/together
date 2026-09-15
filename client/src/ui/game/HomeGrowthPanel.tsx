import type { ReactElement } from 'react';
import {
  eligibleStarterProperties,
  renovationsForProperty,
  starterPropertyById,
  type HouseholdType,
  type MovingDisposition,
  type MovingPlan,
  type VoteChoice,
} from '@together/shared';
import type { HomeObjectView } from './DecoratePanel';

type VoteView = {
  id: string;
  payload: Record<string, unknown>;
  ballots: Record<string, VoteChoice>;
  resolution: 'pending' | 'approved' | 'rejected' | 'tied';
};

export type MovingStateView = { vote: VoteView | null; plan: MovingPlan | null };
export type RenovationStateView = { vote: VoteView | null; installed: string[] };

export type HomeGrowthHousehold = {
  type: HouseholdType;
  sharedWallet: number;
  memberCount: number;
};

export function HomeGrowthPanel(props: {
  open: boolean;
  currentPropertyId: string;
  household: HomeGrowthHousehold | null;
  homeObjects: readonly HomeObjectView[];
  moving: MovingStateView | null;
  renovation: RenovationStateView | null;
  userId: string | undefined;
  busy: boolean;
  message: string | null;
  onProposeMove: (propertyId: string) => Promise<void>;
  onCastMove: (voteId: string, choice: VoteChoice) => Promise<void>;
  onPack: (objectId: string, disposition: MovingDisposition) => Promise<void>;
  onCommitMove: () => Promise<void>;
  onProposeRenovation: (renovationId: string) => Promise<void>;
  onCastRenovation: (voteId: string, choice: VoteChoice) => Promise<void>;
  onCommitRenovation: (voteId: string) => Promise<void>;
  onClose: () => void;
}): ReactElement | null {
  if (!props.open) return null;
  const property = starterPropertyById(props.currentPropertyId);
  if (!property) return null;
  const renovations = renovationsForProperty(property.id);
  const installed = new Set(props.renovation?.installed ?? []);
  const activeRenovationVote = props.renovation?.vote && ['pending', 'tied', 'approved'].includes(props.renovation.vote.resolution) ? props.renovation.vote : null;
  const activeMoveVote = props.moving?.vote && ['pending', 'tied', 'approved'].includes(props.moving.vote.resolution) ? props.moving.vote : null;
  const plan = props.moving?.plan ?? null;
  const candidates = props.household
    ? eligibleStarterProperties(props.household.type, props.household.memberCount).filter((candidate) => candidate.recordId !== property.recordId)
    : [];

  return <section className="home-growth-panel" aria-label="Home growth and moving">
    <header className="panel-header"><div><p className="eyebrow">Our home · long-term plans</p><h2>{property.displayName}</h2></div><button className="panel-close" onClick={props.onClose}>Close</button></header>
    <p className="panel-copy">Improve what you have, or slowly prepare for somewhere new. Major changes wait for the household rather than happening while someone is away.</p>
    {props.household && <p className="growth-wallet">Shared savings · <strong>₹{props.household.sharedWallet.toLocaleString('en-IN')}</strong></p>}

    <section className="growth-section">
      <div className="growth-heading"><div><p className="eyebrow">Improve this place</p><h3>Renovations</h3></div><span>{installed.size}/{renovations.length}</span></div>
      {activeRenovationVote && activeRenovationVote.resolution !== 'rejected' && <VoteStrip label="Renovation decision" vote={activeRenovationVote} userId={props.userId} busy={props.busy} onCast={(choice) => props.onCastRenovation(activeRenovationVote.id, choice)} onCommit={activeRenovationVote.resolution === 'approved' ? () => props.onCommitRenovation(activeRenovationVote.id) : undefined} />}
      <div className="growth-list">{renovations.map((option) => {
        const done = installed.has(option.id);
        return <article className={done ? 'growth-card complete' : 'growth-card'} key={option.id}><div><strong>{option.displayName}</strong><p>{option.description}</p><span>₹{option.cost.toLocaleString('en-IN')}</span></div><button className="secondary-action" disabled={props.busy || done || Boolean(activeRenovationVote && activeRenovationVote.resolution !== 'rejected')} onClick={() => void props.onProposeRenovation(option.id)}>{done ? 'Built' : 'Discuss'}</button></article>;
      })}</div>
    </section>

    <section className="growth-section moving-section">
      <div className="growth-heading"><div><p className="eyebrow">A bigger chapter</p><h3>Moving</h3></div>{plan && <span>{plan.status}</span>}</div>
      {activeMoveVote && activeMoveVote.resolution !== 'rejected' && <VoteStrip label="Moving decision" vote={activeMoveVote} userId={props.userId} busy={props.busy} onCast={(choice) => props.onCastMove(activeMoveVote.id, choice)} onCommit={undefined} />}
      {!plan && <div className="growth-list">{candidates.length === 0 ? <p className="muted-copy">No other starter property fits the current household size yet.</p> : candidates.map((candidate) => <article className="growth-card" key={candidate.id}><div><strong>{candidate.displayName}</strong><p>{candidate.rooms.slice(0, 5).map(humanize).join(' · ')}</p><span>Move cost starts at ₹{(1_200 + candidate.starterCost).toLocaleString('en-IN')}</span></div><button className="secondary-action" disabled={props.busy || Boolean(activeMoveVote && activeMoveVote.resolution !== 'rejected')} onClick={() => void props.onProposeMove(candidate.id)}>Visit & discuss</button></article>)}</div>}
      {plan && plan.status !== 'moved' && <div className="packing-list"><p className="panel-copy">Pack at least {plan.requiredPackedObjects} household object{plan.requiredPackedObjects === 1 ? '' : 's'}. Choosing what to keep is part of the move.</p>{props.homeObjects.length === 0 ? <div className="packing-row"><span>Starter moving box · kitchen & household basics</span><div><button className={plan.dispositionByObject['starter-box:core'] === 'keep' ? 'chip active' : 'chip'} disabled={props.busy} onClick={() => void props.onPack('starter-box:core', 'keep')}>Pack box</button></div></div> : props.homeObjects.map((object) => {
        const disposition = plan.dispositionByObject[object.objectId];
        return <div className="packing-row" key={object.objectId}><span>{humanize(object.definitionId)}</span><div>{(['keep','sell','donate'] as const).map((choice) => <button className={disposition === choice ? 'chip active' : 'chip'} disabled={props.busy} key={choice} onClick={() => void props.onPack(object.objectId, choice)}>{humanize(choice)}</button>)}</div></div>;
      })}<div className="moving-progress">Packed {plan.packedObjectIds.length} / {plan.requiredPackedObjects}</div><button className="primary-action" disabled={props.busy || plan.status !== 'ready'} onClick={() => void props.onCommitMove()}>{plan.status === 'ready' ? 'Move household' : 'Keep packing'}</button></div>}
      {plan?.status === 'moved' && <p className="status-copy">The old place is now part of your household history. Your kept objects are waiting in moving boxes.</p>}
    </section>
    {props.message && <p className="status-copy">{props.message}</p>}
  </section>;
}

function VoteStrip(props: { label: string; vote: VoteView; userId: string | undefined; busy: boolean; onCast: (choice: VoteChoice) => Promise<void>; onCommit: (() => Promise<void>) | undefined }): ReactElement {
  const own = props.userId ? props.vote.ballots[props.userId] : undefined;
  return <div className="growth-vote"><div><strong>{props.label}</strong><span>{props.vote.resolution === 'approved' ? 'Approved by the household.' : props.vote.resolution === 'tied' ? 'The vote tied. Talk it through.' : own ? `You voted ${own}. Waiting for the household.` : 'Your household is deciding.'}</span></div><div className="vote-actions">{props.vote.resolution === 'approved' && props.onCommit ? <button className="primary-action" disabled={props.busy} onClick={() => void props.onCommit?.()}>Make the change</button> : props.vote.resolution !== 'approved' ? <><button className="quiet-action" disabled={props.busy} onClick={() => void props.onCast('no')}>Not yet</button><button className="secondary-action" disabled={props.busy} onClick={() => void props.onCast('yes')}>Yes</button></> : null}</div></div>;
}

function humanize(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
