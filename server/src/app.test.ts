import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { items, recipes, storyEvents } from '@together/content';
import { createApp, type AppDependencies } from './app';
import { LocalGameRepository } from './db/LocalGameRepository';
import { HouseholdService } from './game/HouseholdService';
import { PropertySelectionService } from './game/PropertySelectionService';
import { HomeService } from './game/HomeService';
import { EconomyService } from './game/EconomyService';
import { StoryService } from './game/StoryService';
import { MemoryService } from './game/MemoryService';
import { InventoryService } from './game/InventoryService';
import { CookingService } from './game/CookingService';
import { NPCStateService } from './game/NPCStateService';
import { MovingService } from './game/MovingService';
import { RenovationService } from './game/RenovationService';
import { NoteService } from './game/NoteService';
import { ProfileService } from './game/ProfileService';
import { JobSessionService } from './game/JobSessionService';
import { TransitService } from './game/TransitService';
import { ActivityService } from './game/ActivityService';
import type { MemoryImageStore } from './storage/MemoryImageStore';

const devAuth = {
  async verifyAccessToken(_token?: string, devUserId?: string) {
    if (!devUserId) throw new Error('missing dev id');
    return { userId: devUserId, isAnonymous: true };
  },
};

const memoryImageStore: MemoryImageStore = {
  async save() {},
  async get() { return { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mimeType: 'image/jpeg' }; },
};

function deps(repository = new LocalGameRepository(), householdService = new HouseholdService(repository)): AppDependencies {
  const economyService = new EconomyService(repository);
  const inventoryService = new InventoryService(repository, { items, recipes });
  return {
    authService: devAuth,
    householdService,
    propertySelectionService: new PropertySelectionService(repository, householdService),
    homeService: new HomeService(repository),
    economyService,
    storyService: new StoryService(repository, storyEvents),
    memoryService: new MemoryService(repository),
    inventoryService,
    cookingService: new CookingService(repository, inventoryService, recipes),
    npcStateService: new NPCStateService(repository),
    movingService: new MovingService(repository, householdService),
    renovationService: new RenovationService(repository, householdService),
    noteService: new NoteService(repository),
    memoryImageStore,
    profileService: new ProfileService(repository),
    jobSessionService: new JobSessionService(repository, economyService),
    transitService: new TransitService(repository),
    activityService: new ActivityService(repository),
  };
}

describe('app', () => {
  it('reports canonical runtime health', async () => {
    const app = createApp(deps());
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.city).toBe('amaya_bay');
    expect(response.body.timeScale.gameMinutesPerRealMinute).toBe(12);
  });

  it('creates a household without accepting a client wallet balance', async () => {
    const repository = new LocalGameRepository();
    const householdService = new HouseholdService(repository, () => 0.1);
    const app = createApp(deps(repository, householdService));
    const response = await request(app)
      .post('/api/households')
      .set('x-dev-user-id', 'user-a')
      .send({ name: 'Mogra Home', type: 'friends', sharedWallet: 999999 });
    expect(response.status).toBe(201);
    expect(response.body.sharedWallet).toBe(8000);
  });

  it('creates a ready-to-explore solo session without client-controlled setup', async () => {
    const repository = new LocalGameRepository();
    const app = createApp(deps(repository, new HouseholdService(repository, () => 0.1)));
    const response = await request(app)
      .post('/api/solo-explorer')
      .set('x-dev-user-id', 'user-a')
      .send({ propertyId: 'hostel_floor', sharedWallet: 999999 });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ type: 'friends', propertyId: 'one_bhk', sharedWallet: 8000, hiddenState: { soloExplorer: true } });
    expect(response.body.members).toHaveLength(1);
  });
});
