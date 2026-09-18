import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { DEFAULT_GAME_SETTINGS, normalizeGameSettings, resolveStartupGameSettings, scoreMemoryCapture, shouldAutoCapture, type ActivityId, type ActivityStep, type AvatarConfig, type GameSettings, type HomeAction, type JobId, type Placement2D, type RecipeStep, type StoryDefinition, type StoryTaskStateValue, type VoiceMode } from '@together/shared';
import { GameEngine } from '../../game/GameEngine';
import type { WeatherState } from '../../game/weather/weatherModel';
import type { NetworkSession } from '../../network/GameSocketClient';
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
import { NpcPanel, type NpcRelationshipView } from './NpcPanel';
import { HomeGrowthPanel, type HomeGrowthHousehold, type MovingStateView, type RenovationStateView } from './HomeGrowthPanel';

export function GameCanvas({ networkSession, avatarConfig, propertyId, onPropertyChanged }: { networkSession?: NetworkSession; avatarConfig?: AvatarConfig; propertyId?: string; onPropertyChanged?: (propertyId: string) => void }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const homeVersionRef = useRef(0);
  const lastAutomaticCaptureRef = useRef(-300_000);
  const captureBusyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>(networkSession ? 'connecting' : 'disconnected');
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
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [autoFrom, setAutoFrom] = useState({ x: 0, z: 0 });
  const [venueSession, setVenueSession] = useState<VenueSession | null>(null);
  const [jobSession, setJobSession] = useState<JobSessionView | null>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
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
  const [weather, setWeatherState] = useState<WeatherState>('clear');
  const settingsRef = useRef(settings);

  const authHeaders = useCallback((): Record<string, string> => networkSession ? { 'x-dev-user-id': networkSession.userId } : {}, [networkSession]);

  const refreshHomeState = useCallback(async (): Promise<HomeStateView | null> => {
    if (!networkSession) return null;
    const response = await fetch(`/api/households/${networkSession.householdId}/home`, { headers: authHeaders() });
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
    const response = await fetch(`/api/households/${networkSession.householdId}/memories`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Memory Book request failed (${response.status})`);
    setMemories(await response.json() as MemoryView[]);
  }, [authHeaders, networkSession]);

  const refreshLife = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [householdResponse, notesResponse, storiesResponse] = await Promise.all([
      fetch(`/api/households/${networkSession.householdId}`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/notes`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/stories`, { headers: authHeaders() }),
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

  const persistDomesticAction = useCallback(async (action: HomeAction, interactionId: string): Promise<void> => {
    if (!networkSession) return;
    const execute = async (expectedVersion: number) => fetch(`/api/households/${networkSession.householdId}/home/domestic-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action, expectedVersion, idempotencyKey: `${interactionId}:${crypto.randomUUID()}` }),
    });
    try {
      let response = await execute(homeVersionRef.current);
      if (!response.ok && response.status < 500) {
        const version = await refreshHomeVersion();
        response = await execute(version);
      }
      if (!response.ok) throw new Error(`Could not save household action (${response.status})`);
      const home = await response.json() as { version: number };
      homeVersionRef.current = home.version;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [authHeaders, networkSession, refreshHomeVersion]);

  const setBookOpen = useCallback((open: boolean): void => {
    setMemoryOpen(open);
    if (open) void refreshMemories().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [refreshMemories]);

  const captureMemory = useCallback(async (): Promise<void> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || captureBusyRef.current) return;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    try {
      const context = engine.getMemoryContext();
      const blob = await engine.captureFrame();
      const imageId = `photo_${crypto.randomUUID().replaceAll('-', '')}`;
      const imageResponse = await fetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg', ...authHeaders() },
        body: blob,
      });
      if (!imageResponse.ok) throw new Error(`Memory image upload failed (${imageResponse.status})`);
      const image = await imageResponse.json() as { screenshotPath: string };
      const caption = `${context.locationId} · ${formatGameTime(context.gameMinutes)}`;
      const memoryResponse = await fetch(`/api/households/${networkSession.householdId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idempotencyKey: `manual:${crypto.randomUUID()}`,
          type: 'manual',
          screenshotPath: image.screenshotPath,
          caption,
          locationId: context.locationId,
          weather: context.weather,
          participants: [networkSession.userId],
          metadata: { gameMinutes: context.gameMinutes, source: 'manual-photo' },
        }),
      });
      if (!memoryResponse.ok) throw new Error(`Memory creation failed (${memoryResponse.status})`);
      const memory = await memoryResponse.json() as MemoryView;
      setMemories((current) => [memory, ...current.filter((entry) => entry.id !== memory.id)]);
      setToast('Saved to your Memory Book');
      window.setTimeout(() => setToast(null), 2400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      captureBusyRef.current = false;
      setCaptureBusy(false);
    }
  }, [authHeaders, networkSession]);

  const captureAutomaticMemory = useCallback(async (tag: string): Promise<void> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || captureBusyRef.current) return;
    const context = engine.getMemoryContext();
    const secondsSinceAutomaticCapture = Math.max(0, (performance.now() - lastAutomaticCaptureRef.current) / 1000);
    const scenic = /Bay|Park|Hill|Garden|Cove|Sunset/i.test(context.locationId) ? 0.95 : 0.62;
    const minute = context.gameMinutes % 1440;
    const lighting = (minute >= 16.5 * 60 && minute <= 19.5 * 60) || (minute >= 5.5 * 60 && minute <= 7.5 * 60) ? 0.95 : 0.72;
    const score = scoreMemoryCapture({
      participantsVisible: 1, participantsExpected: 1, occlusionRatio: 0.02,
      composition: 0.82, storyRelevance: 0.86, scenicValue: scenic, lightingQuality: lighting,
      secondsSinceAutomaticCapture,
    });
    if (!shouldAutoCapture(score, secondsSinceAutomaticCapture)) return;
    captureBusyRef.current = true;
    setCaptureBusy(true);
    try {
      const blob = await engine.captureFrame(0.88);
      const imageId = `auto_${crypto.randomUUID().replaceAll('-', '')}`;
      const imageResponse = await fetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, {
        method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...authHeaders() }, body: blob,
      });
      if (!imageResponse.ok) throw new Error(`Automatic Memory image upload failed (${imageResponse.status})`);
      const image = await imageResponse.json() as { screenshotPath: string };
      const caption = automaticCaption(tag, context.locationId, context.weather);
      const memoryResponse = await fetch(`/api/households/${networkSession.householdId}/memories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idempotencyKey: `automatic:${tag}:${Math.floor(context.gameMinutes)}:${crypto.randomUUID()}`,
          type: 'automatic', screenshotPath: image.screenshotPath, caption,
          locationId: context.locationId, weather: context.weather, participants: [networkSession.userId],
          metadata: { gameMinutes: context.gameMinutes, source: 'smart-capture', tag, score },
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
    const response = await fetch(`/api/households/${networkSession.householdId}/memory-images/${encodeURIComponent(imageId)}`, { headers: authHeaders() });
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
    const response = await fetch(`/api/households/${networkSession.householdId}/memories/${memoryId}/caption`, {
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
      fetch(`/api/households/${networkSession.householdId}/inventory`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/cooking`, { headers: authHeaders() }),
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
    const execute = async (expectedVersion: number) => fetch(`/api/households/${networkSession.householdId}/home/furniture`, {
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
      let response = await fetch(`/api/households/${networkSession.householdId}/home/furniture/${encodeURIComponent(objectId)}?${query}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok && response.status < 500) {
        const version = await refreshHomeVersion();
        query.set('expectedVersion', String(version)); query.set('idempotencyKey', `decor:remove:${crypto.randomUUID()}`);
        response = await fetch(`/api/households/${networkSession.householdId}/home/furniture/${encodeURIComponent(objectId)}?${query}`, { method: 'DELETE', headers: authHeaders() });
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
      const response = await fetch(`/api/households/${networkSession.householdId}/home/surfaces/${encodeURIComponent(surfaceId)}`, {
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
    const position = engineRef.current?.getPlayerPosition();
    const from = position ? { x: position.x, z: position.z } : autoFrom;
    setAutoBusy(true); setAutoMessage(null);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/transit/auto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ from, destinationId, idempotencyKey: `auto:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as { fare?: number; personalWallet?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not book auto-rickshaw');
      setAutoOpen(false);
      engineRef.current?.startAutoRide(destinationId, skip);
      setToast(`Auto fare ₹${data.fare ?? 0} · personal wallet ₹${data.personalWallet ?? 'updated'}`);
      window.setTimeout(() => setToast(null), 2600);
    } catch (cause) { setAutoMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setAutoBusy(false); }
  }, [authHeaders, autoFrom, networkSession]);

  const startJob = useCallback(async (jobId: JobId): Promise<void> => {
    if (!networkSession) { setToast('Connect a household to work a persistent shift.'); return; }
    setJobBusy(true); setJobMessage(null);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/jobs/${jobId}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ idempotencyKey: `job-start:${crypto.randomUUID()}` }),
      });
      const data = await response.json() as JobSessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not start shift');
      setVenueSession(null); setJobSession(data); setJobMessage('Clocked in. Work through the physical task sequence.');
    } catch (error) { setJobMessage(error instanceof Error ? error.message : 'Could not start shift'); }
    finally { setJobBusy(false); }
  }, [authHeaders, networkSession]);

  const advanceJob = useCallback(async (action: string): Promise<void> => {
    if (!networkSession || !jobSession) return;
    setJobBusy(true); setJobMessage(null);
    engineRef.current?.playContextAction(action);
    try {
      const response = await fetch(`/api/job-sessions/${jobSession.id}/advance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ action }),
      });
      const data = await response.json() as JobSessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Task could not be recorded');
      setJobSession(data); setJobMessage(data.nextAction ? 'Task done. Move to the next part of the shift.' : 'The shift tasks are finished. Clock out when ready.');
    } catch (error) { setJobMessage(error instanceof Error ? error.message : 'Task failed'); }
    finally { setJobBusy(false); }
  }, [authHeaders, jobSession, networkSession]);

  const completeJob = useCallback(async (): Promise<void> => {
    if (!networkSession || !jobSession) return;
    setJobBusy(true); setJobMessage(null);
    try {
      const response = await fetch(`/api/job-sessions/${jobSession.id}/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ idempotencyKey: `job-finish:${jobSession.id}` }),
      });
      const data = await response.json() as { session?: JobSessionView; economy?: { personalWallet: number }; error?: string };
      if (!response.ok || !data.session) throw new Error(data.error ?? 'Could not complete shift');
      setJobSession(data.session); setJobMessage(`Shift paid. Personal wallet ₹${data.economy?.personalWallet ?? 'updated'}.`);
    } catch (error) { setJobMessage(error instanceof Error ? error.message : 'Could not finish shift'); }
    finally { setJobBusy(false); }
  }, [authHeaders, jobSession, networkSession]);

  const refreshStories = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [instancesResponse, eligibleResponse] = await Promise.all([
      fetch(`/api/households/${networkSession.householdId}/stories`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/stories/eligible`, { headers: authHeaders() }),
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
      const response = await fetch(`/api/households/${networkSession.householdId}/stories/${encodeURIComponent(eventId)}/start`, { method: 'POST', headers: authHeaders() });
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
      const response = await fetch(`/api/households/${networkSession.householdId}/stories/instances/${instanceId}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ state }),
      });
      const data = await response.json() as StoryInstanceView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Story task could not be saved');
      setStoryActive(data); setStoryMessage(state === 'failed' ? 'That did not go perfectly. The story will remember it.' : 'Moment recorded.');
    } catch (cause) { setStoryMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setStoryBusy(false); }
  }, [authHeaders, networkSession]);

  const createStoryMemory = useCallback(async (instance: StoryInstanceView): Promise<void> => {
    const engine = engineRef.current;
    if (!engine || !networkSession || !instance.memoryTag) return;
    const context = engine.getMemoryContext();
    const definition = storyEvents.find((event) => event.id === instance.eventId);
    const blob = await engine.captureFrame();
    const imageId = `story_${crypto.randomUUID().replaceAll('-', '')}`;
    const imageResponse = await fetch(`/api/households/${networkSession.householdId}/memory-images/${imageId}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', ...authHeaders() }, body: blob });
    if (!imageResponse.ok) return;
    const image = await imageResponse.json() as { screenshotPath: string };
    await fetch(`/api/households/${networkSession.householdId}/memories`, {
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
      const response = await fetch(`/api/households/${networkSession.householdId}/stories/instances/${instanceId}/resolve`, { method: 'POST', headers: authHeaders() });
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
    setCookingOpen(true); setCookingMessage(null); setVenueSession(null); setJobSession(null); setActivitySession(null);
    void refreshKitchen().catch((cause: unknown) => setCookingMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [networkSession, refreshKitchen]);

  const startCooking = useCallback(async (recipeId: string): Promise<void> => {
    if (!networkSession) return;
    setCookingBusy(true); setCookingMessage(null);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/cooking`, {
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
    try {
      const base = `/api/households/${networkSession.householdId}/cooking/${cookingSession.id}`;
      const claim = await fetch(`${base}/stations/${encodeURIComponent(step.station)}/claim`, { method: 'POST', headers: authHeaders() });
      const claimed = await claim.json() as CookingSessionView & { error?: string };
      if (!claim.ok) throw new Error(claimed.error ?? `${step.station} is occupied`);
      setCookingSession(claimed);
      engineRef.current?.playCookingAction(step.action);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      const complete = await fetch(`${base}/steps/${encodeURIComponent(step.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ mistake }),
      });
      const completed = await complete.json() as CookingSessionView & { error?: string };
      if (!complete.ok) throw new Error(completed.error ?? 'Cooking step could not be completed');
      setCookingSession(completed);
      await fetch(`${base}/stations/${encodeURIComponent(step.station)}/release`, { method: 'POST', headers: authHeaders() });
      if (completed.state.status === 'completed') {
        const quality = completed.state.outcome?.quality ?? 'shared';
        setCookingMessage(quality === 'burnt' ? 'Dinner got a little burnt. It still counts as dinner—and a story.' : quality === 'imperfect' ? 'A little imperfect. Still warm, shared food.' : 'Meal ready. Serve it while it is warm.');
        engineRef.current?.playCookingAction('serve');
        void captureAutomaticMemory('shared_meal');
      } else setCookingMessage('Step complete. Another station may have opened up.');
    } catch (cause) { setCookingMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setCookingBusy(false); }
  }, [authHeaders, captureAutomaticMemory, cookingSession, networkSession]);

  const openActivity = useCallback(async (activityId: ActivityId): Promise<void> => {
    if (!networkSession) { setToast('Join a household to share persistent activities.'); return; }
    setActivityBusy(true); setActivityMessage(null); setVenueSession(null); setJobSession(null); setCookingOpen(false);
    try {
      const listResponse = await fetch(`/api/households/${networkSession.householdId}/activities`, { headers: authHeaders() });
      if (!listResponse.ok) throw new Error(`Activity list failed (${listResponse.status})`);
      const sessions = await listResponse.json() as ActivitySessionView[];
      let session = sessions.find((candidate) => candidate.activityId === activityId && candidate.state.status === 'active') ?? null;
      if (!session) {
        const start = await fetch(`/api/households/${networkSession.householdId}/activities/${activityId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ idempotencyKey: `activity:${activityId}:${crypto.randomUUID()}` }),
        });
        const data = await start.json() as ActivitySessionView & { error?: string };
        if (!start.ok) throw new Error(data.error ?? 'Could not begin activity');
        session = data;
      } else if (!session.state.participants.includes(networkSession.userId)) {
        const join = await fetch(`/api/activities/${session.id}/join`, { method: 'POST', headers: authHeaders() });
        const data = await join.json() as ActivitySessionView & { error?: string };
        if (!join.ok) throw new Error(data.error ?? 'Could not join activity');
        session = data;
      }
      setActivitySession(session); setActivityMessage('No rush. Take the activity one physical step at a time.');
    } catch (cause) { setActivityMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setActivityBusy(false); }
  }, [authHeaders, networkSession]);

  const advanceActivity = useCallback(async (step: ActivityStep): Promise<void> => {
    if (!networkSession || !activitySession) return;
    setActivityBusy(true); setActivityMessage(null);
    engineRef.current?.playActivityAction(step.animation);
    try {
      const response = await fetch(`/api/activities/${activitySession.id}/steps/${encodeURIComponent(step.id)}`, { method: 'POST', headers: authHeaders() });
      const data = await response.json() as ActivitySessionView & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Activity step could not be saved');
      setActivitySession(data);
      if (data.state.status === 'complete') {
        setActivityMessage('A small piece of the day, finished together.');
        void captureAutomaticMemory(data.activityId);
      } else setActivityMessage('That part is done. Continue whenever it feels right.');
    } catch (cause) { setActivityMessage(cause instanceof Error ? cause.message : String(cause)); }
    finally { setActivityBusy(false); }
  }, [activitySession, authHeaders, captureAutomaticMemory, networkSession]);

  const openNpc = useCallback(async (nextNpcId: string): Promise<void> => {
    if (!networkSession) { setToast('Join a household before residents can remember your visits.'); return; }
    setNpcId(nextNpcId); setNpcBusy(true); setActivitySession(null); setVenueSession(null); setCookingOpen(false);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/npc-memory`, { headers: authHeaders() });
      if (!response.ok) throw new Error(`NPC memory request failed (${response.status})`);
      const records = await response.json() as NpcRelationshipView[];
      let relationship = records.find((record) => record.npcId === nextNpcId) ?? null;
      if (!relationship?.flags.includes('first_meeting')) {
        const remember = await fetch(`/api/households/${networkSession.householdId}/npc-memory/${encodeURIComponent(nextNpcId)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ flag: 'first_meeting', familiarityDelta: 1 }),
        });
        if (!remember.ok) throw new Error(`NPC memory update failed (${remember.status})`);
        relationship = await remember.json() as NpcRelationshipView;
      }
      setNpcRelationship(relationship);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setNpcBusy(false); }
  }, [authHeaders, networkSession]);

  const talkToNpc = useCallback(async (): Promise<void> => {
    if (!networkSession || !npcId) return;
    setNpcBusy(true);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/npc-memory/${encodeURIComponent(npcId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ flag: 'first_meeting', familiarityDelta: 1 }),
      });
      if (!response.ok) throw new Error(`Conversation could not be remembered (${response.status})`);
      setNpcRelationship(await response.json() as NpcRelationshipView);
      engineRef.current?.playActivityAction('nod');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setNpcBusy(false); }
  }, [authHeaders, networkSession, npcId]);

  const refreshHomeGrowth = useCallback(async (): Promise<void> => {
    if (!networkSession) return;
    const [householdResponse, movingResponse, renovationResponse, home] = await Promise.all([
      fetch(`/api/households/${networkSession.householdId}`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/moving`, { headers: authHeaders() }),
      fetch(`/api/households/${networkSession.householdId}/renovation`, { headers: authHeaders() }),
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

  const openHomeGrowth = useCallback((): void => {
    setHomeGrowthOpen(true); setHomeGrowthMessage(null);
    void refreshHomeGrowth().catch((cause: unknown) => setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)));
  }, [refreshHomeGrowth]);

  const proposeMove = useCallback(async (targetPropertyId: string): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/moving/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ targetPropertyId }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Moving vote failed (${response.status})`);
      setHomeGrowthMessage('The household is discussing this move.'); await refreshHomeGrowth();
    } catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const castMove = useCallback(async (voteId: string, choice: 'yes' | 'no'): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await fetch(`/api/moving/votes/${voteId}/cast`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ choice }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Moving vote failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, refreshHomeGrowth]);

  const packMovingObject = useCallback(async (objectId: string, disposition: 'keep' | 'sell' | 'donate'): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await fetch(`/api/households/${networkSession.householdId}/moving/pack`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ objectId, disposition }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Packing failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const commitMove = useCallback(async (): Promise<void> => {
    if (!networkSession) return; setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try {
      const response = await fetch(`/api/households/${networkSession.householdId}/moving/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ idempotencyKey: `moving:${crypto.randomUUID()}` }) });
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
    try { const response = await fetch(`/api/households/${networkSession.householdId}/renovation/votes`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ renovationId }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation vote failed (${response.status})`); setHomeGrowthMessage('The renovation is up for a household decision.'); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, networkSession, refreshHomeGrowth]);

  const castRenovation = useCallback(async (voteId: string, choice: 'yes' | 'no'): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await fetch(`/api/renovation/votes/${voteId}/cast`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ choice }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation vote failed (${response.status})`); await refreshHomeGrowth(); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, refreshHomeGrowth]);

  const commitRenovation = useCallback(async (voteId: string): Promise<void> => {
    setHomeGrowthBusy(true); setHomeGrowthMessage(null);
    try { const response = await fetch(`/api/renovation/votes/${voteId}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ idempotencyKey: `renovation:${crypto.randomUUID()}` }) }); if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `Renovation failed (${response.status})`); setHomeGrowthMessage('The change is part of your home now.'); await refreshHomeGrowth(); void captureAutomaticMemory('home_renovation'); }
    catch (cause) { setHomeGrowthMessage(cause instanceof Error ? cause.message : String(cause)); } finally { setHomeGrowthBusy(false); }
  }, [authHeaders, captureAutomaticMemory, refreshHomeGrowth]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    void refreshHomeState().catch(() => undefined);
    void refreshMemories().catch(() => undefined);

    const requestedRenderer = new URLSearchParams(window.location.search).get('renderer');
    const forceRendererBackend = requestedRenderer === 'webgl2' ? 'webgl2' as const : undefined;

    void GameEngine.create({
      canvas,
      container,
      initialWeather: 'clear',
      initialGameMinutes: 17 * 60 + 20,
      ...(networkSession ? { networkSession } : {}),
      onConnectionState: setConnection,
      onNetworkError: setError,
      onHomeStateChanged: () => void refreshHomeState().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))),
      onInteractionPrompt: setInteractionPrompt,
      onLocationChange: setLocation,
      onDomesticAction: (action, interactionId) => void persistDomesticAction(action, interactionId),
      onVoiceState: setVoiceState,
      onMoment: (message) => { setToast(message); window.setTimeout(() => setToast(null), 2600); },
      onVenueInteraction: (venue) => setVenueSession(venue),
      onKitchenInteraction: openKitchen,
      onAutoStand: () => { const position = engineRef.current?.getPlayerPosition(); if (position) setAutoFrom({ x: position.x, z: position.z }); setAutoOpen(true); setAutoMessage(null); },
      onMemoryOpportunity: (tag) => void captureAutomaticMemory(tag),
      onActivityInteraction: (activityId) => void openActivity(activityId),
      onNpcInteraction: (nextNpcId) => void openNpc(nextNpcId),
      onHomeGrowthInteraction: openHomeGrowth,
      ...(avatarConfig ? { avatarConfig } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(forceRendererBackend ? { forceRendererBackend } : {}),
    }).then((engine) => {
      if (cancelled) { engine.dispose(); return; }
      engineRef.current = engine;
      void refreshHomeState().catch(() => undefined);
      engine.applySettings(settingsRef.current);
      engine.start();
      setReady(true);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));

    return () => { cancelled = true; engineRef.current?.dispose(); engineRef.current = null; };
  }, [avatarConfig, captureAutomaticMemory, networkSession, openActivity, openHomeGrowth, openKitchen, openNpc, persistDomesticAction, propertyId, refreshHomeState, refreshMemories]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      if (event.code === 'KeyB' && !event.repeat) { event.preventDefault(); setBookOpen(!memoryOpen); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); }
      if (event.code === 'Tab' && !event.repeat) { event.preventDefault(); const next = !lifeOpen; setLifeOpen(next); setMemoryOpen(false); setMapOpen(false); setSettingsOpen(false); if (next) void refreshLife().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))); }
      if (event.code === 'KeyM' && !event.repeat) { event.preventDefault(); setMapOpen(!mapOpen); setMemoryOpen(false); setLifeOpen(false); setSettingsOpen(false); }
      if (event.code === 'KeyJ' && !event.repeat) { event.preventDefault(); const next = !storyOpen; setStoryOpen(next); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setDecorateOpen(false); setCookingOpen(false); if (next) void refreshStories().catch((cause: unknown) => setStoryMessage(cause instanceof Error ? cause.message : String(cause))); }
      if (event.code === 'KeyO' && !event.repeat) { event.preventDefault(); setSettingsOpen(!settingsOpen); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setDecorateOpen(false); }
      if (event.code === 'KeyC' && !event.repeat && propertyId) { event.preventDefault(); const next = !decorateOpen; setDecorateOpen(next); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setVenueSession(null); setJobSession(null); setCookingOpen(false); if (next) { void refreshHomeState().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause))); void refreshKitchen().catch(() => undefined); } else engineRef.current?.clearHomeDecorationPreview(); }
      if (event.code === 'Escape' && !event.repeat && (memoryOpen || lifeOpen || mapOpen || settingsOpen || decorateOpen || autoOpen || cookingOpen || storyOpen || activitySession || npcId || venueSession || jobSession || homeGrowthOpen)) { event.preventDefault(); setMemoryOpen(false); setLifeOpen(false); setMapOpen(false); setSettingsOpen(false); setDecorateOpen(false); setAutoOpen(false); setCookingOpen(false); setStoryOpen(false); setActivitySession(null); setNpcId(null); setVenueSession(null); setJobSession(null); setHomeGrowthOpen(false); setCookingOpen(false); engineRef.current?.clearHomeDecorationPreview(); }
      if (event.code === 'KeyP' && !event.repeat && !memoryOpen && !lifeOpen && !mapOpen && !settingsOpen) { event.preventDefault(); void captureMemory(); }
      if (event.code === 'KeyT' && !event.repeat && voiceState.pushToTalk) engineRef.current?.setPushToTalkHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent): void => { if (event.code === 'KeyT' && voiceState.pushToTalk) engineRef.current?.setPushToTalkHeld(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [activitySession, autoOpen, captureMemory, cookingOpen, decorateOpen, jobSession, lifeOpen, mapOpen, memoryOpen, propertyId, refreshHomeState, refreshKitchen, refreshLife, refreshStories, setBookOpen, settingsOpen, storyOpen, npcId, venueSession, voiceState.pushToTalk, homeGrowthOpen]);

  const anyPanelOpen = memoryOpen || lifeOpen || mapOpen || settingsOpen || decorateOpen || autoOpen || cookingOpen || storyOpen || Boolean(activitySession) || Boolean(npcId) || Boolean(venueSession) || Boolean(jobSession) || homeGrowthOpen;
  useEffect(() => {
    engineRef.current?.setInputEnabled(!anyPanelOpen);
    if (anyPanelOpen && document.pointerLockElement) void document.exitPointerLock();
  }, [anyPanelOpen]);

  useEffect(() => {
    const normalized = normalizeGameSettings(settings);
    settingsRef.current = normalized;
    localStorage.setItem('together:game-settings', JSON.stringify(normalized));
    document.documentElement.style.setProperty('--ui-scale', String(normalized.uiScale));
    document.documentElement.classList.toggle('high-contrast-prompts', normalized.highContrastPrompt);
    engineRef.current?.applySettings(normalized);
  }, [settings]);

  const setWeather = (nextWeather: WeatherState): void => {
    setWeatherState(nextWeather);
    engineRef.current?.setWeather(nextWeather);
  };
  return <div ref={containerRef} className="game-shell">
    <canvas ref={canvasRef} className="game-canvas" aria-label="Amaya Bay 3D world" />
    {!ready && !error && <div className="world-loading">Preparing Amaya Bay…</div>}
    {error && <div className="compatibility-card"><strong>Amaya Bay notice</strong><span>{error}</span><button className="quiet-action" onClick={() => setError(null)}>Dismiss</button></div>}
    {location && !anyPanelOpen && <div className="location-chip">{location}</div>}
    {interactionPrompt && !anyPanelOpen && <div className="interaction-prompt">{interactionPrompt}</div>}
    {networkSession && !anyPanelOpen && <div className={`connection-pill ${connection}`}>{connection === 'connected' ? 'household connected' : connection}</div>}
    {toast && <div className="memory-toast">{toast}</div>}
    {ready && !anyPanelOpen && <div className="quick-keys"><span>P · Photo</span><span>B · Memories</span><span>Tab · Life</span><span>M · Map</span><span>O · Settings</span><span>C · Decorate</span><span>J · Story</span><span>V · Camera</span></div>}
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
    {ready && !anyPanelOpen && <div className="weather-debug" aria-label="development weather controls"><span>DEV</span><button onClick={() => setWeather('clear')}>Clear</button><button onClick={() => setWeather('light_rain')}>Rain</button><button onClick={() => setWeather('monsoon_rain')}>Monsoon</button></div>}
    {captureBusy && <div className="capture-flash" aria-hidden="true" />}
    {networkSession && <MemoryBook open={memoryOpen} memories={memories} networkSession={networkSession} onClose={() => setBookOpen(false)} onCaptionChange={updateMemoryCaption} onExport={exportMemory} />}
    <LifePanel open={lifeOpen} data={lifeData} onClose={() => setLifeOpen(false)} />
    <CityMap open={mapOpen} currentLocation={location} onClose={() => setMapOpen(false)} />
    <GameSettingsPanel open={settingsOpen} settings={settings} onChange={(next) => setSettings(normalizeGameSettings(next))} onClose={() => setSettingsOpen(false)} />
    <AutoRickshawPanel open={autoOpen} from={autoFrom} busy={autoBusy} message={autoMessage} onRide={bookAutoRide} onClose={() => setAutoOpen(false)} />
    {propertyId && <DecoratePanel open={decorateOpen} propertyId={propertyId} home={homeState} inventory={kitchenInventory} busy={decorateBusy} message={decorateMessage}
      onPreview={(definitionId: string, roomId: string, placement: Placement2D) => engineRef.current?.previewHomeDecoration(definitionId, roomId, placement)}
      onClearPreview={() => engineRef.current?.clearHomeDecorationPreview()}
      onCommit={commitDecoration} onRemove={removeDecoration} onSurface={setHomeSurface}
      onClose={() => { setDecorateOpen(false); engineRef.current?.clearHomeDecorationPreview(); }} />}
    <StoryPanel open={storyOpen} active={storyActive} eligible={storyEligible} definitions={storyEvents} busy={storyBusy} message={storyMessage} onStart={startStory} onTask={updateStoryTask} onResolve={resolveStory} onClose={() => setStoryOpen(false)} />
    <CookingPanel open={cookingOpen} recipes={recipes} inventory={kitchenInventory} session={cookingSession} busy={cookingBusy} message={cookingMessage} onStart={startCooking} onStep={performCookingStep} onClose={() => setCookingOpen(false)} />
    <NpcPanel npcId={npcId} relationship={npcRelationship} weather={weather} busy={npcBusy} onTalk={talkToNpc} onClose={() => setNpcId(null)} />
    {propertyId && <HomeGrowthPanel open={homeGrowthOpen} currentPropertyId={propertyId} household={homeGrowthHousehold} homeObjects={homeState?.objects ?? []} moving={movingState} renovation={renovationState} userId={networkSession?.userId} busy={homeGrowthBusy} message={homeGrowthMessage} onProposeMove={proposeMove} onCastMove={castMove} onPack={packMovingObject} onCommitMove={commitMove} onProposeRenovation={proposeRenovation} onCastRenovation={castRenovation} onCommitRenovation={commitRenovation} onClose={() => setHomeGrowthOpen(false)} />}
    <ActivityPanel session={activitySession} {...(networkSession ? { userId: networkSession.userId } : {})} busy={activityBusy} message={activityMessage} onStep={advanceActivity} onClose={() => setActivitySession(null)} />
    <VenuePanel venue={venueSession} {...(networkSession ? { networkSession } : {})} onClose={() => setVenueSession(null)} onStartJob={(jobId) => void startJob(jobId)} onMoment={(message) => { setToast(message); window.setTimeout(() => setToast(null), 2600); }} />
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
