import type { HouseholdType } from '../contracts.js';

export type VoteChoice = 'yes' | 'no';
export type VoteResolution = 'pending' | 'approved' | 'rejected' | 'tied';

/** Canonical V1 household decision rule: Couple is unanimous, Friends is simple majority. */
export function resolveHouseholdVote(
  householdType: HouseholdType,
  activeMemberIds: readonly string[],
  votes: Readonly<Record<string, VoteChoice>>,
): VoteResolution {
  const uniqueMembers = [...new Set(activeMemberIds)];
  if (uniqueMembers.length === 0) return 'pending';

  const cast = uniqueMembers.map((id) => votes[id]).filter((vote): vote is VoteChoice => Boolean(vote));
  const yes = cast.filter((vote) => vote === 'yes').length;
  const no = cast.length - yes;

  if (householdType === 'couple') {
    if (no > 0) return 'rejected';
    return yes === uniqueMembers.length ? 'approved' : 'pending';
  }

  // A decisive majority can resolve before every member votes.
  const majority = Math.floor(uniqueMembers.length / 2) + 1;
  if (yes >= majority) return 'approved';
  if (no >= majority) return 'rejected';
  if (cast.length < uniqueMembers.length) return 'pending';
  if (yes === no) return 'tied';
  return yes > no ? 'approved' : 'rejected';
}
