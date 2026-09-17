import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { rooms } from '@together/shared';
import { createApp } from './app.js';
import { createAuthService } from './auth/AuthService.js';
import { createGameRepository } from './db/createGameRepository.js';
import { HouseholdService } from './game/HouseholdService.js';
import { HomeService } from './game/HomeService.js';
import { EconomyService } from './game/EconomyService.js';
import { StoryService } from './game/StoryService.js';
import { MemoryService } from './game/MemoryService.js';
import { InventoryService } from './game/InventoryService.js';
import { CookingService } from './game/CookingService.js';
import { NPCStateService } from './game/NPCStateService.js';
import { MovingService } from './game/MovingService.js';
import { RenovationService } from './game/RenovationService.js';
import { NoteService } from './game/NoteService.js';
import { ProfileService } from './game/ProfileService.js';
import { JobSessionService } from './game/JobSessionService.js';
import { TransitService } from './game/TransitService.js';
import { ActivityService } from './game/ActivityService.js';
import { items, recipes, storyEvents } from '@together/content';
import { PropertySelectionService } from './game/PropertySelectionService.js';
import { TimeService } from './game/TimeService.js';
import { logger } from './logging/logger.js';
import { registerSocketServer } from './socket/registerSocketServer.js';
import { createMemoryImageStore } from './storage/createMemoryImageStore.js';

const port = Number(process.env.PORT ?? 3001);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
const repository = createGameRepository();
const authService = createAuthService();
const householdService = new HouseholdService(repository);
const propertySelectionService = new PropertySelectionService(repository, householdService);
const homeService = new HomeService(repository);
const economyService = new EconomyService(repository);
const storyService = new StoryService(repository, storyEvents);
const memoryService = new MemoryService(repository);
const inventoryService = new InventoryService(repository, { items, recipes });
const cookingService = new CookingService(repository, inventoryService, recipes);
const npcStateService = new NPCStateService(repository);
const movingService = new MovingService(repository, householdService);
const renovationService = new RenovationService(repository, householdService);
const noteService = new NoteService(repository);
const profileService = new ProfileService(repository);
const jobSessionService = new JobSessionService(repository, economyService);
const transitService = new TransitService(repository);
const activityService = new ActivityService(repository);
const memoryImageStore = createMemoryImageStore();
const timeService = await TimeService.create();
let publishHouseholdEvent: ((householdId: string, event: string, payload: unknown) => void) | undefined;
const app = createApp({
  authService,
  householdService,
  propertySelectionService,
  homeService,
  economyService,
  storyService,
  memoryService,
  inventoryService,
  cookingService,
  npcStateService,
  movingService,
  renovationService,
  noteService,
  memoryImageStore,
  profileService,
  jobSessionService,
  transitService,
  activityService,
  publishHouseholdEvent: (householdId, event, payload) => publishHouseholdEvent?.(householdId, event, payload),
});
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: [clientUrl, 'http://localhost:5173'], credentials: true },
  transports: ['websocket', 'polling'],
});
publishHouseholdEvent = (householdId, event, payload) => {
  io.to(rooms.household(householdId)).emit(event, payload);
};
const onlinePresence = registerSocketServer(io, { authService, householdService, timeService, profileService });

const timeTimer = setInterval(() => {
  io.emit('time:sync', timeService.snapshot());
  void timeService.persist().catch((error) => logger.warn('Could not persist city time', { error: error instanceof Error ? error.message : String(error) }));
}, 5_000);
timeTimer.unref();

// Household life chapters advance from active play rather than wall-clock/offline time.
// Count each online household once even when several members or tabs are connected.
const activeTimeTimer = setInterval(() => {
  const householdIds = new Set([...onlinePresence.values()].map((presence) => presence.householdId));
  void Promise.allSettled([...householdIds].map((householdId) => householdService.advanceActiveTime(householdId, 60)));
}, 60_000);
activeTimeTimer.unref();

httpServer.listen(port, () => {
  logger.info('Together server started', { port, city: 'amaya_bay', environment: process.env.NODE_ENV ?? 'development' });
});

export { app, httpServer, io };
