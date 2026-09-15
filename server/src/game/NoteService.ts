import type { GameRepository, HouseholdNoteRecord, HouseholdRecord } from '../db/GameRepository.js';

export type CreateNoteInput = {
  text: string;
  placement: HouseholdNoteRecord['placement'];
};

export class NoteService {
  private lastCreatedAtMs = 0;

  constructor(private readonly repository: GameRepository) {}

  async create(householdId: string, userId: string, input: CreateNoteInput): Promise<HouseholdNoteRecord> {
    await this.authorize(householdId, userId);
    const text = input.text.trim();
    if (!text) throw new Error('Note cannot be empty');
    if (text.length > 280) throw new Error('Note is too long');
    if (!['fridge', 'corkboard', 'desk', 'door'].includes(input.placement)) throw new Error('Invalid note placement');
    const now = Math.max(Date.now(), this.lastCreatedAtMs + 1);
    this.lastCreatedAtMs = now;
    const note: HouseholdNoteRecord = {
      id: crypto.randomUUID(), householdId, authorUserId: userId, text, placement: input.placement, createdAt: new Date(now).toISOString(),
    };
    await this.repository.saveHouseholdNote(note);
    return note;
  }

  async list(householdId: string, userId: string): Promise<HouseholdNoteRecord[]> {
    await this.authorize(householdId, userId);
    return this.repository.listHouseholdNotes(householdId);
  }

  private async authorize(householdId: string, userId: string): Promise<HouseholdRecord> {
    const household = await this.repository.getHousehold(householdId);
    if (!household) throw new Error('Household not found');
    if (!household.members.some((member) => member.userId === userId && member.membershipState === 'active')) {
      throw new Error('User is not an active household member');
    }
    return household;
  }
}
