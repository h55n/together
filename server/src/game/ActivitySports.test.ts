import { describe, expect, it } from 'vitest';
import { LocalGameRepository } from '../db/LocalGameRepository';
import { HouseholdService } from './HouseholdService';
import { ActivityService } from './ActivityService';
import { MemoryService } from './MemoryService';

describe('sports authority', () => {
  it('completes photography only with a recent linked private image and recovers its receipt', async () => {
    const repository = new LocalGameRepository();
    const home = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository);
    const session = await service.start(home.id, 'alice', 'photography', 'photography-start');
    await service.advance(session.id, 'alice', 'frame');
    await expect(service.advance(session.id, 'alice', 'capture')).rejects.toThrow(/photography capture/);
    const memory = await new MemoryService(repository).create(home.id, 'alice', {
      idempotencyKey: 'photography-memory', type: 'manual', screenshotPath: 'memory-image:photo_test', caption: 'The bay',
      locationId: 'bay', weather: 'clear', participants: ['alice'], metadata: { source: 'manual-photo', activitySessionId: session.id },
    });
    const command = { key: 'photo-command', expectedRevision: 1, memoryId: memory.id };
    await expect(service.photographyCapture(session.id, 'alice', command, async () => { throw new Error('Image missing'); })).rejects.toThrow('Image missing');
    const completed = await service.photographyCapture(session.id, 'alice', command, async (householdId, imageId) => {
      expect(householdId).toBe(home.id); expect(imageId).toBe('photo_test');
    });
    expect(completed.state.status).toBe('complete');
    expect(completed.state.photographyMemoryId).toBe(memory.id);
    const retry = await service.photographyCapture(session.id, 'alice', command, async () => { throw new Error('Must not re-read'); });
    expect(retry.state.revision).toBe(completed.state.revision);
    await expect(service.photographyCapture(session.id, 'alice', { ...command, memoryId: 'different' }, async () => {})).rejects.toThrow(/different/);
  });
  it('persists board flips, protects receipt identity and completes only after all six pairs', async () => {
    const repository = new LocalGameRepository();
    const home = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository), other = new ActivityService(repository);
    const session = await service.start(home.id, 'alice', 'board_game', 'board-game-start');
    await expect(service.advance(session.id, 'alice', 'deal')).rejects.toThrow(/sports commands/);
    const command = { key: 'board-first', expectedRevision: 0, kind: 'flip' as const, index: 0 };
    const attempts = await Promise.allSettled([
      service.boardGameCommand(session.id, 'alice', command),
      other.boardGameCommand(session.id, 'alice', { ...command, key: 'board-other', index: 1 }),
    ]);
    expect(attempts.filter(attempt => attempt.status === 'fulfilled')).toHaveLength(1);
    let saved = (await service.list(home.id, 'alice'))[0]!;
    const acceptedIndex = saved.state.boardGame!.revealed[0]!;
    const acceptedKey = Object.keys(saved.state.receipts!)[0]!;
    const retry = await other.boardGameCommand(session.id, 'alice', { ...command, key: acceptedKey, index: acceptedIndex });
    expect(retry.state.boardGame!.revision).toBe(1);
    await expect(service.boardGameCommand(session.id, 'alice', { ...command, key: acceptedKey, index: (acceptedIndex + 1) % 12 })).rejects.toThrow(/different/);
    await expect(service.boardGameCommand(session.id, 'outsider', command)).rejects.toThrow(/member/);
    const match = saved.state.boardGame!;
    const firstPair = match.cards[acceptedIndex]!.pair;
    const matching = match.cards.findIndex((card, index) => index !== acceptedIndex && card.pair === firstPair);
    saved = await service.boardGameCommand(session.id, 'alice', { key: 'board-match', expectedRevision: 1, kind: 'flip', index: matching });
    expect(saved.state.status).toBe('active');
    for (let pair = 0; pair < 6; pair++) {
      if (pair === firstPair) continue;
      const indices = match.cards.flatMap((card, index) => card.pair === pair ? [index] : []);
      for (const index of indices) saved = await service.boardGameCommand(session.id, 'alice',
        { key: 'board-' + index, expectedRevision: saved.state.boardGame!.revision, kind: 'flip', index });
    }
    expect(saved.state.boardGame!.attempts).toBe(6); expect(saved.state.boardGame!.matched).toHaveLength(12);
    expect(saved.state.status).toBe('complete'); expect(saved.state.completedStepIds).toEqual(['deal', 'play_round', 'pack_away']);
  });
  it('keeps one identity for concurrent idempotent starts', async () => {
    const repository = new LocalGameRepository();
    const home = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const [a, b] = await Promise.all([
      new ActivityService(repository).start(home.id, 'alice', 'mini_golf', 'same-start-key'),
      new ActivityService(repository).start(home.id, 'alice', 'mini_golf', 'same-start-key'),
    ]);
    expect(a.id).toBe(b.id);
    expect(await repository.listActivitySessions(home.id)).toHaveLength(1);
  });
  it('persists retries and excludes simultaneous commands from separate service instances', async () => {
    const repository = new LocalGameRepository();
    const households = new HouseholdService(repository);
    const home = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    const first = new ActivityService(repository), second = new ActivityService(repository);
    const session = await first.start(home.id, 'alice', 'mini_golf', 'golf-round-start');
    const shot = { key: 'shot-first', expectedRevision: 0, angle: 0, power: 0.4 };
    const attempts = await Promise.allSettled([
      first.golfShot(session.id, 'alice', shot),
      second.golfShot(session.id, 'alice', { ...shot, key: 'shot-second' }),
    ]);
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const saved = (await first.list(home.id, 'alice'))[0]!;
    expect(saved.state.golf?.strokes.alice?.[0]).toBe(1);
    const accepted = saved.state.golf!.lastShot!;
    const retried = await new ActivityService(repository).golfShot(session.id, 'alice', { ...shot, key: accepted.key });
    expect(retried.state.golf?.revision).toBe(1);
    await expect(second.golfShot(session.id, 'alice', { ...shot, key: accepted.key, power: 0.5 })).rejects.toThrow(/different/);
    await expect(second.golfShot(session.id, 'outsider', shot)).rejects.toThrow(/member/);
  });
  it('runs a solo NPC rally with persisted command receipts', async () => {
    const repository = new LocalGameRepository();
    const home = await new HouseholdService(repository).createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository);
    const session = await service.start(home.id, 'alice', 'badminton', 'badminton-round-start');
    const command = { id: 'serve-first', expectedRevision: 0, kind: 'serve' as const };
    const served = await service.badmintonCommand(session.id, 'alice', command);
    expect(served.state.badminton?.phase).toBe('rally');
    const retry = await new ActivityService(repository).badmintonCommand(session.id, 'alice', command);
    expect(retry.state.badminton?.revision).toBe(served.state.badminton?.revision);
    await expect(service.badmintonCommand(session.id, 'alice', { ...command, kind: 'cancel' })).rejects.toThrow(/different/);
  });
  it('prevents checklist completion of sports', async () => {
    const repository = new LocalGameRepository();
    const households = new HouseholdService(repository);
    const home = await households.createHousehold('alice', { name: 'Home', type: 'friends' });
    const service = new ActivityService(repository);
    for (const [sport, step] of [['mini_golf', 'line_up'], ['badminton', 'serve']] as const) {
      const session = await service.start(home.id, 'alice', sport, `start-${sport}`);
      await expect(service.advance(session.id, 'alice', step)).rejects.toThrow(/sports commands/);
    }
  });
});
