import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { homeActionSchema, householdCreateSchema, normalizeInviteCode } from '@together/shared';
import { z } from 'zod';
import type { AuthIdentity, AuthService } from './auth/AuthService.js';
import type { HouseholdService } from './game/HouseholdService.js';
import type { PropertySelectionService } from './game/PropertySelectionService.js';
import type { HomeService } from './game/HomeService.js';
import type { EconomyService } from './game/EconomyService.js';
import type { StoryService } from './game/StoryService.js';
import type { MemoryService } from './game/MemoryService.js';
import type { InventoryService } from './game/InventoryService.js';
import type { CookingService } from './game/CookingService.js';
import type { NPCStateService } from './game/NPCStateService.js';
import type { MovingService } from './game/MovingService.js';
import type { RenovationService } from './game/RenovationService.js';
import type { NoteService } from './game/NoteService.js';
import type { MemoryImageStore } from './storage/MemoryImageStore.js';
import type { ProfileService } from './game/ProfileService.js';
import type { JobSessionService } from './game/JobSessionService.js';
import type { TransitService } from './game/TransitService.js';
import type { ActivityService } from './game/ActivityService.js';
import { logger } from './logging/logger.js';

export type AppDependencies = {
  householdService: HouseholdService;
  authService: AuthService;
  propertySelectionService: PropertySelectionService;
  homeService: HomeService;
  economyService: EconomyService;
  storyService: StoryService;
  memoryService: MemoryService;
  inventoryService: InventoryService;
  cookingService: CookingService;
  npcStateService: NPCStateService;
  movingService: MovingService;
  renovationService: RenovationService;
  noteService: NoteService;
  memoryImageStore: MemoryImageStore;
  profileService: ProfileService;
  jobSessionService: JobSessionService;
  transitService: TransitService;
  activityService: ActivityService;
};

type AuthenticatedRequest = Request & { identity?: AuthIdentity };

function bearerToken(request: Request): string | undefined {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: [clientUrl, 'http://localhost:5173', 'http://localhost:4173'], credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
      city: 'amaya_bay',
      timeScale: { gameMinutesPerRealMinute: 12 },
      time: new Date().toISOString(),
    });
  });

  const authenticate = async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    try {
      request.identity = await dependencies.authService.verifyAccessToken(
        bearerToken(request),
        request.header('x-dev-user-id') ?? undefined,
      );
      next();
    } catch (error) {
      response.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized' });
    }
  };

  app.get('/api/profile', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const profile = await dependencies.profileService.getProfile(request.identity!.userId);
      if (!profile) return response.status(404).json({ error: 'Profile not found' });
      response.json(profile);
    } catch (error) { next(error); }
  });

  app.put('/api/profile', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.profileService.saveProfile(request.identity!.userId, request.body)); }
    catch (error) { next(error); }
  });

  app.post('/api/households', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = householdCreateSchema.parse(request.body);
      const household = await dependencies.householdService.createHousehold(request.identity!.userId, input);
      response.status(201).json(household);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/households/join/:code', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const code = normalizeInviteCode(request.params.code ?? '');
      const household = await dependencies.householdService.joinHousehold(request.identity!.userId, code);
      response.json(household);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/households/:id/properties', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const properties = await dependencies.propertySelectionService.listEligible(request.params.id, request.identity!.userId);
      const vote = await dependencies.propertySelectionService.getLatestPropertyVote(request.params.id, request.identity!.userId);
      response.json({ properties, vote });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/households/:id/property-votes', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { propertyId } = z.object({ propertyId: z.string().min(1).max(80) }).parse(request.body);
      const vote = await dependencies.propertySelectionService.openPropertyVote(request.params.id, request.identity!.userId, propertyId);
      response.status(201).json(vote);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/property-votes/:voteId/cast', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { choice } = z.object({ choice: z.enum(['yes', 'no']) }).parse(request.body);
      const vote = await dependencies.propertySelectionService.castPropertyVote(request.params.voteId, request.identity!.userId, choice);
      response.json(vote);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/households/:id/transactions', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.economyService.listTransactions(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/purchases', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.status(201).json(await dependencies.economyService.purchase(request.params.id, request.identity!.userId, request.body)); }
    catch (error) { next(error); }
  });

  app.get('/api/households/:id/activities', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.activityService.list(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/activities/:activityId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const activityId = z.enum(['picnic','cycling','kayak','badminton','mini_golf','cafe_hangout','board_game','photography']).parse(request.params.activityId);
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.status(201).json(await dependencies.activityService.start(request.params.id, request.identity!.userId, activityId, idempotencyKey));
    } catch (error) { next(error); }
  });

  app.post('/api/activities/:sessionId/join', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.activityService.join(request.params.sessionId, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/activities/:sessionId/steps/:stepId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.activityService.advance(request.params.sessionId, request.identity!.userId, request.params.stepId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/transit/auto', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({
        from: z.object({ x: z.number().finite(), z: z.number().finite() }),
        destinationId: z.string().min(1).max(80),
        idempotencyKey: z.string().min(8).max(128),
      }).parse(request.body);
      response.status(201).json(await dependencies.transitService.bookAuto(request.params.id, request.identity!.userId, input.from, input.destinationId, input.idempotencyKey));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/jobs/:jobId/start', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      const jobId = z.enum(['cafe_roshan', 'market_helper', 'delivery_rider', 'nursery_assistant', 'freelance_remote']).parse(request.params.jobId);
      response.status(201).json(await dependencies.jobSessionService.start(request.params.id, request.identity!.userId, jobId, idempotencyKey));
    } catch (error) { next(error); }
  });

  app.post('/api/job-sessions/:sessionId/advance', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { action } = z.object({ action: z.string().min(1).max(80) }).parse(request.body);
      response.json(await dependencies.jobSessionService.advance(request.params.sessionId, request.identity!.userId, action));
    } catch (error) { next(error); }
  });

  app.post('/api/job-sessions/:sessionId/complete', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.json(await dependencies.jobSessionService.complete(request.params.sessionId, request.identity!.userId, idempotencyKey));
    } catch (error) { next(error); }
  });


  app.get('/api/households/:id/inventory', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.inventoryService.listHouseholdInventory(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/groceries', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({
        itemId: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(99),
        wallet: z.enum(['personal', 'household']),
        idempotencyKey: z.string().min(8).max(128),
      }).parse(request.body);
      response.status(201).json(await dependencies.inventoryService.purchaseGrocery(request.params.id, request.identity!.userId, input));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/recipes/:recipeId/consume', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.json(await dependencies.inventoryService.consumeRecipeIngredients(request.params.id, request.identity!.userId, request.params.recipeId, idempotencyKey));
    } catch (error) { next(error); }
  });


  app.get('/api/households/:id/cooking', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.cookingService.list(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/cooking', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ recipeId: z.string().min(1).max(80), idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.status(201).json(await dependencies.cookingService.start(request.params.id, request.identity!.userId, input.recipeId, input.idempotencyKey));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/cooking/:sessionId/stations/:station/claim', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.cookingService.claimStation(request.params.id, request.identity!.userId, request.params.sessionId, request.params.station)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/cooking/:sessionId/stations/:station/release', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.cookingService.releaseStation(request.params.id, request.identity!.userId, request.params.sessionId, request.params.station)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/cooking/:sessionId/steps/:stepId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { mistake } = z.object({ mistake: z.boolean().default(false) }).parse(request.body);
      response.json(await dependencies.cookingService.completeStep(request.params.id, request.identity!.userId, request.params.sessionId, request.params.stepId, mistake));
    } catch (error) { next(error); }
  });


  app.get('/api/households/:id/npc-memory', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.npcStateService.list(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/npc-memory/:npcId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ flag: z.string().min(1).max(120), familiarityDelta: z.number().int().min(0).max(25).default(1) }).parse(request.body);
      response.json(await dependencies.npcStateService.remember(request.params.id, request.identity!.userId, request.params.npcId, input.flag, input.familiarityDelta));
    } catch (error) { next(error); }
  });


  app.get('/api/households/:id/moving', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.movingService.getState(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/moving/votes', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { targetPropertyId } = z.object({ targetPropertyId: z.string().min(1).max(80) }).parse(request.body);
      response.status(201).json(await dependencies.movingService.openMoveVote(request.params.id, request.identity!.userId, targetPropertyId));
    } catch (error) { next(error); }
  });

  app.post('/api/moving/votes/:voteId/cast', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { choice } = z.object({ choice: z.enum(['yes', 'no']) }).parse(request.body);
      response.json(await dependencies.movingService.castMoveVote(request.params.voteId, request.identity!.userId, choice));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/moving/pack', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ objectId: z.string().min(1).max(120), disposition: z.enum(['keep', 'sell', 'donate']) }).parse(request.body);
      response.json(await dependencies.movingService.packObject(request.params.id, request.identity!.userId, input.objectId, input.disposition));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/moving/commit', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.json(await dependencies.movingService.commitMove(request.params.id, request.identity!.userId, idempotencyKey));
    } catch (error) { next(error); }
  });


  app.get('/api/households/:id/renovation', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.renovationService.getState(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/renovation/votes', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { renovationId } = z.object({ renovationId: z.string().min(1).max(80) }).parse(request.body);
      response.status(201).json(await dependencies.renovationService.openVote(request.params.id, request.identity!.userId, renovationId));
    } catch (error) { next(error); }
  });

  app.post('/api/renovation/votes/:voteId/cast', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { choice } = z.object({ choice: z.enum(['yes', 'no']) }).parse(request.body);
      response.json(await dependencies.renovationService.castVote(request.params.voteId, request.identity!.userId, choice));
    } catch (error) { next(error); }
  });

  app.post('/api/renovation/votes/:voteId/commit', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { idempotencyKey } = z.object({ idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.json(await dependencies.renovationService.commit(request.params.voteId, request.identity!.userId, idempotencyKey));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/notes', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await dependencies.noteService.list(request.params.id, request.identity!.userId)); }
    catch (error) { next(error); }
  });

  app.post('/api/households/:id/notes', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ text: z.string().min(1).max(280), placement: z.enum(['fridge', 'corkboard', 'desk', 'door']) }).parse(request.body);
      response.status(201).json(await dependencies.noteService.create(request.params.id, request.identity!.userId, input));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/stories', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.storyService.list(request.params.id, request.identity!.userId));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/stories/eligible', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.storyService.eligible(request.params.id, request.identity!.userId));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/stories/:eventId/start', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.status(201).json(await dependencies.storyService.start(request.params.id, request.identity!.userId, request.params.eventId));
    } catch (error) { next(error); }
  });

  app.patch('/api/households/:id/stories/instances/:instanceId/tasks/:taskId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { state } = z.object({ state: z.enum(['pending', 'complete', 'failed', 'skipped']) }).parse(request.body);
      response.json(await dependencies.storyService.updateTask(request.params.id, request.identity!.userId, request.params.instanceId, request.params.taskId, state));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/stories/instances/:instanceId/resolve', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.storyService.resolve(request.params.id, request.identity!.userId, request.params.instanceId));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/memory-images/:imageId', authenticate, express.raw({ type: ['image/jpeg', 'image/png'], limit: '2mb' }), async (request: AuthenticatedRequest, response, next) => {
    try {
      await dependencies.householdService.getHouseholdForMember(request.params.id, request.identity!.userId);
      const mimeType = request.header('content-type');
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') throw new Error('Unsupported memory image type');
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw new Error('Memory image body is empty');
      await dependencies.memoryImageStore.save(request.params.id, request.params.imageId, new Uint8Array(request.body), mimeType);
      response.status(201).json({ imageId: request.params.imageId, screenshotPath: `memory-image:${request.params.imageId}` });
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/memory-images/:imageId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      await dependencies.householdService.getHouseholdForMember(request.params.id, request.identity!.userId);
      const image = await dependencies.memoryImageStore.get(request.params.id, request.params.imageId);
      response.setHeader('Content-Type', image.mimeType);
      response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      response.send(Buffer.from(image.bytes));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/memories', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.memoryService.list(request.params.id, request.identity!.userId));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/memories', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.status(201).json(await dependencies.memoryService.create(request.params.id, request.identity!.userId, request.body));
    } catch (error) { next(error); }
  });

  app.patch('/api/households/:id/memories/:memoryId/caption', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const { caption } = z.object({ caption: z.string().min(1).max(240) }).parse(request.body);
      response.json(await dependencies.memoryService.updateCaption(request.params.id, request.identity!.userId, request.params.memoryId, caption));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id/home', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.homeService.getHome(request.params.id, request.identity!.userId));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/home/furniture', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.status(201).json(await dependencies.homeService.placeFurniture(request.params.id, request.identity!.userId, request.body));
    } catch (error) { next(error); }
  });

  app.put('/api/households/:id/home/furniture', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.json(await dependencies.homeService.moveFurniture(request.params.id, request.identity!.userId, request.body));
    } catch (error) { next(error); }
  });

  app.delete('/api/households/:id/home/furniture/:objectId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ expectedVersion: z.coerce.number().int().nonnegative(), idempotencyKey: z.string().min(8).max(128) }).parse(request.query);
      response.json(await dependencies.homeService.removeFurniture(request.params.id, request.identity!.userId, request.params.objectId, input.expectedVersion, input.idempotencyKey));
    } catch (error) { next(error); }
  });

  app.post('/api/households/:id/home/domestic-actions', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({
        action: homeActionSchema,
        expectedVersion: z.number().int().nonnegative(),
        idempotencyKey: z.string().min(8).max(128),
      }).parse(request.body);
      response.json(await dependencies.homeService.applyDomesticAction(
        request.params.id,
        request.identity!.userId,
        input.action,
        input.expectedVersion,
        input.idempotencyKey,
      ));
    } catch (error) { next(error); }
  });

  app.put('/api/households/:id/home/surfaces/:surfaceId', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = z.object({ finishId: z.string().min(1).max(120), expectedVersion: z.number().int().nonnegative(), idempotencyKey: z.string().min(8).max(128) }).parse(request.body);
      response.json(await dependencies.homeService.setSurface(request.params.id, request.identity!.userId, request.params.surfaceId, input.finishId, input.expectedVersion, input.idempotencyKey));
    } catch (error) { next(error); }
  });

  app.get('/api/households/:id', authenticate, async (request: AuthenticatedRequest, response, next) => {
    try {
      const household = await dependencies.householdService.getHouseholdForMember(
        request.params.id,
        request.identity!.userId,
      );
      response.json(household);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, response) => response.status(404).json({ error: 'Not found' }));
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('request failed', { message });
    const status = message.includes('not found') ? 404 : message.includes('limited') ? 409 : 400;
    response.status(status).json({ error: message });
  });

  return app;
}
