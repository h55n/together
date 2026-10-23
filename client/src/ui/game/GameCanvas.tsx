import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings, resolveStartupGameSettings, scoreMemoryCapture, shouldAutoCapture, type ActivityId, type ActivityStep, type AvatarConfig, type GameSettings, type HomeAction, type MicroActionStep, type JobId, type Placement2D, type RecipeStep, type StoryDefinition, type StoryTaskStateValue, type VoiceMode } from '@together/shared';
import { GameEngine } from '../../game/GameEngine';
import { useAmbientActivities } from './useAmbientActivities';
import { advanceFirstSession, readFirstSession, type FirstSessionAction } from '../../game/core/FirstSession';
import { FirstSessionGuide } from './FirstSessionGuide';
import type { WeatherState } from '../../game/weather/weatherModel';
import type { NetworkSession } from '../../network/GameSocketClient';
import { authHeadersForIdentity } from '../../auth/clientAuth';
import { MemoryBook, type MemoryView } from './MemoryBook';
import { LifePanel, type LifePanelData } from './LifePanel';
import { CityMap } from './CityMap';
import { GameSettingsPanel } from './GameSettingsPanel';
import { VenuePanel, type VenueSession } from './VenuePanel';
import { JobShiftPanel, type JobSessionView } from './JobShiftPanel';
import { DecoratePanel, type DecorationCommit, type HomeStateView } from './DecoratePanel';
import { AutoRickshawPanel } from './AutoRickshawPanel';
import { CookingPanel, type CookingSessionView, type KitchenInventoryView } from './CookingPanel';
import { recipes, storyEvents } from '@together/content';
import { StoryPanel, type StoryInstanceView } from './StoryPanel';
import { ActivityPanel, type ActivitySessionView } from './ActivityPanel';
import { GolfPanel } from './GolfPanel';
import { BadmintonPanel } from './BadmintonPanel';
import { BoardGamePanel } from './BoardGamePanel';
import { PicnicPanel } from './PicnicPanel';
import { CafePanel } from './CafePanel';
import { TransportRentalPanel } from './TransportRentalPanel';
import type { GolfShotIntent, BadmintonCommand, BoardGameCommand, PhotographyCommand, PicnicCommand, CafeCommand } from '@together/shared';
import type { TransportRentalCommand } from '@together/shared';
import { mergeActivitySnapshot } from './activitySnapshot';
import { TransportOutingSave } from './transportOutingSave';
import { ActivityTravelHint } from './ActivityTravelHint';
import { NpcPanel, type NpcRelationshipView } from './NpcPanel';
import { HomeGrowthPanel, type HomeGrowthHousehold, type MovingStateView, type RenovationStateView } from './HomeGrowthPanel';
import { apiFetch } from '../../network/api';
import { manageDialogFocus } from './dialogFocus';

async function releaseKitchenStation(base: string, station: string, headers: Record<string, string>): Promise<CookingSessionView> {
  const response = await apiFetch(`${base}/stations/${encodeURIComponent(station)}/release`, { method: 'POST', headers });
  const session = await response.json() as CookingSessionView & { error?: string };
  if (!response.ok) throw new Error(session.error ?? 'Station release failed');
  return session;
}

export function GameCanvas({ networkSession, avatarConfig, propertyId, onPropertyChanged }: { networkSession?: NetworkSession; avatarConfig?: AvatarConfig; propertyId?: string; onPropertyChanged?: (propertyId: string) => void }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const engineCreateChainRef = useRef<Promise<void>>(Promise.resolve());
  const autoBookingIntent = useRef<{ householdId: string; userId: string; destinationId: string; from: { x: number; z: number }; idempotencyKey: string } | null>(null);
  const autoBookingInFlight = useRef(false);
  const autoViewGeneration = useRef(0);
  const homeVersionRef = useRef(0);
  const homeMutationChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastAutomaticCaptureRef = useRef(-300_000);
  const captureBusyRef = useRef(false);
  const manualCapturePending = useRef<{ householdId: string; activitySessionId: string | undefined; imageId: string; key: string; blob: Blob; context: ReturnType<GameEngine['getMemoryContext']>; imageSaved: boolean } | null>(null);
  const [weatherState, setWeatherState] = useState<WeatherState>('clear');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [compatibilityRenderer, setCompatibilityRenderer] = useState(false);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [preparationStage, setPreparationStage] = useState('Starting graphics and physics');
  const retryWorld = useCallback(() => {
    setReady(false); setError(null); setPreparationStage('Starting graphics and physics');
    setStartupAttempt(attempt => attempt + 1);
  }, []);
  const recoverRenderer = useCallback(() => { setReady(false); setError(null); setCompatibilityRenderer(true); }, []);
  const guideStorageKey = `together:first-day:v1:${networkSession?.userId ?? 'solo'}`;
  const [guideCompleted, setGuideCompleted] = useState<FirstSessionAction[]>(() => readFirstSession(localStorage.getItem(guideStorageKey)));
  const [guideHidden, setGuideHidden] = useState(() => localStorage.getItem(`${guideStorageKey}:hidden`) === 'true');
  const onFirstSessionAction = useCallback((action: FirstSessionAction) => {
    setGuideCompleted(current => {
      const next = advanceFirstSession(current, action);
      localStorage.setItem(guideStorageKey, JSON.stringify(next)); return next;
    });
  }, [guideStorageKey]);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>(networkSession ? 'connecting' : 'disconnected');
  const [participantNames, setParticipantNames] = useState<Readonly<Record<string, string>>>({});
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<MemoryView[]>([]);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<{ mode: VoiceMode; muted: boolean; pushToTalk: boolean }>({ mode: 'off', muted: false, pushToTalk: false });
  const [lifeOpen, setLifeOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [decorateOpen, setDecorateOpen] = useState(false);
  const [homeState, setHomeState] = useState<HomeStateView | null>(null);
  const [decorateBusy, setDecorateBusy] = useState(false);
  const [decorateMessage, setDecorateMessage] = useState<string | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const closeAuto = useCallback(() => { autoViewGeneration.current++; setAutoOpen(false); }, []);
  useEffect(() => {
    autoViewGeneration.current++;
    autoBookingIntent.current = null;
    const generation = autoViewGeneration;
    return () => { generation.current++; };
  }, [networkSession?.userId, networkSession?.householdId]);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [autoFrom, setAutoFrom] = useState({ x: 0, z: 0 });
  const [venueSession, setVenueSession] = useState<VenueSession | null>(null);
  const [jobSession, setJobSession] = useState<JobSessionView | null>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const jobViewGeneration = useRef(0);
  useLayoutEffect(() => {
    jobViewGeneration.current++;
    return () => { jobViewGeneration.current++; };
  }, [venueSession, jobSession?.id, networkSession?.userId, networkSession?.householdId, networkSession?.shardId]);
  const [cookingOpen, setCookingOpen] = useState(false);
  const [cookingSession, setCookingSession] = useState<CookingSessionView | null>(null);
  const [kitchenInventory, setKitchenInventory] = useState<KitchenInventoryView[]>([]);
  const [cookingBusy, setCookingBusy] = useState(false);
  const [cookingMessage, setCookingMessage] = useState<string | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyActive, setStoryActive] = useState<StoryInstanceView | null>(null);
  const [storyEligible, setStoryEligible] = useState<StoryDefinition[]>([]);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyMessage, setStoryMessage] = useState<string | null>(null);
  const [activitySession, setActivitySession] = useState<ActivitySessionView | null>(null);
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [activityTravel, setActivityTravel] = useState<{ kind: 'cycling' | 'kayak' | 'scooter_ride'; phase: 'travelling' | 'saving' | 'retry' } | null>(null);
  const [photographyFraming, setPhotographyFraming] = useState(false);
  const [photographyRetry, setPhotographyRetry] = useState(false);
  const photographyPending = useRef<PhotographyCommand | null>(null);
  const activityFinishedSave = useRef<{ save: TransportOutingSave; kind: 'cycling' | 'kayak' | 'scooter_ride' } | null>(null);
  const rentalPending = useRef<{ sessionId: string; command: TransportRentalCommand } | null>(null);
  const activitySnapshot = useRef<ActivitySessionView | null>(null);
  const activityViewGeneration = useRef(0);
  const activityOperation = useRef<number | null>(null);
  const activityAbort = useRef<AbortController | null>(null);
  const sportsPending = useRef<{ sessionId: string; path: string; key: string; input: GolfShotIntent | BadmintonCommand | BoardGameCommand | PhotographyCommand | PicnicCommand | CafeCommand } | null>(null);
  const closeActivity = useCallback(() => {
    engineRef.current?.clearSports();
    sportsPending.current = null;
    photographyPending.current = null; setPhotographyFraming(false); setPhotographyRetry(false);
    manualCapturePending.current = null;
    activityAbort.current?.abort();
    activityAbort.current = null;
    activityViewGeneration.current++;
    activityOperation.current = null;
    activitySnapshot.current = null;
    activityFinishedSave.current = null;
    rentalPending.current = null;
    setActivityTravel(null);
    setActivitySession(null);
    setActivityBusy(false);
  }, []);
  useLayoutEffect(() => {
    closeActivity();
    const generation = activityViewGeneration;
    const operation = activityOperation;
    const abort = activityAbort;
    return () => {
      abort.current?.abort();
      abort.current = null;
      generation.current++;
      operation.current = null;
    };
  }, [closeActivity, networkSession?.userId, networkSession?.householdId, networkSession?.shardId, propertyId, compatibilityRenderer, startupAttempt]);
  const [npcId, setNpcId] = useState<string | null>(null);
  const [npcRelationship, setNpcRelationship] = useState<NpcRelationshipView | null>(null);
  const [npcBusy, setNpcBusy] = useState(false);
  const [homeGrowthOpen, setHomeGrowthOpen] = useState(false);
  const [homeGrowthHousehold, setHomeGrowthHousehold] = useState<HomeGrowthHousehold | null>(null);
  const [movingState, setMovingState] = useState<MovingStateView | null>(null);
  const [renovationState, setRenovationState] = useState<RenovationStateView | null>(null);
  const [homeGrowthBusy, setHomeGrowthBusy] = useState(false);
  const [homeGrowthMessage, setHomeGrowthMessage] = useState<string | null>(null);
  const [lifeData, setLifeData] = useState<LifePanelData>({});
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());
  const settingsRef = useRef(settings);
  const activityBlocked = memoryOpen || lifeOpen || mapOpen || settingsOpen || decorateOpen || autoOpen || cookingOpen || storyOpen || Boolean(npcId) || Boolean(venueSession) || Boolean(jobSession) || homeGrowthOpen;
  useLayoutEffect(() => { if (activityBlocked) closeActivity(); }, [activityBlocked, closeActivity]);

  const authHeaders = useCallback((): Record<string, string> => networkSession ? authHeadersForIdentity(networkSession) : {}, [networkSession]);
  const getAmbientEngine = useCallback(() => engineRef.current, []);
  const { refreshAmbientActivities, acceptAmbientActivity } = useAmbientActivities(getAmbientEngine, networkSession, authHeaders, ready);

  const refreshHomeState = useCallback(async (): Promise<HomeStateView | null> => {
    if (!networkSession) return null;
    const response = await apiFetch(`/api/households/${networkSession.householdId}/home`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Home state request failed (${response.status})`);
    const home = await response.json() as HomeStateView;
    homeVersionRef.current = home.version;
    setHomeState(home);
    engineRef.current?.syncHomeDecoration(home.objects, home.surfaces);
    return home;
  }, [authHeaders, networkSession]);

  const refreshHomeVersion = useCallback(async (): Promise<number> => {
    const home = await refreshHomeState();
    return home?.version ?? homeVersionRef.current;
  }, [refreshHomeState]);

  const refreshMemories = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const response = await apiFetch(`/api/households/${networkSession.householdId}/memories`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Memory Book request failed (${response.status})`);
    setMemories(await response.json() as MemoryView[]);
  }, [authHeaders, networkSession]);

  const refreshLife = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [householdResponse, notesResponse, storiesResponse] = await Promise.all([
      apiFetch(`/api/households/${networkSession.householdId}`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/notes`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/stories`, { headers: authHeaders() }),
    ]);
    if (!householdResponse.ok) throw new Error(`Household request failed (${householdResponse.status})`);
    const household = await householdResponse.json() as { sharedWallet: number; members: Array<{ userId: string; personalWallet: number }> };
    const notes = notesResponse.ok ? await notesResponse.json() as Array<{ text: string }> : [];
    const stories = storiesResponse.ok ? await storiesResponse.json() as Array<{ state: string; eventId: string }> : [];
    const context = engineRef.current?.getMemoryContext();
    setLifeData({
      personalWallet: household.members.find((member) => member.userId === networkSession.userId)?.personalWallet ?? 0,
      householdWallet: household.sharedWallet,
      location: context?.locationId ?? location,
      time: context ? formatGameTime(context.gameMinutes) : undefined,
      weather: context?.weather,
      householdNote: notes[0]?.text ?? null,
      activeStory: stories.find((story) => story.state === 'active')?.eventId.replaceAll('_', ' ') ?? null,
    });
  }, [authHeaders, location, networkSession]);

  const queueVersionedHomeMutation = useCallback((
    execute: (expectedVersion: number) => Promise<Response>,
    failureLabel: string,
  ): void => {
    const task = homeMutationChainRef.current.then(async () => {
      let response = await execute(homeVersionRef.current);
      if (!response.ok && response.status < 500) {
        const version = await refreshHomeVersion();
        response = await execute(version);
      }
      if (!response.ok) throw new Error(`${failureLabel} (${response.status})`);
      const home = await response.json() as { version: number };
      homeVersionRef.current = home.version;
    });
    homeMutationChainRef.current = task.catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  }, [refreshHomeVersion]);

  const persistDomesticStep = useCallback((interactionId: string, step: MicroActionStep): void => {
    if (!networkSession) return;
    const idempotencyKey = `${interactionId}:${step.id}:${crypto.randomUUID()}`;
    queueVersionedHomeMutation(
      async (expectedVersion) => apiFetch(`/api/households/${networkSession.householdId}/home/domestic-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ interactionId, stepId: step.id, expectedVersion, idempotencyKey }),
      }),
      'Could not save embodied household step',
    );
  }, [authHeaders, networkSession, queueVersionedHomeMutation]);

  const persistDomesticAction = useCallback((action: HomeAction, interactionId: string): void => {
    if (!networkSession) return;
    const idempotencyKey = `${interactionId}:complete:${crypto.randomUUID()}`;
    queueVersionedHomeMutation(
      async (expectedVersion) => apiFetch(`/api/households/${networkSession.householdId}/home/domestic-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action, expectedVersion, idempotencyKey }),
      }),
      'Could not save household action',
    );
  }, [authHeaders, networkSession, queueVersionedHomeMutation]);

  const setBookOpen = useCallback((open: boolean): void => {
    setMemoryOpen(open);
    if (open) void refreshMemories().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [refreshMemories]);

  const captureMemory = useCallback(async (activitySessionId?: string): Promise<MemoryView | null> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || captureBusyRef.current) return null;
    const generation = activityViewGeneration.current;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    try {
      let intent = manualCapturePending.current;
      if (!intent || intent.householdId !== networkSession.householdId || intent.activitySessionId !== activitySessionId) {
        intent = { householdId: networkSession.householdId, activitySessionId, imageId: `photo_${crypto.randomUUID().replaceAll('-', '')}`,
          key: `manual:${crypto.randomUUID()}`, blob: await engine.captureFrame(), context: engine.getMemoryContext(), imageSaved: false };
        if (generation !== activityViewGeneration.current) return null;
        manualCapturePending.current = intent;
      }
      const { context, imageId } = intent;
      const imageUrl = `/api/households/${networkSession.householdId}/memory-images/${imageId}`;
      if (!intent.imageSaved) {
        try {
          const uploaded = await apiFetch(imageUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...authHeaders() }, body: intent.blob });
          if (!uploaded.ok) throw new Error(`Memory image upload failed (${uploaded.status})`);
        } catch (cause) {
          const recovered = await apiFetch(imageUrl, { headers: authHeaders() });
          if (!recovered.ok) throw cause;
        }
        intent = { ...intent, imageSaved: true };
        if (generation === activityViewGeneration.current && manualCapturePending.current?.key === intent.key) {
          manualCapturePending.current = intent;
        }
      }
      const caption = `${context.locationId} · ${formatGameTime(context.gameMinutes)}`;
      const memoryResponse = await apiFetch(`/api/households/${networkSession.householdId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idempotencyKey: intent.key,
          type: 'manual',
          screenshotPath: `memory-image:${imageId}`,
          caption,
          locationId: context.locationId,
          weather: context.weather,
          participants: [networkSession.userId],
          metadata: { gameMinutes: context.gameMinutes, source: 'manual-photo', ...(activitySessionId ? { activitySessionId } : {}) },
        }),
      });
      if (!memoryResponse.ok) throw new Error(`Memory creation failed (${memoryResponse.status})`);
      const memory = await memoryResponse.json() as MemoryView;
      if (generation !== activityViewGeneration.current) return null;
      if (manualCapturePending.current === intent) manualCapturePending.current = null;
      setMemories((current) => [memory, ...current.filter((entry) => entry.id !== memory.id)]);
      setToast('Saved to your Memory Book');
      window.setTimeout(() => setToast(null), 2400);
      return memory;
    } catch (cause) {
      if (generation === activityViewGeneration.current) {
        if (activitySessionId) { setPhotographyRetry(true); setActivityMessage('Photo was not saved yet. Press P to retry the original photo.'); }
        else setToast(cause instanceof Error ? cause.message : String(cause));
      }
      return null;
    } finally {
      captureBusyRef.current = false;
      setCaptureBusy(false);
    }
  }, [authHeaders, networkSession]);

  const captureAutomaticMemory = useCallback(async (tag: string): Promise<void> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || captureBusyRef.current) return;
    const context = engine.getMemoryContext();
    const participantFrame = engine.getMemoryParticipantContext();
    const participants = [networkSession.userId, ...participantFrame.visibleUserIds];
    const participantsExpected = participantFrame.onlineUserIds.length > 0 ? 2 : 1;
    const participantsVisible = Math.min(participantsExpected, participants.length);
    const occlusionRatio = participantFrame.onlineUserIds.length > 0 && participantFrame.visibleUserIds.length === 0 ? 0.28 : 0.02;
    const secondsSinceAutomaticCapture = Math.max(0, (performance.now() - lastAutomaticCaptureRef.current) / 1000);
    const scenic = /Bay|Park|Hill|Garden|Cove|Sunset/i.test(context.locationId) ? 0.95 : 0.62;
    const minute = context.gameMinutes % 1440;
    const lighting = (minute >= 16.5 * 60 && minute <= 19.5 * 60) || (minute >= 5.5 * 60 && minute <= 7.5 * 60) ? 0.95 : 0.72;
    const score = scoreMemoryCapture({
      participantsVisible, participantsExpected, occlusionRatio,
      composition: participantFrame.composition, storyRelevance: 0.86, scenicValue: scenic, lightingQuality: lighting,
      secondsSinceAutomaticCapture,
    });
    if (!shouldAutoCapture(score, secondsSinceAutomaticCapture)) return;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    try {
      const blob = await engine.captureFrame(0.88);
      const imageId = `auto_${crypto.randomUUID().replaceAll('-', '')}`;
      const imageResponse = await apiFetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, {
        method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...authHeaders() }, body: blob,
      });
      if (!imageResponse.ok) throw new Error(`Automatic Memory image upload failed (${imageResponse.status})`);
      const image = await imageResponse.json() as { screenshotPath: string };
      const caption = automaticCaption(tag, context.locationId, context.weather);
      const memoryResponse = await apiFetch(`/api/households/${networkSession.householdId}/memories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idempotencyKey: `automatic:${tag}:${Math.floor(context.gameMinutes)}:${crypto.randomUUID()}`,
          type: 'automatic', screenshotPath: image.screenshotPath, caption,
          locationId: context.locationId, weather: context.weather, participants,
          metadata: {
            gameMinutes: context.gameMinutes,
            source: 'smart-capture',
            tag,
            score,
            onlineHouseholdMembers: 1 + participantFrame.onlineUserIds.length,
            framedHouseholdMembers: participants.length,
          },
        }),
      });
      if (!memoryResponse.ok) throw new Error(`Automatic Memory creation failed (${memoryResponse.status})`);
      const memory = await memoryResponse.json() as MemoryView;
      lastAutomaticCaptureRef.current = performance.now();
      setMemories((current) => [memory, ...current.filter((entry) => entry.id !== memory.id)]);
      setToast('A quiet moment was added to your Memory Book');
      window.setTimeout(() => setToast(null), 2600);
    } catch (cause) {
      // Automatic Memory failure must never interrupt the activity itself.
      console.warn('[Together Memory]', cause);
    } finally {
      captureBusyRef.current = false;
      setCaptureBusy(false);
    }
  }, [authHeaders, networkSession]);

  const exportMemory = useCallback(async (memory: MemoryView): Promise<void> => {
    if (!networkSession) return;
    const imageId = memory.screenshotPath.startsWith('memory-image:') ? memory.screenshotPath.slice('memory-image:'.length) : null;
    if (!imageId) throw new Error('This Memory has no private image to export');
    const response = await apiFetch(`/api/households/${networkSession.householdId}/memory-images/${encodeURIComponent(imageId)}`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Memory image export failed (${response.status})`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 900;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas export is unavailable');
    context.fillStyle = '#eee7d8'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f8f4ea'; context.fillRect(48, 48, 1104, 804);
    const photoX = 90, photoY = 90, photoW = 1020, photoH = 585;
    const scale = Math.max(photoW / bitmap.width, photoH / bitmap.height);
    const drawW = bitmap.width * scale, drawH = bitmap.height * scale;
    context.save(); context.beginPath(); context.rect(photoX, photoY, photoW, photoH); context.clip();
    context.drawImage(bitmap, photoX + (photoW - drawW) / 2, photoY + (photoH - drawH) / 2, drawW, drawH); context.restore();
    bitmap.close();
    context.fillStyle = '#30312d'; context.font = '600 30px system-ui, sans-serif'; context.fillText('TOGETHER · AMAYA BAY', 90, 730);
    context.font = '36px Georgia, serif'; wrapCanvasText(context, memory.caption, 90, 782, 980, 42);
    context.fillStyle = '#6c685e'; context.font = '22px system-ui, sans-serif';
    context.fillText(`${memory.locationId.replaceAll('_',' ')} · ${memory.weather.replaceAll('_',' ')} · ${new Date(memory.createdAt).toLocaleDateString()}`, 90, 840);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create share card')), 'image/jpeg', 0.9));
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `together-memory-${memory.id}.jpg`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [authHeaders, networkSession]);

  const updateMemoryCaption = useCallback(async (memoryId: string, caption: string): Promise<void> => {
    if (!networkSession) return;
    const response = await apiFetch(`/api/households/${networkSession.householdId}/memories/${memoryId}/caption`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ caption }),
    });
    if (!response.ok) throw new Error(`Caption update failed (${response.status})`);
    const updated = await response.json() as MemoryView;
    setMemories((current) => current.map((memory) => memory.id === updated.id ? updated : memory));
  }, [authHeaders, networkSession]);

  const refreshKitchen = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [inventoryResponse, sessionsResponse] = await Promise.all([
      apiFetch(`/api/households/${networkSession.householdId}/inventory`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/cooking`, { headers: authHeaders() }),
    ]);
    if (!inventoryResponse.ok) throw new Error(`Kitchen inventory request failed (${inventoryResponse.status})`);
    if (!sessionsResponse.ok) throw new Error(`Cooking session request failed (${sessionsResponse.status})`);
    setKitchenInventory(await inventoryResponse.json() as KitchenInventoryView[]);
    const sessions = await sessionsResponse.json() as CookingSessionView[];
    setCookingSession(sessions.find((session) => session.state.status === 'active') ?? sessions[0] ?? null);
  }, [authHeaders, networkSession]);

  const commitDecoration = useCallback(async (change: DecorationCommit): Promise<void> => {
    if (!networkSession) { setDecorateMessage('Join a household before changing a persistent home.'); return; }
    setDecorateBusy(true); setDecorateMessage(null);
    const execute = async (expectedVersion: number) => apiFetch(`/api/households/${networkSession.householdId}/home/furniture`, {
      method: change.mode === 'place' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        objectId: change.objectId,
        definitionId: change.definitionId,
        roomId: change.roomId,
        expectedVersion,
        idempotencyKey: `decor:${change.mode}:${crypto.randomUUID()}`,
        transform: { position: { x: change.placement.x, y: 0, z: change.placement.z }, rotationY: change.placement.rotationY, scale: 1 },
      }),
    });
    try {
      let response = await execute(homeVersionRef.current);
      if (!response.ok && response.status < 500) response = await execute(await refreshHomeVersion());
      const data = await response.json() as HomeStateView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Furniture placement was rejected');
      homeVersionRef.current = data.version; setHomeState(data); engineRef.current?.syncHomeDecoration(data.objects, data.surfaces); engineRef.current?.clearHomeDecorationPreview();
      setDecorateMessage(change.mode === 'place' ? 'Placed in the shared home.' : 'Furniture moved.');
      if (change.mode === 'place') void refreshKitchen().catch(() => undefined);
    } catch (cause) { setDecorateMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setDecorateBusy(false); }
  }, [authHeaders, networkSession, refreshHomeVersion, refreshKitchen]);

  const removeDecoration = useCallback(async (objectId: string): Promise<void> => {
    if (!networkSession) return;
    setDecorateBusy(true); setDecorateMessage(null);
    try {
      const query = new URLSearchParams({ expectedVersion: String(homeVersionRef.current), idempotencyKey: `decor:remove:${crypto.randomUUID()}` });
      let response = await apiFetch(`/api/households/${networkSession.householdId}/home/furniture/${encodeURIComponent(objectId)}?${query}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok && response.status < 500) {
        const version = await refreshHomeVersion();
        query.set('expectedVersion', String(version)); query.set('idempotencyKey', `decor:remove:${crypto.randomUUID()}`);
        response = await apiFetch(`/api/households/${networkSession.householdId}/home/furniture/${encodeURIComponent(objectId)}?${query}`, { method: 'DELETE', headers: authHeaders() });
      }
      const data = await response.json() as HomeStateView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not remove furniture');
      homeVersionRef.current = data.version; setHomeState(data); engineRef.current?.syncHomeDecoration(data.objects, data.surfaces); engineRef.current?.clearHomeDecorationPreview(); setDecorateMessage('Furniture removed.'); void refreshKitchen().catch(() => undefined);
    } catch (cause) { setDecorateMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setDecorateBusy(false); }
  }, [authHeaders, networkSession, refreshHomeVersion, refreshKitchen]);

  const setHomeSurface = useCallback(async (surfaceId: string, finishId: string): Promise<void> => {
    if (!networkSession) return;
    setDecorateBusy(true); setDecorateMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/home/surfaces/${encodeURIComponent(surfaceId)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ finishId, expectedVersion: homeVersionRef.current, idempotencyKey: `decor:surface:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as HomeStateView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Surface change was rejected');
      homeVersionRef.current = data.version; setHomeState(data); setDecorateMessage('Surface finish saved.');
    } catch (cause) { setDecorateMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setDecorateBusy(false); }
  }, [authHeaders, networkSession]);

  const bookAutoRide = useCallback(async (destinationId: string, skip: boolean): Promise<void> => {
    if (!networkSession) { setAutoMessage('Join a household before using persistent city transit.'); return; }
    if (autoBookingInFlight.current) return;
    const position = engineRef.current?.getPlayerPosition();
    const from = position ? { x: position.x, z: position.z } : autoFrom;
    let intent = autoBookingIntent.current;
    if (intent && (intent.householdId !== networkSession.householdId || intent.userId !== networkSession.userId)) intent = null;
    if (intent && intent.destinationId !== destinationId) { setAutoMessage('Retry the previous destination first to confirm whether its fare was saved.'); return; }
    intent ??= { householdId: networkSession.householdId, userId: networkSession.userId, from, destinationId, idempotencyKey: `auto:${crypto.randomUUID()}` };
    autoBookingIntent.current = intent;
    autoBookingInFlight.current = true;
    const generation = autoViewGeneration.current;
    setAutoBusy(true); setAutoMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/transit/auto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ from: intent.from, destinationId: intent.destinationId, idempotencyKey: intent.idempotencyKey }),
      });
      const data = await response.json() as { fare?: number; personalWallet?: number; error?: string };
      if (!response.ok) { autoBookingIntent.current = null; throw new Error(data.error ?? 'Could not book auto-rickshaw'); }
      autoBookingIntent.current = null;
      if (generation !== autoViewGeneration.current) return;
      setAutoOpen(false);
      engineRef.current?.startAutoRide(destinationId, skip);
      setToast(`Auto fare ₹${data.fare ?? 0} · personal wallet ₹${data.personalWallet ?? 'updated'}`);
      window.setTimeout(() => setToast(null), 2600);
    } catch (cause) { if (generation === autoViewGeneration.current) setAutoMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { autoBookingInFlight.current = false; setAutoBusy(false); }
  }, [authHeaders, autoFrom, networkSession]);

  const readJobSessions = useCallback(async (): Promise<JobSessionView[]> => {
    if (!networkSession) return [];
    const response = await apiFetch(`/api/households/${networkSession.householdId}/jobs`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Saved shifts could not be read (${response.status})`);
    const sessions = await response.json() as JobSessionView[];
    if (!Array.isArray(sessions)) throw new Error('Saved shifts returned an invalid response');
    return sessions;
  }, [authHeaders, networkSession]);

  const startJob = useCallback(async (jobId: JobId): Promise<void> => {
    if (jobBusy) return;
    if (!networkSession) { setToast('Connect a household to work a persistent shift.'); return; }
    const generation = jobViewGeneration.current;
    setJobBusy(true); setJobMessage(null);
    try {
      const existing = (await readJobSessions()).find(session => session.jobId === jobId && session.state === 'active');
      if (generation !== jobViewGeneration.current) return;
      if (existing) {
        setVenueSession(null); setJobSession(existing); setJobMessage('Resumed your saved shift. Continue where you left off.');
        return;
      }
      const response = await apiFetch(`/api/households/${networkSession.householdId}/jobs/${jobId}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ idempotencyKey: `job-start:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as JobSessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not start shift');
      if (generation !== jobViewGeneration.current) return;
      setVenueSession(null); setJobSession(data); setJobMessage('Clocked in. Work through the physical task sequence.');
    } catch (error) {
      if (generation !== jobViewGeneration.current) return;
      const message = error instanceof Error ? error.message : 'Could not start shift';
      setJobMessage(message); setToast(message); window.setTimeout(() => setToast(null), 5000);
    }
    finally { setJobBusy(false); }
  }, [authHeaders, jobBusy, networkSession, readJobSessions]);

  const advanceJob = useCallback(async (action: string): Promise<void> => {
    if (!networkSession || !jobSession || jobBusy) return;
    const generation = jobViewGeneration.current;
    setJobBusy(true); setJobMessage(null);
    try {
      const engine = engineRef.current;
      if (!engine) throw new Error('The world is still preparing. Try again shortly.');
      await engine.playContextAction(action);
      const response = await apiFetch(`/api/job-sessions/${jobSession.id}/advance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ action }),
      });
      const data = await response.json() as JobSessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Task could not be recorded');
      if (generation !== jobViewGeneration.current) return;
      setJobSession(data); setJobMessage(data.nextAction ? 'Task done. Move to the next part of the shift.' : 'The shift tasks are finished. Clock out when ready.');
    } catch (error) {
      if (generation !== jobViewGeneration.current) return;
      const message = error instanceof Error ? error.message : 'Task failed';
      try {
        const saved = (await readJobSessions()).find(session => session.id === jobSession.id);
        if (generation !== jobViewGeneration.current) return;
        if (saved) setJobSession(current => current?.id === saved.id ? saved : current);
        setJobMessage(`${message}. Saved progress refreshed; continue from the next available task.`);
      } catch {
        if (generation !== jobViewGeneration.current) return;
        setJobMessage(`${message}. Could not refresh saved progress. Reopen the shift when your connection recovers.`);
      }
    }
    finally { setJobBusy(false); }
  }, [authHeaders, jobBusy, jobSession, networkSession, readJobSessions]);

  const completeJob = useCallback(async (): Promise<void> => {
    if (!networkSession || !jobSession || jobBusy) return;
    const generation = jobViewGeneration.current;
    setJobBusy(true); setJobMessage(null);
    try {
      const response = await apiFetch(`/api/job-sessions/${jobSession.id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ idempotencyKey: `job-finish:${jobSession.id}` }),
      });
      const data = await response.json() as { session?: JobSessionView; economy?: { personalWallet: number }; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? 'Could not complete shift');
      if (generation !== jobViewGeneration.current) return;
      setJobSession(data.session); setJobMessage(`Shift paid. Personal wallet ₹${data.economy?.personalWallet ?? 'updated'}.`);
    } catch (error) { if (generation === jobViewGeneration.current) setJobMessage(error instanceof Error ? error.message : 'Could not finish shift'); }
    finally { setJobBusy(false); }
  }, [authHeaders, jobBusy, jobSession, networkSession]);

  const refreshStories = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [instancesResponse, eligibleResponse] = await Promise.all([
      apiFetch(`/api/households/${networkSession.householdId}/stories`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/stories/eligible`, { headers: authHeaders() }),
    ]);
    if (!instancesResponse.ok || !eligibleResponse.ok) throw new Error('Could not read household story state');
    const instances = await instancesResponse.json() as StoryInstanceView[];
    setStoryActive(instances.find((instance) => instance.state === 'active') ?? null);
    setStoryEligible(await eligibleResponse.json() as StoryDefinition[]);
  }, [authHeaders, networkSession]);

  const startStory = useCallback(async (eventId: string): Promise<void> => {
    if (!networkSession) return;
    setStoryBusy(true); setStoryMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/stories/${encodeURIComponent(eventId)}/start`, { method: 'POST', headers: authHeaders() });
      const data = await response.json() as StoryInstanceView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Story could not begin');
      setStoryActive(data); await refreshStories(); setStoryMessage('This moment has begun. The rest of the city stays open.');
    } catch (cause) { setStoryMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setStoryBusy(false); }
  }, [authHeaders, networkSession, refreshStories]);

  const updateStoryTask = useCallback(async (instanceId: string, taskId: string, state: StoryTaskStateValue): Promise<void> => {
    if (!networkSession) return;
    setStoryBusy(true); setStoryMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/stories/instances/${instanceId}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ state }),
      });
      const data = await response.json() as StoryInstanceView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Story task could not be saved');
      setStoryActive(data); setStoryMessage(state === 'failed' ? 'That did not go perfectly. The story will remember it.' : 'Moment recorded.');
    } catch (cause) { setStoryMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setStoryBusy(false); }
  }, [authHeaders, networkSession]);

  // The household's active story shows a lantern over its next place to visit; arriving records the visit.
  useEffect(() => {
    if (!ready || !networkSession) return;
    void refreshStories().catch(() => undefined);
  }, [ready, networkSession, refreshStories]);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.setStoryLocation) return;
    const definition = storyActive?.state === 'active' ? storyEvents.find(event => event.id === storyActive.eventId) : undefined;
    const next = definition?.tasks.find(task => task.type === 'location' && (storyActive!.taskState[task.id] ?? 'pending') === 'pending');
    if (!storyActive || !next) { engine.setStoryLocation(null); return; }
    engine.setStoryLocation(next.target, () => { void updateStoryTask(storyActive.id, next.id, 'complete'); });
  }, [ready, storyActive, updateStoryTask]);

  const createStoryMemory = useCallback(async (instance: StoryInstanceView): Promise<void> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || !instance.memoryTag) return;
    const context = engine.getMemoryContext();
    const definition = storyEvents.find((event) => event.id === instance.eventId);
    const blob = await engine.captureFrame();
    const imageId = `story_${crypto.randomUUID().replaceAll('-', '')}`;
    const imageResponse = await apiFetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...authHeaders() }, body: blob });
    if (!imageResponse.ok) return;
    const image = await imageResponse.json() as { screenshotPath: string };
    await apiFetch(`/api/households/${networkSession.householdId}/memories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        idempotencyKey: `story:${instance.id}`, type: 'story', screenshotPath: image.screenshotPath,
        caption: definition?.title ?? instance.eventId.replaceAll('_', ' '), locationId: context.locationId, weather: context.weather,
        participants: [networkSession.userId], eventId: instance.eventId, metadata: { branch: instance.branch, memoryTag: instance.memoryTag, gameMinutes: context.gameMinutes },
      }),
    });
  }, [authHeaders, networkSession]);

  const resolveStory = useCallback(async (instanceId: string): Promise<void> => {
    if (!networkSession) return;
    setStoryBusy(true); setStoryMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/stories/instances/${instanceId}/resolve`, { method: 'POST', headers: authHeaders() });
      const data = await response.json() as StoryInstanceView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Story could not resolve');
      await createStoryMemory(data); setStoryActive(null); await refreshStories();
      setStoryMessage(data.branch ? `The moment settled as “${data.branch.replaceAll('_', ' ')}”.` : 'The moment settled.');
      void refreshMemories().catch(() => undefined);
    } catch (cause) { setStoryMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setStoryBusy(false); }
  }, [authHeaders, createStoryMemory, networkSession, refreshMemories, refreshStories]);



  const openKitchen = useCallback((): void => {
    if (!networkSession) { setToast('Join a household to use the shared kitchen.'); return; }
    setCookingOpen(true); setCookingMessage(null); setVenueSession(null); setJobSession(null); closeActivity();
    void refreshKitchen().catch((cause: unknown) => setCookingMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [closeActivity, networkSession, refreshKitchen]);

  const startCooking = useCallback(async (recipeId: string): Promise<void> => {
    if (!networkSession) return;
    setCookingBusy(true); setCookingMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/cooking`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ recipeId, idempotencyKey: `cook:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as CookingSessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not start cooking');
      setCookingSession(data); await refreshKitchen(); setCookingMessage('Ingredients are out. Pick a free station and begin.');
    } catch (cause) { setCookingMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setCookingBusy(false); }
  }, [authHeaders, networkSession, refreshKitchen]);

  const performCookingStep = useCallback(async (step: RecipeStep, mistake: boolean): Promise<void> => {
    if (!networkSession || !cookingSession) return;
    setCookingBusy(true); setCookingMessage(null);
    const base = `/api/households/${networkSession.householdId}/cooking/${cookingSession.id}`;
    let stationClaimed = false;
    try {
      const claim = await apiFetch(`${base}/stations/${encodeURIComponent(step.station)}/claim`, { method: 'POST', headers: authHeaders() });
      const claimed = await claim.json() as CookingSessionView & { error?: string };
      if (!claim.ok) throw new Error(claimed.error ?? `${step.station} is occupied`);
      stationClaimed = true;
      setCookingSession(claimed);
      const engine = engineRef.current;
      if (!engine) throw new Error('The world is still preparing. Try again shortly.');
      await engine.playCookingAction(step.action);
      const complete = await apiFetch(`${base}/steps/${encodeURIComponent(step.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ mistake }),
      });
      const completed = await complete.json() as CookingSessionView & { error?: string };
      if (!complete.ok) throw new Error(completed.error ?? 'Cooking step could not be completed');
      setCookingSession(completed);
      if (completed.state.status === 'completed') {
        const quality = completed.state.outcome?.quality ?? 'shared';
        setCookingMessage(quality === 'burnt' ? 'Dinner got a little burnt. It still counts as dinner—and a story.' : quality === 'imperfect' ? 'A little imperfect. Still warm, shared food.' : 'Meal ready. Serve it while it is warm.');
        void engineRef.current?.playCookingAction('serve').catch(() => undefined);
        void captureAutomaticMemory('shared_meal');
      } else setCookingMessage('Step complete. Another station may have opened up.');
    } catch (cause) { setCookingMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally {
      if (stationClaimed) {
        try {
          setCookingSession(await releaseKitchenStation(base, step.station, authHeaders()));
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          setCookingMessage(current => `${current ? `${current} ` : ''}${message}. Retry your step to resume your station.`);
        }
      }
      setCookingBusy(false);
    }
  }, [authHeaders, captureAutomaticMemory, cookingSession, networkSession]);

  const acceptActivitySnapshot = useCallback((incoming: ActivitySessionView, message?: string): ActivitySessionView => {
    const previous = activitySnapshot.current;
    const accepted = mergeActivitySnapshot(previous, incoming);
    // Keep a synchronous accepted revision so replies in the same render turn
    // use the latest server state. Effects never run inside a React updater.
    activitySnapshot.current = accepted;
    acceptAmbientActivity(accepted);
    setActivitySession(accepted);
    setPhotographyFraming(accepted.activityId === 'photography' && accepted.state.status === 'active' && accepted.state.completedStepIds.includes('frame'));
    if (accepted.state.status === 'complete') {
      setActivityMessage('A small piece of the day, finished together.');
      if (accepted.activityId !== 'photography' && previous?.id === accepted.id && previous.state.status !== 'complete') void captureAutomaticMemory(accepted.activityId);
    } else if (message) setActivityMessage(message);
    return accepted;
  }, [captureAutomaticMemory, acceptAmbientActivity]);

  const refreshActiveActivity = useCallback(async (): Promise<void> => {
    if (!networkSession || !activitySession) return;
    const generation = activityViewGeneration.current;
    const sessionId = activitySession.id;
    const requestedRevision = activitySnapshot.current;
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/activities`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`Activity list failed (${response.status})`);
      const sessions = await response.json() as ActivitySessionView[];
      if (generation !== activityViewGeneration.current) return;
      if (activitySnapshot.current?.id !== sessionId) return;
      const incoming = sessions.find(candidate => candidate.id === sessionId);
      if (incoming) acceptActivitySnapshot(incoming);
    } catch (cause) {
      if (generation === activityViewGeneration.current && activitySnapshot.current === requestedRevision) setActivityMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }, [acceptActivitySnapshot, activitySession, authHeaders, networkSession]);

  const openActivity = useCallback(async (activityId: ActivityId): Promise<void> => {
    if (!networkSession) { setToast('Join a household to share persistent activities.'); return; }
    if (activityOperation.current !== null) return;
    const generation = ++activityViewGeneration.current;
    activityOperation.current = generation;
    setActivityBusy(true); setActivityMessage(null); setVenueSession(null); setJobSession(null); setCookingOpen(false);
    try {
      const listResponse = await apiFetch(`/api/households/${networkSession.householdId}/activities`, { headers: authHeaders() });
      if (!listResponse.ok) throw new Error(`Activity list failed (${listResponse.status})`);
      const sessions = await listResponse.json() as ActivitySessionView[];
      if (generation !== activityViewGeneration.current) return;
      const active = sessions.filter(candidate => candidate.activityId === activityId && candidate.state.status === 'active' && candidate.state.badminton?.phase !== 'cancelled');
      if (activityId === 'picnic' || activityId === 'cafe_hangout') active.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      let session = active.find(candidate => candidate.state.transportRental?.rentals.some(rental => rental.ownerUserId === networkSession.userId && rental.status !== 'returned')) ?? active[0] ?? null;
      if (!session) {
        const start = await apiFetch(`/api/households/${networkSession.householdId}/activities/${activityId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ idempotencyKey: `activity:${activityId}:${crypto.randomUUID()}` }),
        });
        const data = await start.json() as ActivitySessionView & { error?: string };
        if (!start.ok) throw new Error(data.error ?? 'Could not begin activity');
        session = data;
      } else if (!session.state.participants.includes(networkSession.userId) && !(session.state.golf?.revision || session.state.badminton?.revision || session.state.boardGame?.revision)) {
        const join = await apiFetch(`/api/activities/${session.id}/join`, { method: 'POST', headers: authHeaders() });
        const data = await join.json() as ActivitySessionView & { error?: string };
        if (!join.ok) throw new Error(data.error ?? 'Could not join activity');
        session = data;
      }
      if (generation !== activityViewGeneration.current) return;
      if ((activityId === 'mini_golf' && !session.state.golf) || (activityId === 'badminton' && !session.state.badminton) || (activityId === 'board_game' && !session.state.boardGame) || (activityId === 'picnic' && !session.state.picnic) || (activityId === 'cafe_hangout' && !session.state.cafe) || ((activityId === 'cycling' || activityId === 'kayak' || activityId === 'scooter_ride') && !session.state.transportRental)) {
        const upgrade = await apiFetch(`/api/activities/${session.id}/sports/start`, { method: 'POST', headers: authHeaders() });
        const data = await upgrade.json() as ActivitySessionView & { error?: string };
        if (!upgrade.ok) throw new Error(data.error ?? 'Could not start sports gameplay');
        session = data;
      }
      if (generation !== activityViewGeneration.current) return;
      acceptActivitySnapshot(session, 'No rush. Take the activity one physical step at a time.');
    } catch (cause) { if (generation === activityViewGeneration.current) setActivityMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { if (activityOperation.current === generation) { activityOperation.current = null; setActivityBusy(false); } }
  }, [acceptActivitySnapshot, authHeaders, networkSession]);

  useEffect(() => {
    if (!activitySession?.state?.golf && !activitySession?.state?.badminton && !activitySession?.state?.picnic && !activitySession?.state?.cafe) return;
    engineRef.current?.showSports(activitySession.id, activitySession.state, activitySession.serverNow);
  }, [activitySession, ready]);

  useEffect(() => {
    // Raw groceries (not cooked dishes) show in the bicycle basket.
    const groceries = kitchenInventory.filter(entry => !entry.itemId.startsWith('dish:')).reduce((sum, entry) => sum + Math.max(0, entry.quantity), 0);
    engineRef.current?.setBasketLoad?.(groceries);
  }, [kitchenInventory, ready]);

  const picnicRevision = activitySession?.state?.picnic?.revision;
  useEffect(() => {
    if (picnicRevision === undefined) return;
    void refreshKitchen().catch(() => undefined);
  }, [picnicRevision, refreshKitchen]);

  const sportsSessionId = activitySession?.state?.golf || activitySession?.state?.badminton || activitySession?.state?.boardGame || activitySession?.state?.picnic || activitySession?.state?.cafe ? activitySession.id : undefined;
  useEffect(() => {
    if (!sportsSessionId) return;
    const id = sportsSessionId, generation = activityViewGeneration.current;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await apiFetch(`/api/activities/${id}/sports`, { headers: authHeaders() });
        if (!response.ok) throw new Error('Sports connection interrupted; retrying.');
        const saved = await response.json() as ActivitySessionView;
        if (!stopped && generation === activityViewGeneration.current) acceptActivitySnapshot(saved);
      } catch (cause) { if (!stopped && generation === activityViewGeneration.current) setActivityMessage(cause instanceof Error ? cause.message : String(cause)); }
      finally { if (!stopped) timer = setTimeout(() => void poll(), 180); }
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [sportsSessionId, acceptActivitySnapshot, authHeaders]);

  const sendSports = useCallback(async (path: string, input: GolfShotIntent | BadmintonCommand | BoardGameCommand | PhotographyCommand | PicnicCommand | CafeCommand): Promise<void> => {
    const session = activitySnapshot.current;
    if (!session || !networkSession || activityOperation.current !== null) return;
    const generation = activityViewGeneration.current;
    const pending = sportsPending.current ?? { sessionId: session.id, path, key: 'key' in input ? input.key : input.id, input };
    sportsPending.current = pending;
    activityOperation.current = generation; setActivityBusy(true); setActivityMessage(null);
    try {
      const response = await apiFetch(`/api/activities/${pending.sessionId}/${pending.path}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(pending.input) });
      const saved = await response.json() as ActivitySessionView & { error?: string };
      if (!response.ok) throw new Error(saved.error ?? 'Sports command was not accepted');
      if (generation !== activityViewGeneration.current) return;
      acceptActivitySnapshot(saved); sportsPending.current = null;
    } catch (cause) {
      if (generation !== activityViewGeneration.current) return;
      try {
        const response = await apiFetch(`/api/activities/${pending.sessionId}/sports`, { headers: authHeaders() });
        if (response.ok) {
          const saved = await response.json() as ActivitySessionView;
          if (generation !== activityViewGeneration.current) return;
          acceptActivitySnapshot(saved);
          if (saved.state.receipts?.[pending.key]) { sportsPending.current = null; setActivityMessage('Saved move recovered.'); return; }
          sportsPending.current = null;
        }
      } catch { /* Preserve the exact command key until its outcome can be reconciled. */ }
      setActivityMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (activityOperation.current === generation) { activityOperation.current = null; setActivityBusy(false); }
    }
  }, [acceptActivitySnapshot, authHeaders, networkSession]);

  const persistRentalCommand = useCallback(async function requestRental(command: TransportRentalCommand, generation: number): Promise<ActivitySessionView> {
    const session = activitySnapshot.current;
    if (!session) throw new Error('Reopen the outing before using equipment.');
    if (rentalPending.current && rentalPending.current.command.kind !== command.kind) {
      await requestRental(rentalPending.current.command, generation);
      if (generation !== activityViewGeneration.current) throw new Error('Outing closed while recovering equipment.');
      const latest = activitySnapshot.current?.state.transportRental;
      return requestRental({ ...command, expectedRevision: latest?.revision ?? command.expectedRevision }, generation);
    }
    const pending = rentalPending.current ?? { sessionId: session.id, command };
    rentalPending.current = pending;
    let rejectionConfirmed = false;
    try {
      const response = await apiFetch(`/api/activities/${pending.sessionId}/rental/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(pending.command) });
      const saved = await response.json() as ActivitySessionView & { error?: string };
      if (!response.ok) { rejectionConfirmed = true; throw new Error(saved.error ?? 'Equipment could not be saved.'); }
      if (generation === activityViewGeneration.current) { acceptActivitySnapshot(saved); rentalPending.current = null; }
      return saved;
    } catch (cause) {
      const response = await apiFetch(`/api/activities/${pending.sessionId}/sports`, { headers: authHeaders() });
      if (response.ok) {
        const saved = await response.json() as ActivitySessionView;
        if (generation === activityViewGeneration.current) acceptActivitySnapshot(saved);
        if (saved.state.receipts?.[pending.command.key]) {
          if (generation === activityViewGeneration.current) rentalPending.current = null;
          return saved;
        }
        if (generation === activityViewGeneration.current && pending.command.kind !== 'return') rentalPending.current = null;
        if (generation === activityViewGeneration.current && rejectionConfirmed && pending.command.kind === 'return' && saved.state.transportRental && saved.state.transportRental.revision !== pending.command.expectedRevision) {
          rentalPending.current = { sessionId: pending.sessionId, command: { ...pending.command, key: crypto.randomUUID(), expectedRevision: saved.state.transportRental.revision } };
        }
      }
      throw cause;
    }
  }, [acceptActivitySnapshot, authHeaders]);

  const retryRentalReturn = useCallback(async (): Promise<void> => {
    const pending = rentalPending.current, session = activitySnapshot.current;
    if (!pending || pending.command.kind !== 'return' || !session?.state.transportRental) return;
    const generation = activityViewGeneration.current;
    setActivityBusy(true); setActivityTravel({ kind: session.state.transportRental.activityId, phase: 'saving' });
    try { await persistRentalCommand(pending.command, generation); if (generation === activityViewGeneration.current) { setActivityTravel(null); setActivityMessage('Equipment returned.'); } }
    catch (cause) { if (generation === activityViewGeneration.current) { setActivityTravel({ kind: session.state.transportRental.activityId, phase: 'retry' }); setActivityMessage(cause instanceof Error ? cause.message : String(cause)); } }
    finally { if (generation === activityViewGeneration.current) setActivityBusy(false); }
  }, [persistRentalCommand]);

  const handleRentalCommand = useCallback(async (input: TransportRentalCommand): Promise<void> => {
    if (activityOperation.current !== null || !networkSession) return;
    const session = activitySnapshot.current, engine = engineRef.current;
    if (!session?.state.transportRental || !engine) return;
    const generation = activityViewGeneration.current, kind = session.state.transportRental.activityId;
    const abort = new AbortController(); activityAbort.current = abort;
    activityOperation.current = generation; setActivityBusy(true); setActivityMessage(null);
    let physicalReturn = false;
    try {
      if (input.kind === 'return') { await engine.playActivityStep(kind, { id: kind === 'cycling' ? 'park_cycle' : kind === 'scooter_ride' ? 'park_scooter' : 'return', label: 'Return equipment', animation: 'place' }, abort.signal); physicalReturn = true; }
      const saved = await persistRentalCommand(input, generation);
      if (generation !== activityViewGeneration.current) return;
      if (input.kind === 'depart') {
        setActivityTravel({ kind, phase: 'travelling' }); setActivityBusy(false);
        await engine.playTransportOuting(kind, abort.signal);
        if (generation !== activityViewGeneration.current) return;
        physicalReturn = true;
        setActivityBusy(true); setActivityTravel({ kind, phase: 'saving' });
        const latest = activitySnapshot.current ?? saved;
        const rental = [...latest.state.transportRental!.rentals].reverse().find(item => item.ownerUserId === networkSession.userId)!;
        await persistRentalCommand({ key: crypto.randomUUID(), expectedRevision: latest.state.transportRental!.revision, kind: 'return', rentalId: rental.rentalId }, generation);
        if (generation !== activityViewGeneration.current) return;
        setActivityTravel(null); setActivityMessage('Equipment returned.');
      }
    } catch (cause) {
      if (generation !== activityViewGeneration.current) return;
      if (physicalReturn) setActivityTravel({ kind, phase: 'retry' });
      else setActivityTravel(null);
      setActivityMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (activityOperation.current === generation) { activityOperation.current = null; setActivityBusy(false); }
    }
  }, [networkSession, persistRentalCommand]);

  const persistTransportSave = useCallback(async (save: TransportOutingSave, kind: 'cycling' | 'kayak' | 'scooter_ride', abort: AbortController, generation: number): Promise<void> => {
    if (!networkSession) return;
    setActivityTravel({ kind, phase: 'saving' });
    const sessionId = activitySnapshot.current?.id;
    if (!sessionId) throw new Error('Reopen the activity before saving your outing.');
    try {
      const completed = await save.persist(async stepId => {
        const response = await apiFetch(`/api/activities/${sessionId}/steps/${encodeURIComponent(stepId)}`, { method: 'POST', headers: authHeaders() });
        const data = await response.json() as ActivitySessionView & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Outing step could not be saved');
        return generation === activityViewGeneration.current ? acceptActivitySnapshot(data) : data;
      }, async () => {
        const response = await apiFetch(`/api/households/${networkSession.householdId}/activities`, { headers: authHeaders() });
        if (!response.ok) throw new Error(`Activity list failed (${response.status})`);
        const sessions = await response.json() as ActivitySessionView[];
        const saved = sessions.find(candidate => candidate.id === sessionId) ?? null;
        return saved && generation === activityViewGeneration.current ? acceptActivitySnapshot(saved) : saved;
      }, abort.signal);
      if (generation !== activityViewGeneration.current) return;
      acceptActivitySnapshot(completed);
      activityFinishedSave.current = null;
      setActivityTravel(null);
    } catch (cause) {
      if (generation !== activityViewGeneration.current) return;
      setActivityTravel({ kind, phase: 'retry' });
      setActivityMessage(`${cause instanceof Error ? cause.message : String(cause)}. Your equipment is returned; retry saving when ready.`);
    }
  }, [acceptActivitySnapshot, authHeaders, networkSession]);

  const retryTransportSave = useCallback(async (): Promise<void> => {
    const finished = activityFinishedSave.current;
    if (!finished || activityOperation.current !== null) return;
    const generation = activityViewGeneration.current;
    const abort = new AbortController();
    activityOperation.current = generation; activityAbort.current = abort; setActivityBusy(true);
    try { await persistTransportSave(finished.save, finished.kind, abort, generation); }
    finally {
      if (activityAbort.current === abort) activityAbort.current = null;
      if (activityOperation.current === generation) { activityOperation.current = null; setActivityBusy(false); }
    }
  }, [persistTransportSave]);

  const capturePhotography = useCallback(async (): Promise<void> => {
    const session = activitySnapshot.current;
    if (!session || session.activityId !== 'photography' || session.state.status !== 'active' || activityOperation.current !== null) return;
    const generation = activityViewGeneration.current;
    let command = photographyPending.current;
    if (!command) {
      const memory = await captureMemory(session.id);
      if (!memory || generation !== activityViewGeneration.current) return;
      command = { key: crypto.randomUUID(), expectedRevision: session.state.revision ?? 0, memoryId: memory.id };
      photographyPending.current = command;
    }
    await sendSports('photography/capture', command);
    const current = activitySnapshot.current;
    if (generation === activityViewGeneration.current && !sportsPending.current && current?.id === session.id && current.state.status === 'active') {
      setPhotographyRetry(true);
      photographyPending.current = { ...command, key: crypto.randomUUID(), expectedRevision: current.state.revision ?? 0 };
    }
  }, [captureMemory, sendSports]);

  const advanceActivity = useCallback(async (step: ActivityStep): Promise<void> => {
    if (!networkSession || !activitySession || activityOperation.current !== null) return;
    const generation = activityViewGeneration.current;
    activityOperation.current = generation;
    const abort = new AbortController();
    activityAbort.current = abort;
    setActivityBusy(true); setActivityMessage(null);
    const applySavedStep = (data: ActivitySessionView): void => {
      if (generation !== activityViewGeneration.current) return;
      acceptActivitySnapshot(data, 'That part is done. Continue whenever it feels right.');
    };
    let saveRequested = false;
    try {
      const engine = engineRef.current;
      if (!engine) throw new Error('The world is still preparing. Try again shortly.');
      const kind = activitySession.activityId === 'cycling' && step.id === 'ride_route' ? 'cycling'
        : activitySession.activityId === 'kayak' && step.id === 'paddle' ? 'kayak'
          : activitySession.activityId === 'scooter_ride' && step.id === 'ride' ? 'scooter_ride' : null;
      if (kind) {
        setActivityTravel({ kind, phase: 'travelling' });
        const result = await engine.playTransportOuting(kind, abort.signal);
        if (generation !== activityViewGeneration.current) return;
        if (!result.underway) {
          setActivityTravel(null);
          setActivityMessage('Equipment returned. Head out whenever you feel like exploring.');
          return;
        }
        const save = new TransportOutingSave(activitySnapshot.current ?? activitySession, true);
        activityFinishedSave.current = { save, kind };
        await persistTransportSave(save, kind, abort, generation);
        return;
      }
      await engine.playActivityStep(activitySession.activityId, step, abort.signal);
      if (generation !== activityViewGeneration.current) return;
      setActivityTravel(null);
      saveRequested = true;
      const response = await apiFetch(`/api/activities/${activitySession.id}/steps/${encodeURIComponent(step.id)}`, { method: 'POST', headers: authHeaders() });
      const data = await response.json() as ActivitySessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Activity step could not be saved');
      applySavedStep(data);
    } catch (cause) {
      if (generation !== activityViewGeneration.current) return;
      setActivityTravel(null);
      if (saveRequested) {
        const accepted = activitySnapshot.current;
        if (accepted?.id === activitySession.id && accepted.state.completedStepIds.includes(step.id)) { applySavedStep(accepted); return; }
        try {
          const response = await apiFetch(`/api/households/${networkSession.householdId}/activities`, { headers: authHeaders() });
          if (response.ok) {
            const sessions = await response.json() as ActivitySessionView[];
            const saved = sessions.find(candidate => candidate.id === activitySession.id);
            if (saved?.state.completedStepIds.includes(step.id)) { applySavedStep(saved); return; }
          }
        } catch { /* Keep the original action/save failure available for retry. */ }
      }
      if (generation === activityViewGeneration.current) setActivityMessage(cause instanceof Error ? cause.message : String(cause));
    }
    finally {
      if (activityAbort.current === abort) activityAbort.current = null;
      if (activityOperation.current === generation) { activityOperation.current = null; setActivityBusy(false); }
    }
  }, [acceptActivitySnapshot, activitySession, authHeaders, networkSession, persistTransportSave]);

  const openNpc = useCallback(async (nextNpcId: string): Promise<void> => {
    if (!networkSession) { setToast('Join a household before residents can remember your visits.'); return; }
    setNpcId(nextNpcId); setNpcBusy(true); closeActivity(); setVenueSession(null); setCookingOpen(false);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/npc-memory`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`NPC memory request failed (${response.status})`);
      const records = await response.json() as NpcRelationshipView[];
      let relationship = records.find((record) => record.npcId === nextNpcId) ?? null;
      if (!relationship?.flags.includes('first_meeting')) {
        const remember = await apiFetch(`/api/households/${networkSession.householdId}/npc-memory/${encodeURIComponent(nextNpcId)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ flag: 'first_meeting', familiarityDelta: 1 }),
        });
        if (!remember.ok) throw new Error(`NPC memory update failed (${remember.status})`);
        relationship = await remember.json() as NpcRelationshipView;
      }
      setNpcRelationship(relationship);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setNpcBusy(false); }
  }, [authHeaders, closeActivity, networkSession]);

  const talkToNpc = useCallback(async (): Promise<void> => {
    if (!networkSession || !npcId) return;
    setNpcBusy(true);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/npc-memory/${encodeURIComponent(npcId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ flag: 'first_meeting', familiarityDelta: 1 }),
      });
      if (!response.ok) throw new Error(`Conversation could not be remembered (${response.status})`);
      setNpcRelationship(await response.json() as NpcRelationshipView);
      void engineRef.current?.playActivityAction('nod').catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setNpcBusy(false); }
  }, [authHeaders, networkSession, npcId]);

  const refreshHomeGrowth = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [householdResponse, movingResponse, renovationResponse, home] = await Promise.all([
      apiFetch(`/api/households/${networkSession.householdId}`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/moving`, { headers: authHeaders() }),
      apiFetch(`/api/households/${networkSession.householdId}/renovation`, { headers: authHeaders() }),
      refreshHomeState(),
    ]);
    if (!householdResponse.ok) throw new Error(`Household planning state failed (${householdResponse.status})`);
    if (!movingResponse.ok) throw new Error(`Moving state failed (${movingResponse.status})`);
    if (!renovationResponse.ok) throw new Error(`Renovation state failed (${renovationResponse.status})`);
    const household = await householdResponse.json() as { type: 'couple' | 'friends'; sharedWallet: number; members: Array<{ membershipState: 'active' | 'left' }> };
    setHomeGrowthHousehold({ type: household.type, sharedWallet: household.sharedWallet, memberCount: household.members.filter((member) => member.membershipState === 'active').length });
    setMovingState(await movingResponse.json() as MovingStateView);
    setRenovationState(await renovationResponse.json() as RenovationStateView);
    if (home) setHomeState(home);
  }, [authHeaders, networkSession, refreshHomeState]);

  // Packed boxes survive a reload: read moving state once the world is ready.
  useEffect(() => {
    if (!ready || !networkSession || !propertyId) return;
    void refreshHomeGrowth().catch(() => undefined);
  }, [ready, networkSession, propertyId, refreshHomeGrowth]);
  useEffect(() => {
    const plan = movingState?.plan;
    const packed = plan && plan.status !== 'moved' ? plan.packedObjectIds.map(id => ({ disposition: plan.dispositionByObject[id] ?? 'keep' })) : [];
    engineRef.current?.setMovingBoxes?.(packed);
  }, [movingState, ready]);


  const openHomeGrowth = useCallback((): void => {
    setHomeGrowthOpen(true); setHomeGrowthMessage(null);
    void refreshHomeGrowth().catch((cause: unknown) => setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [refreshHomeGrowth]);

  const proposeMove = useCallback(async (targetPropertyId: string): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/moving/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ targetPropertyId }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Moving vote failed (${response.status})`);
      setHomeGrowthMessage('The household is discussing this move.'); await refreshHomeGrowth();
    } catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const castMove = useCallback(async (voteId: string, choice: 'yes' | 'no'): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await apiFetch(`/api/moving/votes/${voteId}/cast`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ choice }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Moving vote failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, refreshHomeGrowth]);

  const packMovingObject = useCallback(async (objectId: string, disposition: 'keep' | 'sell' | 'donate'): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await apiFetch(`/api/households/${networkSession.householdId}/moving/pack`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ objectId, disposition }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Packing failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const commitMove = useCallback(async (): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try {
      const response = await apiFetch(`/api/households/${networkSession.householdId}/moving/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ idempotencyKey: `moving:${crypto.randomUUID()}` }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Move failed (${response.status})`);
      const result = await response.json() as { household: { propertyId?: string } };
      if (result.household.propertyId) onPropertyChanged?.(result.household.propertyId);
      setHomeGrowthMessage('The move is committed. Your kept things are waiting in boxes.');
      void captureAutomaticMemory('moving_day');
      setHomeGrowthOpen(false);
    } catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, captureAutomaticMemory, networkSession, onPropertyChanged]);

  const proposeRenovation = useCallback(async (renovationId: string): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await apiFetch(`/api/households/${networkSession.householdId}/renovation/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ renovationId }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation vote failed (${response.status})`); setHomeGrowthMessage('The renovation is up for a household decision.'); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const castRenovation = useCallback(async (voteId: string, choice: 'yes' | 'no'): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await apiFetch(`/api/renovation/votes/${voteId}/cast`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ choice }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation vote failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, refreshHomeGrowth]);

  const commitRenovation = useCallback(async (voteId: string): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await apiFetch(`/api/renovation/votes/${voteId}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ idempotencyKey: `renovation:${crypto.randomUUID()}` }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation failed (${response.status})`); setHomeGrowthMessage('The change is part of your home now.'); await refreshHomeGrowth(); void captureAutomaticMemory('home_renovation'); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, captureAutomaticMemory, refreshHomeGrowth]);

  const engineBindings = { networkSession, captureAutomaticMemory, openActivity, openHomeGrowth, openKitchen, openNpc, persistDomesticAction, persistDomesticStep, refreshActiveActivity, refreshAmbientActivities, refreshHomeState, refreshKitchen, refreshMemories, onFirstSessionAction, recoverRenderer };
  const engineBindingsRef = useRef(engineBindings);
  useLayoutEffect(() => { engineBindingsRef.current = engineBindings; });
  useEffect(() => {
    engineRef.current?.updateAccessToken(networkSession?.accessToken);
  }, [networkSession?.accessToken]);
  const sessionUserId = networkSession?.userId;
  const sessionHouseholdId = networkSession?.householdId;
  const sessionShardId = networkSession?.shardId;

  useEffect(() => {
    let cancelled = false;
    const preparation = new AbortController();
    let ownedEngine: GameEngine | null = null;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    void engineBindingsRef.current.refreshHomeState().catch(() => undefined);
    void engineBindingsRef.current.refreshMemories().catch(() => undefined);

    const requestedRenderer = new URLSearchParams(window.location.search).get('renderer');
    const forceRendererBackend = compatibilityRenderer || requestedRenderer === 'webgl2' ? 'webgl2' as const : undefined;

    const createTask = engineCreateChainRef.current.then(async () => {
      // React StrictMode replays effects in development. Deferring creation onto this
      // serialized chain lets the replay cleanup cancel the stale effect before it
      // initializes a second Rapier/WASM world.
      await Promise.resolve();
      if (cancelled) return;

      try {
        const engine = await GameEngine.create({
          signal: preparation.signal,
          canvas,
          container,
          initialWeather: 'clear',
          initialGameMinutes: 17 * 60 + 20,
          ...(engineBindingsRef.current.networkSession ? { networkSession: engineBindingsRef.current.networkSession } : {}),
          onConnectionState: state => { setConnection(state); if (state === 'connected') void engineBindingsRef.current.refreshAmbientActivities(); },
          onNetworkError: setError,
          onHomeStateChanged: () => void engineBindingsRef.current.refreshHomeState().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))),
          onCookingStateChanged: () => void engineBindingsRef.current.refreshKitchen().catch((cause: unknown) => setCookingMessage(cause instanceof Error ? cause.message : String(cause))),
          onActivityStateChanged: () => { void engineBindingsRef.current.refreshActiveActivity(); void engineBindingsRef.current.refreshAmbientActivities(); },
          onParticipantNamesChanged: setParticipantNames,
          onInteractionPrompt: setInteractionPrompt,
          onLocationChange: setLocation,
          onDomesticStep: (...args) => engineBindingsRef.current.persistDomesticStep(...args),
          onDomesticAction: (...args) => engineBindingsRef.current.persistDomesticAction(...args),
          onVoiceState: setVoiceState,
          onMoment: (message) => { setToast(message); window.setTimeout(() => setToast(null), 2600); },
          onVenueInteraction: (venue) => setVenueSession(venue),
          onKitchenInteraction: () => engineBindingsRef.current.openKitchen(),
          onAutoStand: () => { autoViewGeneration.current++; const position = engineRef.current?.getPlayerPosition(); if (position) setAutoFrom({ x: position.x, z: position.z }); setAutoOpen(true); setAutoMessage(null); },
          onMemoryOpportunity: (tag) => void engineBindingsRef.current.captureAutomaticMemory(tag),
          onActivityInteraction: (activityId) => void engineBindingsRef.current.openActivity(activityId),
          onNpcInteraction: (nextNpcId) => void engineBindingsRef.current.openNpc(nextNpcId),
          onHomeGrowthInteraction: () => engineBindingsRef.current.openHomeGrowth(),
          onFirstSessionAction: (...args) => engineBindingsRef.current.onFirstSessionAction(...args),
          recoverRenderer: compatibilityRenderer,
          onRendererDeviceLost: () => { if (!cancelled) engineBindingsRef.current.recoverRenderer(); },
          ...(avatarConfig ? { avatarConfig } : {}),
          ...(propertyId ? { propertyId } : {}),
          ...(forceRendererBackend ? { forceRendererBackend } : {}),
        });

        if (cancelled) {
          engine.dispose();
          return;
        }

        ownedEngine = engine;
        engine.applySettings(settingsRef.current);
        setPreparationStage('Preparing nearby streets and lighting');
        await engine.prepareFirstPlayable(preparation.signal);
        if (cancelled) {
          if (ownedEngine === engine) { engine.dispose(); ownedEngine = null; }
          return;
        }

        ownedEngine = engine;
        engineRef.current = engine;
        engine.updateAccessToken(engineBindingsRef.current.networkSession?.accessToken);
        void engineBindingsRef.current.refreshHomeState().catch(() => undefined);
        engine.start();
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('worldReview') === '1') {
        (window as Window & { __amayaReviewTravel?: (destinationId: string) => void }).__amayaReviewTravel =
          (destinationId) => engine.startAutoRide(destinationId, true);
        (window as Window & { __amayaReviewRide?: (destinationId: string) => void }).__amayaReviewRide =
          (destinationId) => engine.startAutoRide(destinationId, false);
        (window as Window & { __amayaReviewPlace?: (x: number, z: number) => void }).__amayaReviewPlace =
          (x, z) => engine.placeForWorldReview(x, z);
        (window as Window & { __amayaReviewFace?: (yaw: number) => void }).__amayaReviewFace =
          (yaw) => engine.faceForWorldReview(yaw);
        (window as Window & { __amayaReviewWeather?: (weather: WeatherState) => void }).__amayaReviewWeather =
          (weather) => { engine.setWeather(weather); setWeatherState(weather); };
        (window as Window & { __amayaReviewTime?: (minutes: number) => void }).__amayaReviewTime =
          (minutes) => engine.setGameTime(minutes);
        (window as Window & { __amayaReviewWalkRoute?: () => unknown }).__amayaReviewWalkRoute =
          () => engine.reviewWalkHeroRoute();
        (window as Window & { __amayaReviewPlayer?: () => unknown }).__amayaReviewPlayer =
          () => engine.playerForWorldReview();
        (window as Window & { __amayaReviewCrowd?: () => unknown }).__amayaReviewCrowd =
          () => engine.ambientCrowdForWorldReview();
        (window as Window & { __amayaReviewLeisure?: () => unknown }).__amayaReviewLeisure = () => engine.leisureForWorldReview();
        (window as Window & { __amayaReviewMovingBoxes?: () => number }).__amayaReviewMovingBoxes = () => engine.movingBoxesForWorldReview();
        (window as Window & { __amayaReviewMetrics?: (reset?: boolean) => unknown }).__amayaReviewMetrics =
          (reset) => { if (reset) engine.performance.resetFrameSamples(); return structuredClone(engine.performance.read()); };
      }
        setReady(true);
      } catch (cause) {
        if (ownedEngine) {
          ownedEngine.dispose();
          if (engineRef.current === ownedEngine) engineRef.current = null;
          ownedEngine = null;
        }
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    });

    engineCreateChainRef.current = createTask.catch(() => undefined);

    return () => {
      cancelled = true;
      preparation.abort();
      delete (window as Window & { __amayaReviewPlayer?: () => unknown }).__amayaReviewPlayer;
      delete (window as Window & { __amayaReviewCrowd?: () => unknown }).__amayaReviewCrowd;
      delete (window as Window & { __amayaReviewLeisure?: () => unknown }).__amayaReviewLeisure;
      delete (window as Window & { __amayaReviewMovingBoxes?: () => number }).__amayaReviewMovingBoxes;
      delete (window as Window & { __amayaReviewRide?: (destinationId: string) => void }).__amayaReviewRide;
delete (window as Window & { __amayaReviewTravel?: (destinationId: string) => void }).__amayaReviewTravel; delete (window as Window & { __amayaReviewPlace?: (x: number, z: number) => void }).__amayaReviewPlace; delete (window as Window & { __amayaReviewFace?: (yaw: number) => void }).__amayaReviewFace; delete (window as Window & { __amayaReviewWeather?: (weather: WeatherState) => void }).__amayaReviewWeather; delete (window as Window & { __amayaReviewTime?: (minutes: number) => void }).__amayaReviewTime; delete (window as Window & { __amayaReviewWalkRoute?: () => unknown }).__amayaReviewWalkRoute; delete (window as Window & { __amayaReviewMetrics?: (reset?: boolean) => unknown }).__amayaReviewMetrics;
      if (!ownedEngine) return;
      ownedEngine.dispose();
      if (engineRef.current === ownedEngine) engineRef.current = null;
      ownedEngine = null;
    };
  }, [avatarConfig, sessionUserId, sessionHouseholdId, sessionShardId, propertyId, compatibilityRenderer, startupAttempt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.code !== 'Escape' && target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.code === 'KeyB' && !event.repeat) { event.preventDefault(); setBookOpen(!memoryOpen); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); }
      if (event.code === 'Tab' && !event.repeat) { event.preventDefault(); const next = !lifeOpen; setLifeOpen(next); setMemoryOpen(false); setMapOpen(false); setSettingsOpen(false); if (next) void refreshLife().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))); }
      if (event.code === 'KeyM' && !event.repeat) { event.preventDefault(); setMapOpen(!mapOpen); setMemoryOpen(false); setLifeOpen(false); setSettingsOpen(false); }
      if (event.code === 'KeyJ' && !event.repeat) { event.preventDefault(); const next = !storyOpen; setStoryOpen(next); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setDecorateOpen(false); setCookingOpen(false); if (next) void refreshStories().catch((cause: unknown) => setStoryMessage(cause instanceof Error ? cause.message : String(cause))); }
      if (event.code === 'KeyO' && !event.repeat) { event.preventDefault(); setSettingsOpen(!settingsOpen); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setDecorateOpen(false); }
      if (event.code === 'KeyC' && !event.repeat && propertyId) { event.preventDefault(); const next = !decorateOpen; setDecorateOpen(next); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setVenueSession(null); setJobSession(null); setCookingOpen(false); if (next) { void refreshHomeState().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))); void refreshKitchen().catch(() => undefined); } else engineRef.current?.clearHomeDecorationPreview(); }
      if (event.code === 'Escape' && !event.repeat && (memoryOpen || lifeOpen || mapOpen || settingsOpen || decorateOpen || autoOpen || cookingOpen || storyOpen || activitySession || activityBusy || npcId || venueSession || jobSession || homeGrowthOpen)) { event.preventDefault(); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setDecorateOpen(false); closeAuto(); setCookingOpen(false); setStoryOpen(false); closeActivity(); setNpcId(null); setVenueSession(null); setJobSession(null); setHomeGrowthOpen(false); setCookingOpen(false); engineRef.current?.clearHomeDecorationPreview(); }
      if (event.code === 'KeyP' && !event.repeat && !memoryOpen && !lifeOpen && !mapOpen && !settingsOpen && (!activitySession || photographyFraming)) { event.preventDefault(); void (photographyFraming ? capturePhotography() : captureMemory()); }
      if (event.code === 'KeyT' && !event.repeat && voiceState.pushToTalk) engineRef.current?.setPushToTalkHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent): void => { if (event.code === 'KeyT' && voiceState.pushToTalk) engineRef.current?.setPushToTalkHeld(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [activityBusy, activitySession, autoOpen, captureMemory, capturePhotography, photographyFraming, closeActivity, closeAuto, cookingOpen, decorateOpen, jobSession, lifeOpen, mapOpen, memoryOpen, propertyId, refreshHomeState, refreshKitchen, refreshLife, refreshStories, setBookOpen, settingsOpen, storyOpen, npcId, venueSession, voiceState.pushToTalk, homeGrowthOpen]);

  const anyPanelOpen = memoryOpen || lifeOpen || mapOpen || settingsOpen || decorateOpen || autoOpen || cookingOpen || storyOpen || (Boolean(activitySession) && !activityTravel && !photographyFraming) || Boolean(npcId) || Boolean(venueSession) || Boolean(jobSession) || homeGrowthOpen;
  useEffect(() => {
    if (!anyPanelOpen || !containerRef.current) return;
    return manageDialogFocus(containerRef.current, canvasRef.current);
  }, [anyPanelOpen]);
  useEffect(() => {
    engineRef.current?.setInputEnabled(!anyPanelOpen);
    if (anyPanelOpen && document.pointerLockElement) void document.exitPointerLock();
  }, [anyPanelOpen, ready]);

  useEffect(() => {
    const normalized = normalizeGameSettings(settings);
    settingsRef.current = normalized;
    localStorage.setItem('together:game-settings', JSON.stringify(normalized));
    document.documentElement.style.setProperty('--ui-scale', String(normalized.uiScale));
    document.documentElement.classList.toggle('high-contrast-prompts', normalized.highContrastPrompt);
    engineRef.current?.applySettings(normalized);
  }, [settings]);

  const setWeather = (weather: WeatherState) => { engineRef.current?.setWeather(weather); setWeatherState(weather); };
  return <div ref={containerRef} className="game-shell">
    <canvas key={`${compatibilityRenderer ? 'compatibility' : 'preferred'}:${startupAttempt}`} ref={canvasRef} className="game-canvas" tabIndex={0} aria-label="Amaya Bay 3D world" />
    {!ready && !error && <div className="world-loading" role="status">Preparing Amaya Bay…<small>{preparationStage}</small></div>}
    {error && <div className="compatibility-card" role="alert"><strong>Amaya Bay notice</strong><span>{error}</span>{ready ? <button className="quiet-action" onClick={() => setError(null)}>Dismiss</button> : <><button className="quiet-action" onClick={retryWorld}>Retry world</button><button className="quiet-action" onClick={() => { setCompatibilityRenderer(true); retryWorld(); }}>Use compatibility graphics</button></>}</div>}
    {location && !anyPanelOpen && <div className="location-chip">{location}</div>}
    {interactionPrompt && !anyPanelOpen && <div className="interaction-prompt">{interactionPrompt}</div>}
    {networkSession && !anyPanelOpen && <div className={`connection-pill ${connection}`}>{connection === 'connected' ? 'household connected' : connection}</div>}
    {toast && <div className="memory-toast">{toast}</div>}
    {ready && !anyPanelOpen && <div className="quick-keys"><span>P · Photo</span><span>B · Memories</span><span>Tab · Life</span><span>M · Map</span><span>O · Settings</span><span>C · Decorate</span><span>J · Story</span><span>V · Camera</span></div>}
    {ready && !anyPanelOpen && !guideHidden && <FirstSessionGuide completed={guideCompleted} onMap={() => setMapOpen(true)} onSkip={() => { setGuideHidden(true); localStorage.setItem(`${guideStorageKey}:hidden`, 'true'); }}/ >}
    {ready && !anyPanelOpen && guideHidden && <button className="guide-replay" onClick={() => { setGuideCompleted([]); setGuideHidden(false); localStorage.removeItem(guideStorageKey); localStorage.removeItem(`${guideStorageKey}:hidden`); engineRef.current?.resetFirstSessionProgress(); }}>First day guide ↗</button>}
    {ready && !anyPanelOpen && networkSession && <div className="voice-controls" aria-label="household voice controls">
      {voiceState.mode === 'off' ? <>
        <button onClick={() => void engineRef.current?.enableVoice('household').catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))}>Voice · Household</button>
        <button onClick={() => void engineRef.current?.enableVoice('proximity').catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))}>Voice · Nearby</button>
      </> : <>
        <span>{voiceState.mode === 'proximity' ? 'Nearby voice' : 'Household voice'}</span>
        <button onClick={() => engineRef.current?.setVoiceMuted(!voiceState.muted)}>{voiceState.muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={() => engineRef.current?.setPushToTalk(!voiceState.pushToTalk)}>{voiceState.pushToTalk ? 'PTT · T' : 'Push-to-talk'}</button>
        <button onClick={() => engineRef.current?.disableVoice()}>Off</button>
      </>}
    </div>}
    {ready && !anyPanelOpen && import.meta.env.DEV && new URLSearchParams(window.location.search).get('worldReview') === '1' && <div className="weather-debug" aria-label="development weather controls"><span>DEV</span><button onClick={() => setWeather('clear')}>Clear</button><button onClick={() => setWeather('light_rain')}>Rain</button><button onClick={() => setWeather('monsoon_rain')}>Monsoon</button></div>}
    {captureBusy && <div className="capture-flash" aria-hidden="true" />}
    {networkSession && <MemoryBook open={memoryOpen} memories={memories} networkSession={networkSession} onClose={() => setBookOpen(false)} onCaptionChange={updateMemoryCaption} onExport={exportMemory} />}
    <LifePanel open={lifeOpen} data={lifeData} onClose={() => setLifeOpen(false)} />
    <CityMap open={mapOpen} currentLocation={location} onClose={() => setMapOpen(false)} />
    <GameSettingsPanel open={settingsOpen} settings={settings} onChange={(next) => setSettings(normalizeGameSettings(next))} onClose={() => setSettingsOpen(false)} />
    <AutoRickshawPanel open={autoOpen} from={autoFrom} busy={autoBusy} message={autoMessage} onRide={bookAutoRide} onClose={closeAuto} />
    {propertyId && <DecoratePanel open={decorateOpen} propertyId={propertyId} home={homeState} inventory={kitchenInventory} busy={decorateBusy} message={decorateMessage}
      onPreview={(definitionId: string, roomId: string, placement: Placement2D) => engineRef.current?.previewHomeDecoration(definitionId, roomId, placement)}
      onClearPreview={() => engineRef.current?.clearHomeDecorationPreview()}
      onCommit={commitDecoration} onRemove={removeDecoration} onSurface={setHomeSurface}
      onClose={() => { setDecorateOpen(false); engineRef.current?.clearHomeDecorationPreview(); }} />}
    <StoryPanel open={storyOpen} active={storyActive} eligible={storyEligible} definitions={storyEvents} busy={storyBusy} message={storyMessage} onStart={startStory} onTask={updateStoryTask} onResolve={resolveStory} onClose={() => setStoryOpen(false)} />
    <CookingPanel open={cookingOpen} userId={networkSession?.userId} recipes={recipes} inventory={kitchenInventory} session={cookingSession} busy={cookingBusy} message={cookingMessage} onStart={startCooking} onStep={performCookingStep} onClose={() => setCookingOpen(false)} />
    <NpcPanel npcId={npcId} relationship={npcRelationship} weather={weatherState} busy={npcBusy} onTalk={talkToNpc} onClose={() => setNpcId(null)} />
    {propertyId && <HomeGrowthPanel open={homeGrowthOpen} currentPropertyId={propertyId} household={homeGrowthHousehold} homeObjects={homeState?.objects ?? []} moving={movingState} renovation={renovationState} userId={networkSession?.userId} busy={homeGrowthBusy} message={homeGrowthMessage} onProposeMove={proposeMove} onCastMove={castMove} onPack={packMovingObject} onCommitMove={commitMove} onProposeRenovation={proposeRenovation} onCastRenovation={castRenovation} onCommitRenovation={commitRenovation} onClose={() => setHomeGrowthOpen(false)} />}
    <ActivityPanel session={photographyFraming || activityTravel || activitySession?.state?.golf || activitySession?.state?.badminton || activitySession?.state?.boardGame || activitySession?.state?.picnic || activitySession?.state?.cafe || activitySession?.state?.transportRental ? null : activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onStep={advanceActivity} onClose={closeActivity} />
    {activitySession?.state.transportRental && !activityTravel && <TransportRentalPanel session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onCommand={handleRentalCommand} onClose={closeActivity} />}
    {activitySession?.state?.golf && <GolfPanel session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onShot={input => sendSports('golf/shots', input)} onAim={(angle, power) => engineRef.current?.setGolfAim(angle, power)} onClose={closeActivity} />}
    {activitySession?.state?.badminton && <BadmintonPanel session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onCommand={input => sendSports('badminton/commands', input)} onClose={closeActivity} />}
    {activitySession?.state?.picnic && <PicnicPanel participantNames={participantNames} session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} inventory={kitchenInventory} onCommand={input => sendSports('picnic/commands', input)} onClose={closeActivity} />}
    {activitySession?.state?.cafe && <CafePanel participantNames={participantNames} session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onCommand={input => sendSports('cafe/commands', input)} onClose={closeActivity} />}
    {activitySession?.state?.boardGame && <BoardGamePanel session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onCommand={input => sendSports('board-game/commands', input)} onClose={closeActivity} />}
    {photographyFraming && <aside className="activity-travel-hint" aria-label="Photography outing"><p>Walk and look around to frame your scene. P · Take photo. Esc · Leave photography.</p>{activityMessage && <p role="status">{activityMessage}</p>}<button disabled={activityBusy || captureBusy} onClick={() => void capturePhotography()}>{activityBusy || captureBusy ? 'Saving photo…' : photographyRetry ? 'Retry photo save' : 'Take photo'}</button><button onClick={closeActivity}>Leave photography</button></aside>}
    {activityTravel && <ActivityTravelHint kind={activityTravel.kind} endKey={settings.bindings.dismount} busy={activityTravel.phase === 'saving'} retry={activityTravel.phase === 'retry'} message={activityMessage} onFinish={() => { if (activityTravel.phase === 'retry') { if (activitySession?.state.transportRental) void retryRentalReturn(); else void retryTransportSave(); } else engineRef.current?.finishTransportOuting(); }} onCancel={closeActivity} />}
    <VenuePanel venue={venueSession} {...(networkSession ? { networkSession } : {})} jobBusy={jobBusy} onClose={() => setVenueSession(null)} onStartJob={(jobId) => void startJob(jobId)} onMoment={(message) => { setToast(message); window.setTimeout(() => setToast(null), 2600); }} />
    <JobShiftPanel session={jobSession} busy={jobBusy} message={jobMessage} onDoAction={(action) => void advanceJob(action)} onComplete={() => void completeJob()} onClose={() => setJobSession(null)} />
  </div>;
}

function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem('together:game-settings');
    const hasSafeStartupProfile = localStorage.getItem('together:safe-startup-profile-v1') === 'applied';
    localStorage.setItem('together:safe-startup-profile-v1', 'applied');
    return raw ? resolveStartupGameSettings(JSON.parse(raw) as Partial<GameSettings>, !hasSafeStartupProfile) : DEFAULT_GAME_SETTINGS;
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

function formatGameTime(minutes: number): string {
  const value = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const mins = (value % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function automaticCaption(tag: string, location: string, weather: string): string {
  const activity = tag.replaceAll('_', ' ');
  const place = location.replaceAll('_', ' ');
  const atmosphere = weather.includes('rain') ? 'in the rain' : weather === 'windy_evening' ? 'in the evening breeze' : '';
  return `${activity.charAt(0).toUpperCase()}${activity.slice(1)} at ${place}${atmosphere ? ` ${atmosphere}` : ''}`.trim();
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const words = text.split(/\s+/); let line = ''; let row = 0;
  for (const word of words) { const test = line ? `${line} ${word}` : word; if (context.measureText(test).width > maxWidth && line) { context.fillText(line, x, y + row * lineHeight); line = word; row += 1; } else line = test; }
  if (line) context.fillText(line, x, y + row * lineHeight);
}
