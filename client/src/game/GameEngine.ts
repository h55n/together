import * as THREE from 'three';
import type { ActivityStep } from '@together/shared';
import { MINI_GOLF_HOLES, type ActivityState } from '@together/shared';
import { GolfPresentation } from './interaction/GolfPresentation';
import { BadmintonPresentation } from './interaction/BadmintonPresentation';
import { CAFE_PRESENTATION_CENTER, cafeSeatTransform } from './interaction/CafePresentation';
import { AmbientLeisurePresentation, type AmbientLeisureSession } from './interaction/AmbientLeisurePresentation';
import { KAYAK_PLAYER_SUPPORT_Y, nearestAmayaBaySurfaceRoute } from '@together/shared';
import { GrassField } from './world/GrassField';
import { StoryMarker } from './interaction/StoryMarker';
import { MovingBoxes, type PackedBox } from './interaction/MovingBoxes';
import { storyTargetPosition } from './interaction/storyTargets';
import { AMAYA_BAY_VENUES, AUTO_DESTINATIONS, KAYAK_LAUNCH_POSITION, KAYAK_RETURN_POSITION, autoRideSeconds, planAutoRideRoute, sampleAutoRideRoute, type AutoRideRoute, avatarAppearanceFromConfig, cityHeightAt, districtAtPosition, isInsideAmayaBay, locationAnchor, realSecondsToGameMinutes, subareaAtPosition, venueFrontApproach, venueGameplayRole, worldToChunk, type ActivityId, type AvatarAction, type AvatarConfig, type GameSettings, type HomeAction, type MicroActionStep, type Placement2D, type PlayerSnapshot, type VenueGameplayRole, type RecipeAction } from '@together/shared';
import { Renderer } from './core/Renderer';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { MaterialLibrary } from './world/MaterialLibrary';
import { buildLanternStreetHero } from './world/HeroStreet';
import { streetCenterline } from './world/StreetNetwork';
import { AmayaBayEnvironment } from './world/AmayaBayEnvironment';
import { WorldStreamer } from './world/WorldStreamer';
import { amayaBayBoundaryCuboids, createAmayaBayChunkFactory } from './world/AmayaBayChunkFactory';
import type { FirstSessionAction } from './core/FirstSession';
import { PlayerAvatar } from './player/PlayerAvatar';
import { ArtAssets } from './assets/ArtAssets';
import { PlayerController } from './player/PlayerController';
import { CameraController } from './camera/CameraController';
import { LightingSystem } from './lighting/LightingSystem';
import { WeatherSystem } from './weather/WeatherSystem';
import { AmbientNPCSystem } from './npc/AmbientNPCSystem';
import { NamedNPCSystem } from './npc/NamedNPCSystem';
import { PerformanceMonitor } from './debug/PerformanceMonitor';
import { AdaptiveQualityController, type AdaptiveVisualBudget } from './performance/AdaptiveQualityController';
import { DebugOverlay } from './debug/DebugOverlay';
import { AudioZoneManager } from './audio/AudioZoneManager';
import { RemotePlayerSystem } from './network/RemotePlayerSystem';
import { GameSocketClient, type NetworkSession, type RemoteProfile } from '../network/GameSocketClient';
import { VoiceManager } from '../network/voice/VoiceManager';
import type { VoiceMode } from '@together/shared';
import { weatherAllowsKayak, type WeatherState } from './weather/weatherModel';
import { InteractionSystem, type WorldInteraction } from './interaction/InteractionSystem';
import { buildPropertyInterior } from './world/PropertyInterior';
import { MicroActionRuntime } from './interaction/MicroActionRuntime';
import { TransportOutingRuntime } from './interaction/TransportOutingRuntime';
import { HomeDecorationRenderer, type HomeObjectView } from './world/HomeDecorationRenderer';
import { namedNpcs as namedNpcDefinitions } from '@together/content';
import { assessMemoryParticipantFraming } from './memory/captureFraming';

export type GameEngineOptions = {
  signal?: AbortSignal;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  initialWeather?: WeatherState;
  initialGameMinutes?: number;
  networkSession?: NetworkSession;
  onConnectionState?: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  onNetworkError?: (message: string) => void;
  onHomeStateChanged?: () => void;
  onCookingStateChanged?: () => void;
  onActivityStateChanged?: () => void;
  onParticipantNamesChanged?: (names: Readonly<Record<string, string>>) => void;
  onInteractionPrompt?: (prompt: string | null) => void;
  onLocationChange?: (location: string | null) => void;
  onDomesticStep?: (interactionId: string, step: MicroActionStep) => void;
  onDomesticAction?: (action: HomeAction, interactionId: string) => void;
  onVoiceState?: (state: { mode: VoiceMode; muted: boolean; pushToTalk: boolean }) => void;
  onMoment?: (message: string) => void;
  onFirstSessionAction?: (action: FirstSessionAction) => void;
  onVenueInteraction?: (venue: { venueId: string; displayName: string; role: VenueGameplayRole }) => void;
  onKitchenInteraction?: () => void;
  onAutoStand?: () => void;
  onMemoryOpportunity?: (tag: string) => void;
  onActivityInteraction?: (activityId: ActivityId) => void;
  onNpcInteraction?: (npcId: string) => void;
  onHomeGrowthInteraction?: () => void;
  avatarConfig?: AvatarConfig;
  propertyId?: string;
  forceRendererBackend?: 'webgl2';
  recoverRenderer?: boolean;
  onRendererDeviceLost?: () => void;
};

export class GameEngine {
  readonly performance: PerformanceMonitor;

  private animationFrame = 0;
  private previousFrameTimestamp: number | null = null;
  private gameMinutes: number;
  private disposed = false;
  private inputEnabled = true;
  private ambientLeisure: AmbientLeisurePresentation | null = null;
  private sports: { id: string; state: ActivityState; golf?: GolfPresentation; badminton?: BadmintonPresentation; receivedAt: number; serverNow: number; cupCuePending?: boolean } | null = null;
  private transportOuting: { runtime: TransportOutingRuntime; physicsElapsed: number; ready: boolean; mountAbort: AbortController } | null = null;
  private readonly loop: GameLoop;
  private readonly input: InputManager;
  private readonly debug: DebugOverlay;
  private readonly audio = new AudioZoneManager();
  private readonly remotePlayers = new RemotePlayerSystem();
  private readonly participantNames: Record<string, string> = {};
  private network: GameSocketClient | null = null;
  private voice: VoiceManager | null = null;
  private networkElapsed = 0;
  private networkSeq = 0;
  private locationElapsed = Number.POSITIVE_INFINITY;
  private sceneMetricsElapsed = Number.POSITIVE_INFINITY;
  private lastLocation: string | null = null;
  private onFirstSessionAction: GameEngineOptions['onFirstSessionAction'];
  private readonly firstSessionActions = new Set<FirstSessionAction>();
  private firstSessionLook = 0;
  private firstSessionWalk = 0;
  private firstSessionPosition: { x: number; z: number } | null = null;
  private homeCenter = { x: 0, z: 0 };
  private homeReserveRadius = 0;
  private autoRide: { route: AutoRideRoute; elapsed: number; duration: number } | null = null;
  private adaptiveQuality = new AdaptiveQualityController('medium');
  private grass: GrassField | null = null;
  private storyMarker: StoryMarker | null = null;
  private movingBoxes: MovingBoxes | null = null;
  private storyArrival: (() => void) | null = null;
  private lastPaddleStroke: number | null = null;
  private readonly localUserId: string | null;
  private readonly seatedPelvis = new THREE.Box3();
  private grassDensity = 1;
  private grassElapsed = 0;

  private constructor(
    readonly scene: THREE.Scene,
    private readonly renderer: Renderer,
    private readonly physics: PhysicsWorld,
    private readonly materials: MaterialLibrary,
    private readonly avatar: PlayerAvatar,
    private readonly player: PlayerController,
    private readonly camera: CameraController,
    private readonly lighting: LightingSystem,
    private readonly weather: WeatherSystem,
    private readonly npcs: AmbientNPCSystem,
    private readonly namedNpcs: NamedNPCSystem,
    private readonly worldStreamer: WorldStreamer,
    private readonly interactions: InteractionSystem,
    private readonly microActions: MicroActionRuntime,
    private readonly homeDecor: HomeDecorationRenderer,
    private readonly canvas: HTMLCanvasElement,
    container: HTMLElement,
    initialGameMinutes: number,
    performance: PerformanceMonitor,
    networkSession?: NetworkSession,
    onConnectionState?: GameEngineOptions['onConnectionState'],
    onNetworkError?: GameEngineOptions['onNetworkError'],
    onHomeStateChanged?: GameEngineOptions['onHomeStateChanged'],
    onCookingStateChanged?: GameEngineOptions['onCookingStateChanged'],
    onActivityStateChanged?: GameEngineOptions['onActivityStateChanged'],
    onParticipantNamesChanged?: GameEngineOptions['onParticipantNamesChanged'],
    onVoiceState?: GameEngineOptions['onVoiceState'],
    private readonly onLocationChange?: GameEngineOptions['onLocationChange'],
    private readonly onInteractionPrompt?: GameEngineOptions['onInteractionPrompt'],
    private readonly onMoment?: GameEngineOptions['onMoment'],
    private readonly onVenueInteraction?: GameEngineOptions['onVenueInteraction'],
    private readonly onKitchenInteraction?: GameEngineOptions['onKitchenInteraction'],
    private readonly onAutoStand?: GameEngineOptions['onAutoStand'],
    private readonly onMemoryOpportunity?: GameEngineOptions['onMemoryOpportunity'],
    private readonly onActivityInteraction?: GameEngineOptions['onActivityInteraction'],
    private readonly onNpcInteraction?: GameEngineOptions['onNpcInteraction'],
    private readonly onHomeGrowthInteraction?: GameEngineOptions['onHomeGrowthInteraction'],
  ) {
    this.performance = performance;
    this.gameMinutes = initialGameMinutes;
    this.player.setFootfallListener(speed => {
      const position = this.player.getPosition();
      const ground = nearestAmayaBaySurfaceRoute(position.x, position.z);
      const paved = ground && ground.distance <= ground.route.width / 2 + (ground.route.kind === 'road' ? 2.2 : 0);
      this.audio.playFootstep(speed, paved ? 'hard' : 'soft');
    });
    this.input = new InputManager(canvas);
    this.debug = new DebugOverlay(container, this.performance, renderer.info);
    this.loop = new GameLoop(
      (delta) => this.update(delta),
      (fixedDelta) => this.fixedUpdate(fixedDelta),
    );
    this.scene.add(this.remotePlayers.root);
    onParticipantNamesChanged?.({});
    this.localUserId = networkSession?.userId ?? null;
    if (networkSession) {
      const callbacks = {
        onTimeSync: (minute: number) => this.setGameTime(minute),
        onWeatherSync: (state: WeatherState) => this.setWeather(state),
        onPlayerSnapshot: (userId: string, snapshot: PlayerSnapshot) => this.remotePlayers.applySnapshot(userId, snapshot),
        onPlayerProfile: (userId: string, profile: RemoteProfile) => {
          this.participantNames[userId] = profile.displayName;
          onParticipantNamesChanged?.({ ...this.participantNames });
          this.remotePlayers.setProfile(userId, profile.avatarConfig);
        },
        onPlayerLeave: (userId: string) => { this.remotePlayers.remove(userId); this.voice?.handleLeave(userId); },
        onVoiceJoin: (payload: Parameters<VoiceManager['handleJoin']>[0]) => { void this.voice?.handleJoin(payload).catch(reportVoiceError); },
        onVoiceOffer: (payload: Parameters<VoiceManager['handleOffer']>[0]) => { void this.voice?.handleOffer(payload).catch(reportVoiceError); },
        onVoiceAnswer: (payload: Parameters<VoiceManager['handleAnswer']>[0]) => { void this.voice?.handleAnswer(payload).catch(reportVoiceError); },
        onVoiceIce: (payload: Parameters<VoiceManager['handleIce']>[0]) => { void this.voice?.handleIce(payload).catch(reportVoiceError); },
        onVoiceLeave: (userId: string) => this.voice?.handleLeave(userId),
        ...(onConnectionState ? { onConnectionState } : {}),
        ...(onNetworkError ? { onError: onNetworkError } : {}),
        ...(onHomeStateChanged ? { onHomeStateChanged } : {}),
        ...(onCookingStateChanged ? { onCookingStateChanged } : {}),
        ...(onActivityStateChanged ? { onActivityStateChanged } : {}),
      };
      this.network = new GameSocketClient(networkSession, callbacks);
      this.voice = new VoiceManager(networkSession.userId, this.network, onVoiceState);
    }
  }

  static async create(options: GameEngineOptions): Promise<GameEngine> {
    const renderer = await Renderer.create(options.canvas, {
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.forceRendererBackend ? { forceBackend: options.forceRendererBackend } : {}),
      ...(options.recoverRenderer ? { recoverFromDeviceLoss: true } : {}),
      ...(options.onRendererDeviceLost ? { onDeviceLost: options.onRendererDeviceLost } : {}),
    });
    let physics: PhysicsWorld;
    try { physics = await PhysicsWorld.create(options.signal); }
    catch (error) { renderer.dispose(); throw error; }
    const materials = new MaterialLibrary();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaabbb7);

    for (const boundary of amayaBayBoundaryCuboids()) {
      physics.createFixedCuboid(boundary.center, boundary.halfExtents);
    }
    const lanternOrigin = { x: -30, y: cityHeightAt(-30, 75), z: 75 };
    const street = buildLanternStreetHero(materials, physics, lanternOrigin);
    scene.add(street.group);
    const environment = new AmayaBayEnvironment(materials, physics);
    scene.add(environment.root);
    const home = buildPropertyInterior(materials, physics, options.propertyId);
    scene.add(home.group);

    const localAppearance = options.avatarConfig ? avatarAppearanceFromConfig(options.avatarConfig, 'outdoor') : null;
    const avatar = new PlayerAvatar(localAppearance ? {
      height: localAppearance.height, bodyWidthScale: localAppearance.bodyWidthScale, skinTone: localAppearance.skinColor,
      shirtColor: localAppearance.shirtColor, trouserColor: localAppearance.trouserColor, hairColor: localAppearance.hairColor,
      faceBase: localAppearance.faceBase, hair: localAppearance.hair,
      outfitId: localAppearance.outfitId, outfitContext: localAppearance.outfitContext,
      ...(localAppearance.facialHair ? { facialHair: localAppearance.facialHair } : {}),
      ...(localAppearance.glasses ? { glasses: localAppearance.glasses } : {}),
    } : {});
    scene.add(avatar.root);
    const artAssets = new ArtAssets();
    void avatar.attachAuthored(artAssets, localAppearance ?? {}).catch((error) => { console.warn('authored avatar unavailable', error); });
    // Household members arrive side by side rather than inside one another at the same spawn point.
    const spawnLane = options.networkSession ? memberSpawnLane(options.networkSession.userId) : 0;
    const player = new PlayerController(physics, avatar, { ...home.spawn, x: home.spawn.x + spawnLane * 0.75 });
    const camera = new CameraController(avatar, window.innerWidth / Math.max(1, window.innerHeight));
    camera.usePhysicsRaycast((origin, direction, maxDistance) => physics.castStaticRay(origin, direction, maxDistance));
    camera.addCollisionRoot(street.group);
    camera.addCollisionRoot(home.group);

    const lighting = new LightingSystem(scene);
    const weather = new WeatherSystem(scene, materials);
    weather.setState(options.initialWeather ?? 'clear');
    const npcs = new AmbientNPCSystem(96, (from, to) => physics.canTraversePedestrian(from, to));
    if (renderer.info.backend === 'webgpu') void npcs.enableNodeLimbSwing().catch(() => undefined);
    scene.add(npcs.root);
    const namedNpcs = new NamedNPCSystem((from, to) => physics.canTraversePedestrian(from, to));
    scene.add(namedNpcs.root);
    const enginePerformance = new PerformanceMonitor();
    const worldStreamer = new WorldStreamer(createAmayaBayChunkFactory(materials, physics, enginePerformance, { cellSize: 64, minVertices: 8192 }), enginePerformance);
    scene.add(worldStreamer.root);
    camera.addCollisionRoot(worldStreamer.root);
    const interactionDefinitions: WorldInteraction[] = [
      anchorInteraction(street.interactionAnchors, 'cafe_roshan', 'Wipe café counter', 'wipe', 2.7, 3, 1.8),
      anchorInteraction(street.interactionAnchors, 'street_bench_west', 'Sit on bench', 'sit', 2.4, 2, 2.4),
      { ...anchorInteraction(street.interactionAnchors, 'bicycle_rack', 'Take a bicycle', 'pick_up', 2.5, 2, 1.1), activityId: 'cycling' },
      anchorInteraction(street.interactionAnchors, 'street_planter', 'Water planter', 'water', 2.6, 3, 2.0),
      { id: 'sunset_lookout', label: 'Watch the bay from the bench', action: 'sit', x: 69.5, z: -278, radius: 3.2, priority: 4, durationSeconds: 4 },
      { id: 'bay_cycle_hut', label: 'Rent a scooter', action: 'point', x: 55, z: -257.5, radius: 3.5, priority: 5, durationSeconds: 0.7, transportMode: 'scooter', activityId: 'scooter_ride' },
      { id: 'bay_kayak_hut', label: 'Launch kayak', action: 'kayak', x: 135, z: -330, radius: 4.0, priority: 6, durationSeconds: 0.7, transportMode: 'kayak', activityId: 'kayak' },
      { id: 'library_reading', label: 'Read on the library bench', action: 'sit', x: 225.5, z: -63.2, radius: 3.2, priority: 4, durationSeconds: 4 },
      locationInteraction('park_picnic_lawn', 'Lay out a picnic', 'sit', 5.5, 3, { activityId: 'picnic' }),
      locationInteraction('park_badminton', 'Play badminton', 'high_five', 4.8, 4, { activityId: 'badminton' }),
      locationInteraction('hill_minigolf', 'Play a mini-golf hole', 'point', 4.8, 4, { activityId: 'mini_golf' }),
      locationInteraction('lantern_cafe_roshan', 'Sit for coffee', 'sit', 3.5, 3, { activityId: 'cafe_hangout' }),
      { id: 'bay_photo_outing', label: 'Frame a waterfront photo', action: 'point', x: 40, z: -280, radius: 3.5, priority: 5, durationSeconds: .5, activityId: 'photography' },
      ...namedNpcDefinitions.flatMap((npc, index): WorldInteraction[] => {
        const anchor = locationAnchor(npc.homeOrWork);
        const phase = index * 0.83;
        return anchor ? [{ id: `npc-talk:${npc.id}`, label: `Talk to ${npc.displayName}`, action: 'nod', x: anchor.position.x + Math.sin(phase * 2.2) * 2.4, z: anchor.position.z + Math.cos(phase * 1.7) * 2.4, radius: 3.0, priority: 7, durationSeconds: 0.7, npcId: npc.id }] : [];
      }),
      ...AUTO_DESTINATIONS.map((destination): WorldInteraction => ({ id: `auto-stand:${destination.id}`, label: 'Call auto-rickshaw', action: 'point', x: destination.position.x, z: destination.position.z, radius: 4.6, priority: 4, durationSeconds: 0.6 })),
      ...home.interactions,
      ...AMAYA_BAY_VENUES.map((venue): WorldInteraction => {
        const approach = venue.id === 'cafe_roshan' ? { x: -39, z: 60 }
          : venue.id === 'dev_cycle_hut' ? { x: 55, z: -257.5 }
          : venue.id === 'kayak_cove' ? { x: 135, z: -330 }
            : venue.id === 'hill_tea_hut' ? { x: 283, z: 265.5 }
              : venueFrontApproach(venue);
        return {
          id: `venue:${venue.id}`, label: venueInteractionLabel(venue.category, venue.displayName), action: 'point',
          x: approach.x, z: approach.z,
          radius: Math.max(3.2, venue.frontageMetres * 0.45), priority: venue.hero ? 5 : 3, durationSeconds: 0.7,
        };
      }),
    ];
    const interactions = new InteractionSystem(interactionDefinitions, options.onInteractionPrompt);
    const microActions = new MicroActionRuntime(
      options.onInteractionPrompt,
      (step, interactionId) => options.onDomesticStep?.(interactionId, step),
      options.onDomesticAction,
      () => interactions.setEnabled(true),
    );
    const homeDecor = new HomeDecorationRenderer(home.property.id, home.center, materials, physics);
    scene.add(homeDecor.root);
    camera.addCollisionRoot(homeDecor.root);

    const engine = new GameEngine(
      scene,
      renderer,
      physics,
      materials,
      avatar,
      player,
      camera,
      lighting,
      weather,
      npcs,
      namedNpcs,
      worldStreamer,
      interactions,
      microActions,
      homeDecor,
      options.canvas,
      options.container,
      options.initialGameMinutes ?? 17 * 60 + 20,
      enginePerformance,
      options.networkSession,
      options.onConnectionState,
      options.onNetworkError,
      options.onHomeStateChanged,
      options.onCookingStateChanged,
      options.onActivityStateChanged,
      options.onParticipantNamesChanged,
      options.onVoiceState,
      options.onLocationChange,
      options.onInteractionPrompt,
      options.onMoment,
      options.onVenueInteraction,
      options.onKitchenInteraction,
      options.onAutoStand,
      options.onMemoryOpportunity,
      options.onActivityInteraction,
      options.onNpcInteraction,
      options.onHomeGrowthInteraction,
    );
    engine.homeCenter = home.center;
    engine.homeReserveRadius = home.reserveRadius;
    engine.onFirstSessionAction = options.onFirstSessionAction;
    return engine;
  }

  async prepareFirstPlayable(signal?: AbortSignal): Promise<void> {
    if (this.disposed || signal?.aborted) throw new Error('World preparation was cancelled.');
    const position = this.player.getPosition();
    const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
    this.worldStreamer.prepareInitial(playerPosition, 5);

    // Settle the newly-added static colliders before the player gains control.
    this.measureSystem('physics-warmup', () => this.physics.step());
    this.player.syncVisual(this.camera.yaw, 0);
    this.camera.update(0, false, false);
    this.lighting.update(this.gameMinutes, this.avatar.root.position);
    this.weather.update(0, this.avatar.root.position);

    await this.renderer.prewarm(this.scene, this.camera.camera, signal);
    const info = this.renderer.renderer.info.render;
    this.performance.recordRenderer(info.calls, info.triangles);
    this.recordSceneMetrics();
  }

  start(): void {
    this.input.enable();
    this.canvas.addEventListener('pointerdown', this.onFirstGesture, { once: true });
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onAudioVisibility);
    window.addEventListener('blur', this.onAudioBlur);
    window.addEventListener('focus', this.onAudioVisibility);
    this.network?.connect();
    this.previousFrameTimestamp = null;
    this.loop.reset();
    this.animationFrame = requestAnimationFrame(this.onAnimationFrame);
  }

  resetFirstSessionProgress(): void {
    this.firstSessionActions.clear(); this.firstSessionLook = 0; this.firstSessionWalk = 0;
    this.firstSessionPosition = null;
  }

  private reportFirstSessionAction(action: FirstSessionAction): void {
    if (this.firstSessionActions.has(action)) return;
    this.firstSessionActions.add(action); this.onFirstSessionAction?.(action);
  }

  setWeather(state: WeatherState): void {
    this.weather.setState(state);
    this.audio.setZone(state.includes('rain') || state === 'thunderstorm' ? 'rain' : 'lantern_street');
  }

  syncHomeDecoration(objects: readonly HomeObjectView[], surfaces: Readonly<Record<string, string>> = {}): void { this.homeDecor.sync(objects, surfaces); }

  previewHomeDecoration(definitionId: string, roomId: string, placement: Placement2D): void { this.homeDecor.setPreview(definitionId, roomId, placement); }

  clearHomeDecorationPreview(): void { this.homeDecor.clearPreview(); }

  setGameTime(minutes: number): void {
    this.gameMinutes = ((minutes % 1440) + 1440) % 1440;
  }

  updateAccessToken(accessToken: string | undefined): void {
    this.network?.updateAccessToken(accessToken);
  }

  getParticipantNames(): Readonly<Record<string, string>> { return this.participantNames; }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) this.transportOuting?.runtime.cancel('menu');
    if (enabled) this.input.enable();
    else { this.microActions.cancel(this.player); this.input.disable(); }
  }

  applySettings(settings: GameSettings): void {
    this.camera.camera.fov = settings.fov;
    this.camera.camera.updateProjectionMatrix();
    this.camera.headBobAmount = settings.reducedMotion ? 0 : settings.headBob;
    this.audio.setMasterVolume(settings.masterVolume);
    this.input.setBindings(settings.bindings);
    this.adaptiveQuality = new AdaptiveQualityController(settings.quality);
    this.applyVisualBudget(this.adaptiveQuality.sample(this.performance.read()));
  }

  getPlayerPosition(): { x: number; y: number; z: number } { return this.player.getPosition(); }

  getMemoryContext(): { locationId: string; weather: WeatherState; gameMinutes: number } {
    return {
      locationId: this.lastLocation ?? 'Amaya Bay',
      weather: this.weather.state,
      gameMinutes: this.gameMinutes,
    };
  }

  getMemoryParticipantContext(): { onlineUserIds: string[]; visibleUserIds: string[]; composition: number } {
    const onlineUserIds = this.remotePlayers.userIds();
    const participants = onlineUserIds.flatMap((userId) => {
      const position = this.remotePlayers.getPosition(userId);
      return position ? [{ userId, position: { x: position.x, y: position.y, z: position.z } }] : [];
    });
    const framing = assessMemoryParticipantFraming(this.camera.camera, participants);
    return { onlineUserIds, visibleUserIds: framing.visibleUserIds, composition: framing.composition };
  }

  async captureFrame(quality = 0.86): Promise<Blob> {
    this.measureSystem('render', () => this.renderer.renderFrame(this.scene, this.camera.camera));
    const normalizedQuality = Math.max(0.45, Math.min(0.95, quality));
    return new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The browser could not capture this Memory image'));
      }, 'image/jpeg', normalizedQuality);
    });
  }

  async enableVoice(mode: Exclude<VoiceMode, 'off'>): Promise<void> { await this.voice?.enable(mode); }
  disableVoice(): void { this.voice?.disable(); }
  setVoiceMuted(muted: boolean): void { this.voice?.setMuted(muted); }
  setPushToTalk(enabled: boolean): void { this.voice?.setPushToTalk(enabled); }
  setPushToTalkHeld(held: boolean): void { this.voice?.setPushToTalkHeld(held); }

  startAutoRide(destinationId: string, skip = false): void {
    const destination = AUTO_DESTINATIONS.find((entry) => entry.id === destinationId);
    if (!destination) throw new Error('Unknown auto-rickshaw destination');
    const current = this.player.getPosition();
    const end = new THREE.Vector3(destination.position.x, cityHeightAt(destination.position.x, destination.position.z) + 1.1, destination.position.z);
    const distance = Math.hypot(end.x - current.x, end.z - current.z);
    this.player.setTransportMode('auto_rickshaw');
    this.player.setInteractionLock(true);
    this.interactions.setEnabled(false);
    if (skip) {
      this.player.setWorldPosition({ x: end.x, y: end.y, z: end.z });
      this.worldStreamer.refreshNow(end);
      this.finishAutoRide();
      return;
    }
    // The auto follows the street network; the trip time reflects the route actually driven.
    const route = planAutoRideRoute({ x: current.x, z: current.z }, { x: end.x, z: end.z });
    this.autoRide = { route, elapsed: 0, duration: autoRideSeconds(Math.max(distance, route.lengthMetres)) };
    this.onMoment?.(`Auto ride · ${destination.displayName}`);
  }

  /** Development visual review only; placement never enters production gameplay. */
  playerForWorldReview(): { position: { x: number; y: number; z: number }; transport: string; outingReady: boolean; outingState: string | null } {
    if (!import.meta.env.DEV || new URLSearchParams(window.location.search).get('worldReview') !== '1') throw new Error('World player review is unavailable');
    const position = this.player.getPosition();
    return { position: { x: position.x, y: position.y, z: position.z }, transport: this.player.getTransportMode(), outingReady: this.transportOuting?.ready ?? false, outingState: this.transportOuting?.runtime.snapshot().state ?? null };
  }

  /** Development visual review only; placement never enters production gameplay. */
  placeForWorldReview(x: number, z: number): void {
    this.transportOuting?.runtime.cancel('relocated');
    if (!import.meta.env.DEV || !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 450 || Math.abs(z) > 450) {
      throw new Error('World review placement is unavailable');
    }
    const position = { x, y: cityHeightAt(x, z) + 1.1, z };
    this.player.setWorldPosition(position);
    this.worldStreamer.refreshNow(new THREE.Vector3(position.x, position.y, position.z));
  }
  /** Face a review camera toward an authored frontage without changing player movement. */
  faceForWorldReview(yaw: number): void {
    if (!import.meta.env.DEV || !Number.isFinite(yaw)) throw new Error('World review facing is unavailable');
    this.camera.yaw = yaw;
    this.camera.pitch = 0;
    this.camera.update(0, false, false);
  }
  /** Accelerated, collider-backed route audit available only to the local development review page. */
  reviewWalkHeroRoute(): { reachedBay: boolean; checkpoints: string[]; blockedAt?: { x: number; y: number; z: number; targetX: number; targetZ: number; distance: number } } {
    if (!import.meta.env.DEV || new URLSearchParams(window.location.search).get('worldReview') !== '1') {
      throw new Error('World route review is unavailable');
    }
    cancelAnimationFrame(this.animationFrame);
    this.input.disable();
    const checkpoints: string[] = [];
    let currentChunk = '';
    const ensureGround = (x: number, z: number): void => {
      const chunk = worldToChunk({ x, z });
      const key = `${chunk.x},${chunk.z}`;
      if (key === currentChunk) return;
      currentChunk = key;
      this.worldStreamer.refreshNow(new THREE.Vector3(x, cityHeightAt(x, z) + 1.1, z));
    };
    const walkTo = (target: { x: number; z: number }): { x: number; y: number; z: number; targetX: number; targetZ: number; distance: number } | undefined => {
      const initial = this.player.getPosition();
      const limit = Math.ceil(Math.hypot(target.x - initial.x, target.z - initial.z) / 0.25) + 20;
      for (let step = 0; step < limit; step += 1) {
        const position = this.player.getPosition();
        const dx = target.x - position.x;
        const dz = target.z - position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.13) break;
        const length = Math.min(distance, 0.25);
        ensureGround(position.x + dx / distance * length, position.z + dz / distance * length);
        this.physics.moveCharacter(this.player.physicsHandle, {
          x: dx / distance * length, y: -0.075, z: dz / distance * length,
        });
        this.physics.step();
      }
      const actual = this.player.getPosition();
      const distance = Math.hypot(target.x - actual.x, target.z - actual.z);
      return distance > 0.55 ? { x: actual.x, y: actual.y, z: actual.z, targetX: target.x, targetZ: target.z, distance } : undefined;
    };
    try {
      const route = streetCenterline('primary-spine');
      const start = this.player.getPosition();
      ensureGround(start.x, start.z);
      let blocked = walkTo({ x: start.x, z: 193.5 }) ?? walkTo({ x: start.x, z: 190 });
      const entryIndex = route.reduce((best, point, index) => {
        const distance = Math.hypot(point.x - start.x, point.z - 189);
        const bestDistance = Math.hypot(route[best]!.x - start.x, route[best]!.z - 189);
        return distance < bestDistance ? index : best;
      }, 0);
      if (!blocked) blocked = walkTo(route[entryIndex]!);
      for (const target of route.slice(entryIndex + 1)) {
        if (blocked) break;
        blocked = walkTo(target);
        if (!blocked && target.z < 80 && !checkpoints.includes('lantern_street')) checkpoints.push('lantern_street');
      }
      const last = this.player.getPosition();
      this.player.syncVisual(this.camera.yaw, 0);
      this.worldStreamer.refreshNow(new THREE.Vector3(last.x, last.y, last.z));
      if (!blocked && last.z < -260) checkpoints.push('bay_steps');
      return { reachedBay: !blocked && last.x > 90 && last.z < -260, checkpoints, ...(blocked ? { blockedAt: blocked } : {}) };
    } finally {
      this.previousFrameTimestamp = null;
      this.loop.reset();
      this.input.enable();
      this.animationFrame = requestAnimationFrame(this.onAnimationFrame);
    }
  }
  async playContextAction(action: string): Promise<void> {
    const mapped = jobActionToAvatarAction(action);
    await this.playCompletedAction(mapped, mapped === 'carry' || mapped === 'cycle' ? 1.8 : 1.25);
  }

  async playCookingAction(action: RecipeAction): Promise<void> {
    const mapped = cookingActionToAvatarAction(action);
    await this.playCompletedAction(mapped, action === 'boil' || action === 'fry' ? 1.8 : 1.35);
  }

  async playActivityAction(action: AvatarAction, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    if (action === 'cycle') { this.player.setTransportMode('bicycle'); return; }
    if (action === 'kayak') { this.launchKayak(); return; }
    if (action === 'walk' || action === 'jog' || action === 'idle') return;
    await this.playCompletedAction(action, action === 'sit' ? 2.2 : 1.25, signal);
  }

  async playTransportOuting(kind: 'cycling' | 'kayak' | 'scooter_ride', signal?: AbortSignal): Promise<{ underway: boolean }> {
    signal?.throwIfAborted();
    if (this.disposed) throw new Error('The world has closed. Rejoin before continuing.');
    if (this.transportOuting) throw new Error('Finish or leave the current outing first.');
    const expectedMode = kind === 'cycling' ? 'bicycle' : kind === 'scooter_ride' ? 'scooter' : 'kayak';
    const owner = { runtime: new TransportOutingRuntime(expectedMode, this.player.getPosition()), physicsElapsed: 0, ready: false, mountAbort: new AbortController() };
    this.transportOuting = owner;
    const abort = (): void => { owner.mountAbort.abort(); owner.runtime.cancel(); };
    const hidden = (): void => { if (document.hidden) abort(); };
    signal?.addEventListener('abort', abort, { once: true });
    window.addEventListener('blur', abort);
    document.addEventListener('visibilitychange', hidden);
    if (signal?.aborted) abort();
    try {
      await this.playActivityStep(kind, kind === 'cycling' ? { id: 'ride_route', label: 'Travel', animation: 'cycle' }
        : kind === 'scooter_ride' ? { id: 'ride', label: 'Travel', animation: 'scooter' }
          : { id: 'paddle', label: 'Travel', animation: 'kayak' }, owner.mountAbort.signal);
      signal?.throwIfAborted();
      if (owner.runtime.snapshot().state === 'cancelled' || this.disposed || this.transportOuting !== owner) throw new Error('Outing interrupted before departure.');
      owner.runtime = new TransportOutingRuntime(expectedMode, this.player.getPosition());
      owner.ready = true;
      const result = await owner.runtime.completion;
      if (result.state === 'cancelled') {
        if (this.transportOuting === owner && !this.disposed && this.player.getTransportMode() === expectedMode) this.dismountActivityTransport();
        throw new Error('Outing interrupted. Your saved activity steps are unchanged.');
      }
      owner.mountAbort.signal.throwIfAborted();
      if (this.transportOuting !== owner) throw new Error('Outing replaced. Start again when ready.');
      this.dismountActivityTransport();
      await this.playCompletedAction('place', 1.25, owner.mountAbort.signal);
      return { underway: result.underway };
    } finally {
      signal?.removeEventListener('abort', abort);
      window.removeEventListener('blur', abort);
      document.removeEventListener('visibilitychange', hidden);
      if (this.transportOuting === owner) {
        if (!this.disposed && this.player.getTransportMode() === expectedMode) this.dismountActivityTransport();
        this.transportOuting = null;
      }
    }
  }

  finishTransportOuting(): void {
    const owner = this.transportOuting;
    if (!owner) return;
    if (!owner.ready) { owner.mountAbort.abort(); owner.runtime.cancel(); return; }
    owner.runtime.finish();
  }

  private sampleTransportOuting(deltaSeconds: number): void {
    const owner = this.transportOuting;
    if (!owner?.ready) return;
    const physicsElapsed = owner.physicsElapsed;
    owner.physicsElapsed = 0;
    owner.runtime.sample({ position: this.player.getPosition(), mode: this.player.getTransportMode(), deltaSeconds: physicsElapsed || deltaSeconds,
      enabled: this.inputEnabled !== false, safeWeather: this.player.getTransportMode() !== 'kayak' || weatherAllowsKayak(this.weather.state) });
  }

  async playActivityStep(activityId: ActivityId, step: ActivityStep, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    if (this.disposed) throw new Error('The world has closed. Rejoin before continuing.');
    if (activityId === 'cycling') {
      if (step.id === 'mount_cycle') {
        this.dismountActivityTransport();
        await this.playCompletedAction('pick_up', 1.1, signal);
        signal?.throwIfAborted();
        this.player.setTransportMode('bicycle');
        this.interactions.setEnabled(false);
        this.onInteractionPrompt?.('X · Dismount bicycle');
        return;
      }
      if (step.id === 'ride_route') {
        if (this.player.getTransportMode() !== 'bicycle') {
          this.dismountActivityTransport();
          await this.playCompletedAction('pick_up', 1.1, signal);
          signal?.throwIfAborted();
          this.player.setTransportMode('bicycle');
          this.interactions.setEnabled(false);
          this.onInteractionPrompt?.('X · Dismount bicycle');
        }
        return;
      }
      if (step.id === 'park_cycle') this.dismountActivityTransport();
    } else if (activityId === 'scooter_ride') {
      if (step.id === 'ride') {
        if (this.player.getTransportMode() !== 'scooter') {
          this.dismountActivityTransport();
          await this.playCompletedAction('pick_up', 1.0, signal);
          signal?.throwIfAborted();
          // The avatar's helmet follows the scooter transport mode.
          this.player.setTransportMode('scooter');
          this.interactions.setEnabled(false);
          this.onInteractionPrompt?.('X · Park scooter');
        }
        return;
      }
      if (step.id === 'park_scooter') this.dismountActivityTransport();
    } else if (activityId === 'kayak') {
      if (step.id === 'safety_check' || step.id === 'launch' || step.id === 'return') this.dismountActivityTransport();
      if (step.id === 'paddle') {
        if (!weatherAllowsKayak(this.weather.state)) throw new Error('The kayak hut is closed in heavy weather.');
        this.launchKayak();
        this.interactions.setEnabled(false);
        this.onInteractionPrompt?.('X · Return kayak');
        return;
      }
    }
    await this.playActivityAction(step.animation, signal);
  }

  private dismountActivityTransport(): void {
    const mode = this.player.getTransportMode();
    this.player.setTransportMode('on_foot');
    if (mode === 'kayak') this.returnKayakToHut();
    this.interactions.setEnabled(true);
    this.onInteractionPrompt?.(null);
  }

  private async playCompletedAction(action: Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>, duration: number, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    if (this.disposed) throw new Error('The world has closed. Rejoin before continuing.');
    if (!this.player.beginMicroAction(action, duration, true)) throw new Error('Dismount before performing this action.');
    const completion = this.player.waitForMicroActionCompletion();
    const abortOwnedAction = (): void => {
      if (this.player.waitForMicroActionCompletion() === completion) this.player.cancelMicroAction();
    };
    signal?.addEventListener('abort', abortOwnedAction, { once: true });
    if (signal?.aborted) abortOwnedAction();
    try {
      if (!await completion) throw new Error('Action interrupted. Try this step again.');
      signal?.throwIfAborted();
    } finally { signal?.removeEventListener('abort', abortOwnedAction); }
  }

  showSports(id: string, state: ActivityState, serverNow = Date.now()): void {
    if (this.disposed || (!state.golf && !state.badminton && !state.picnic && !state.cafe)) return;
    if (this.sports?.id !== id) {
      this.clearSports();
      this.sports = { id, state, receivedAt: performance.now(), serverNow,
        ...(state.golf ? { golf: new GolfPresentation(this.scene) } : {}),
        ...(state.badminton ? { badminton: new BadmintonPresentation(this.scene) } : {}),
      };
    } else {
      if ((state.revision ?? 0) < (this.sports.state.revision ?? 0)) return;
      const previous = this.sports.state;
      if (state.golf && state.golf.revision > (previous.golf?.revision ?? 0)) {
        this.audio.playActivitySound('golf_putt');
        this.sports.cupCuePending = state.golf.lastShot?.result.captured ?? false;
      }
      if (state.badminton) {
        if (state.badminton.rallyHits > (previous.badminton?.rallyHits ?? 0)) this.audio.playActivitySound('racket_hit');
        if (state.badminton.completedRallies > (previous.badminton?.completedRallies ?? 0)) this.audio.playActivitySound('shuttle_fault');
      }
      this.sports.state = state; this.sports.serverNow = serverNow; this.sports.receivedAt = performance.now();
    }
    this.avatar.setFirstPerson(false);
  }

  clearSports(): void {
    if (!this.sports) return;
    this.sports?.golf?.dispose(); this.sports?.badminton?.dispose();
    this.sports = null;
    this.avatar.setFirstPerson(this.camera.mode === 'first_person');
  }

  /**
   * Marks the next place an active story asks the household to visit. Arriving calls `onArrive`
   * once; passing null clears the lantern. Returns false when the target has no world position.
   */
  setStoryLocation(target: string | null, onArrive?: () => void): boolean {
    if (this.disposed) return false;
    this.storyMarker ??= new StoryMarker(this.scene);
    const position = target ? storyTargetPosition(target, this.homeReserveRadius > 0 ? this.homeCenter : null) : null;
    this.storyMarker.setTarget(position);
    this.storyArrival = position ? onArrive ?? null : null;
    return position !== null;
  }

  /** Packed belongings wait in taped boxes just inside the home until moving day completes. */
  setMovingBoxes(boxes: readonly PackedBox[]): void {
    if (this.disposed) return;
    this.movingBoxes ??= new MovingBoxes(this.scene);
    const origin = boxes.length > 0 && this.homeReserveRadius > 0 ? { x: this.homeCenter.x - 2.4, z: this.homeCenter.z + 1.8 } : null;
    this.movingBoxes.set(origin, boxes);
  }

  movingBoxesForWorldReview(): number { return this.movingBoxes?.root.children.length ?? 0; }

  /** Fresh groceries on the household shelf ride home in the bicycle basket. */
  setBasketLoad(groceryCount: number): void { this.avatar.setBasketLoad(groceryCount); }

  setGolfAim(angle: number, power: number): void { this.sports?.golf?.setAim(angle, power); }

  syncAmbientActivities(sessions: readonly AmbientLeisureSession[]): void {
    if (this.disposed) return;
    this.ambientLeisure ??= new AmbientLeisurePresentation(this.scene);
    this.ambientLeisure.sync(sessions);
  }

  upsertAmbientActivity(session: AmbientLeisureSession): void {
    if (this.disposed) return;
    this.ambientLeisure ??= new AmbientLeisurePresentation(this.scene);
    this.ambientLeisure.upsert(session);
  }

  leisureForWorldReview(): Array<{ kind: string; objects: number }> {
    return this.scene.children.filter(child => child.name === 'picnic-presentation' || child.name === 'cafe-presentation')
      .map(child => ({ kind: child.name, objects: child.children.length }));
  }

  /**
   * Presentation only: shows the local guest seated while the activity view is open.
   * The physics body stays where the player stood, so closing the view returns them there.
   */
  private seatAvatar(x: number, z: number, seatTop: number, yaw: number, dt: number): void {
    this.avatar.setTransform({ x, y: seatTop + 0.87, z }, yaw);
    this.avatar.updateMotion(dt, 'sit');
    this.avatar.root.updateMatrixWorld(true);
    const pelvis = this.avatar.root.getObjectByName('avatar:pelvis');
    if (!pelvis) return;
    this.seatedPelvis.setFromObject(pelvis);
    this.avatar.root.position.y += seatTop - this.seatedPelvis.min.y;
  }

  private updateSports(dt: number): void {
    const sports = this.sports!;
    this.avatar.setFirstPerson(false);
    if (sports.state.golf) {
      sports.golf!.update(sports.state.golf, dt);
      if (sports.cupCuePending && !sports.golf!.rolling) { this.audio.playActivitySound('golf_cup'); sports.cupCuePending = false; }
      const playingHole = sports.golf!.rolling ? sports.state.golf.lastShot?.hole ?? sports.state.golf.hole : sports.state.golf.hole;
      const hole = MINI_GOLF_HOLES[playingHole]!;
      const y = cityHeightAt(hole.center.x, hole.center.z);
      this.camera.camera.position.set(hole.center.x - 1, y + 8, hole.center.z - 5);
      this.camera.camera.lookAt(hole.center.x, y, hole.center.z);
    } else if (sports.state.badminton) {
      sports.badminton!.update(sports.state.badminton, sports.serverNow + performance.now() - sports.receivedAt);
      const y = cityHeightAt(232, 82);
      this.camera.camera.position.set(232, y + 12, 85);
      this.camera.camera.lookAt(232, y + 1, 82);
    } else if (sports.state.picnic) {
      const mat = sports.state.picnic.mat;
      const x = 168 + (mat?.x ?? 0), z = 122 + (mat?.z ?? 0), y = cityHeightAt(x, z);
      // Guests settle around the laid mat, each at their own place in the circle.
      const guest = this.localUserId ? sports.state.picnic.participants.indexOf(this.localUserId) : -1;
      if (mat && guest >= 0) {
        const angle = Math.PI * 2 * guest / Math.max(2, sports.state.picnic.participants.length) + Math.PI / 4;
        const seatX = x + Math.cos(angle) * 1.05, seatZ = z + Math.sin(angle) * 1.05;
        this.seatAvatar(seatX, seatZ, cityHeightAt(seatX, seatZ) + 0.08, Math.atan2(seatX - x, seatZ - z), dt);
      }
      this.camera.camera.position.set(x - 3.8, y + 4.1, z - 4.4);
      this.camera.camera.lookAt(x, y + 0.15, z);
    } else if (sports.state.cafe) {
      const { x, z } = CAFE_PRESENTATION_CENTER;
      const y = cityHeightAt(x, z);
      const seat = this.localUserId ? sports.state.cafe.seats[this.localUserId] : undefined;
      const chair = seat ? cafeSeatTransform(seat) : null;
      if (chair) this.seatAvatar(chair.x, chair.z, chair.seatTop, chair.yaw, dt);
      this.camera.camera.position.set(x + 5, y + 4.2, z - 4.5);
      this.camera.camera.lookAt(x, y + 0.9, z);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.transportOuting?.runtime.dispose();
    this.clearSports();
    this.ambientLeisure?.dispose(); this.ambientLeisure = null;
    this.disposed = true;
    this.microActions.cancel(this.player);
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onAudioVisibility);
    window.removeEventListener('blur', this.onAudioBlur);
    window.removeEventListener('focus', this.onAudioVisibility);
    this.input.disable();
    this.debug.dispose();
    this.audio.dispose();
    this.weather.dispose();
    this.lighting.dispose();
    this.grass?.dispose();
    this.grass = null;
    this.storyMarker?.dispose();
    this.storyMarker = null;
    this.movingBoxes?.dispose();
    this.movingBoxes = null;
    this.npcs.dispose();
    this.namedNpcs.dispose();
    this.voice?.dispose();
    this.voice = null;
    this.network?.disconnect();
    this.network = null;
    this.remotePlayers.dispose();
    this.interactions.dispose();
    this.worldStreamer.dispose();
    this.homeDecor.dispose();
    this.player.dispose();
    this.physics.dispose();
    this.avatar.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }

  private launchKayak(): void {
    const x = KAYAK_LAUNCH_POSITION.x;
    const z = KAYAK_LAUNCH_POSITION.z;
    const position = new THREE.Vector3(x, KAYAK_PLAYER_SUPPORT_Y, z);
    this.player.setWorldPosition(position);
    this.worldStreamer.refreshNow(position);
    this.player.setTransportMode('kayak');
  }

  private returnKayakToHut(): void {
    const x = KAYAK_RETURN_POSITION.x;
    const z = KAYAK_RETURN_POSITION.z;
    const position = new THREE.Vector3(x, cityHeightAt(x, z) + 1.1, z);
    this.player.setWorldPosition(position);
    this.worldStreamer.refreshNow(position);
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    if (this.disposed) return;
    if (this.previousFrameTimestamp !== null) this.performance.recordFrame(timestamp - this.previousFrameTimestamp);
    this.previousFrameTimestamp = timestamp;
    this.loop.frame(timestamp);
    this.animationFrame = requestAnimationFrame(this.onAnimationFrame);
  };

  private update(deltaSeconds: number): void {
    const start = performance.now();
    const input = this.input.consumeSnapshot(deltaSeconds);
    if (input.cameraTogglePressed) this.camera.toggle();
    // A friendly ring while riding; on foot the key does nothing.
    if (input.bellPressed && this.player.getTransportMode() === 'bicycle') this.audio.playActivitySound('cycle_bell');
    this.camera.applyLook(input.lookDeltaX, input.lookDeltaY);
    this.firstSessionLook += Math.abs(input.lookDeltaX) + Math.abs(input.lookDeltaY);
    if (this.firstSessionLook >= 30) this.reportFirstSessionAction('look');
    this.player.setInput(input);
    if (this.autoRide) this.updateAutoRide(deltaSeconds);
    this.measureSystem('player', () => this.player.syncVisual(this.camera.yaw, deltaSeconds));
    this.avatar.updateGaze(this.camera.yaw, this.camera.pitch, deltaSeconds);
    this.measureSystem('camera', () => {
      if (this.sports) this.updateSports(deltaSeconds);
      else this.camera.update(deltaSeconds, this.player.isMoving(), this.player.isJogging());
    });
    const playerPosition = this.player.getPosition();
    this.sampleTransportOuting(deltaSeconds);
    if (this.firstSessionPosition && this.player.isMoving() && this.player.getTransportMode() === 'on_foot') {
      const distance = Math.hypot(playerPosition.x - this.firstSessionPosition.x, playerPosition.z - this.firstSessionPosition.z);
      if (distance < 1) this.firstSessionWalk += distance;
      if (this.firstSessionWalk >= 1.5) this.reportFirstSessionAction('walk');
    }
    this.firstSessionPosition = { x: playerPosition.x, z: playerPosition.z };
    if (input.transportDismountPressed && this.transportOuting) this.finishTransportOuting();
    else if (input.transportDismountPressed && this.player.getTransportMode() !== 'on_foot') {
      const previousMode = this.player.getTransportMode();
      this.player.setTransportMode('on_foot');
      if (previousMode === 'kayak') this.returnKayakToHut();
      this.interactions.setEnabled(true);
      this.onInteractionPrompt?.(null);
    }
    if (this.microActions.isActive()) {
      this.microActions.update(deltaSeconds, input.interactPressed, this.player);
    } else {
      const interaction = this.interactions.update({ x: playerPosition.x, z: playerPosition.z, yaw: this.camera.yaw });
      if (input.interactPressed && interaction) {
        let interactionSucceeded = true;
        if (interaction.id === 'home_cooking' || interaction.id.endsWith(':cooking')) {
          this.player.beginMicroAction('point', 0.5);
          this.onKitchenInteraction?.();
        } else if (interaction.id === 'home_plans' || interaction.id.endsWith(':plans')) {
          this.player.beginMicroAction('point', 0.6);
          this.onHomeGrowthInteraction?.();
        } else if (interaction.id.startsWith('auto-stand:')) {
          this.player.beginMicroAction('point', 0.6);
          this.onAutoStand?.();
        } else if (interaction.npcId) {
          this.player.beginMicroAction('nod', 0.7);
          this.onNpcInteraction?.(interaction.npcId);
        } else if (interaction.id.startsWith('venue:')) {
          const venue = AMAYA_BAY_VENUES.find((candidate) => `venue:${candidate.id}` === interaction.id);
          if (venue) {
            this.player.beginMicroAction('point', 0.7);
            this.onVenueInteraction?.({ venueId: venue.id, displayName: venue.displayName, role: venueGameplayRole(venue.category) });
          } else interactionSucceeded = false;
        } else if (interaction.id === 'bicycle_rack' || interaction.transportMode) {
          const mode = interaction.id === 'bicycle_rack' ? 'bicycle' : interaction.transportMode!;
          if (mode === 'kayak' && !weatherAllowsKayak(this.weather.state)) {
            interactionSucceeded = false;
            this.onMoment?.('The kayak hut is closed in heavy weather. The bay will be here tomorrow.');
          } else {
            if (interaction.activityId) this.onActivityInteraction?.(interaction.activityId);
            else {
              if (mode === 'kayak') this.launchKayak();
              else this.player.setTransportMode(mode);
              this.interactions.setEnabled(false);
              this.onInteractionPrompt?.(`X · Dismount ${mode === 'bicycle' ? 'bicycle' : mode}`);
            }
          }
        } else if (interaction.sequence) {
          this.interactions.setEnabled(false);
          this.microActions.start({ id: interaction.id, label: interaction.label, sequence: interaction.sequence, ...(interaction.completionAction ? { completionAction: interaction.completionAction } : {}) }, this.player);
        } else {
          this.player.beginMicroAction(interaction.action, interaction.durationSeconds ?? 1.25);
          if (interaction.activityId) this.onActivityInteraction?.(interaction.activityId);
        }
        if (interactionSucceeded) this.reportFirstSessionAction('interact');
      }
    }
    this.locationElapsed += deltaSeconds;
    if (this.locationElapsed >= 0.4) {
      this.locationElapsed = 0;
      const subarea = subareaAtPosition(playerPosition.x, playerPosition.z);
      const location = subarea?.displayName ?? null;
      if (location !== this.lastLocation) { this.lastLocation = location; this.onLocationChange?.(location); }
    }

    this.gameMinutes = (this.gameMinutes + realSecondsToGameMinutes(deltaSeconds)) % 1440;
    this.materials.setTime(this.gameMinutes);
    this.measureSystem('lighting', () => this.lighting.update(this.gameMinutes, this.avatar.root.position, this.weather.wetness, this.weather.atmosphere));
    this.measureSystem('weather', () => this.weather.update(deltaSeconds, this.avatar.root.position));
    this.measureSystem('grass', () => this.updateGrass(deltaSeconds));
    if (this.storyMarker) {
      this.storyMarker.update(deltaSeconds);
      if (this.storyArrival && this.storyMarker.reached(this.avatar.root.position)) {
        const arrive = this.storyArrival;
        this.storyArrival = null;
        arrive();
      }
    }
    // Each blade entry splashes once; resting or leaving the kayak resets the rhythm.
    const stroke = this.player.getTransportMode() === 'kayak' ? this.avatar.getPaddleStrokeSerial() : null;
    if (stroke !== null && this.lastPaddleStroke !== null && stroke > this.lastPaddleStroke) this.audio.playActivitySound('paddle');
    this.lastPaddleStroke = stroke;
    this.measureSystem('ambient-npcs', () => this.npcs.update(deltaSeconds, this.avatar.root.position, Math.max(0, (this.weather.wetness - 0.3) / 0.6)));
    this.measureSystem('named-npcs', () => this.namedNpcs.update(deltaSeconds, this.gameMinutes, this.avatar.root.position));
    this.measureSystem('streaming', () => this.worldStreamer.update(deltaSeconds, this.avatar.root.position));
    this.measureSystem('remote-players', () => this.remotePlayers.update(deltaSeconds));
    if (this.voice) {
      for (const userId of this.remotePlayers.userIds()) {
        const remote = this.remotePlayers.getPosition(userId);
        if (remote) this.voice.setPeerDistance(userId, remote.distanceTo(this.avatar.root.position));
      }
    }
    this.networkElapsed += deltaSeconds;
    if (this.network && this.networkElapsed >= 1 / 15) {
      this.networkElapsed = 0;
      const position = playerPosition;
      this.network.sendSnapshot({
        seq: this.networkSeq++,
        sentAt: performance.now(),
        position,
        yaw: this.player.presentationYaw(this.camera.yaw),
        animation: this.player.animationTag(),
        transport: networkTransport(this.player.getTransportMode()),
      });
    }
    const district = districtAtPosition(playerPosition.x, playerPosition.z);
    const indoors = Math.hypot(playerPosition.x - this.homeCenter.x, playerPosition.z - this.homeCenter.z) <= this.homeReserveRadius * 0.62;
    this.audio.setDistrictContext(district?.id, this.weather.state, indoors);
    this.audio.setMusicContext({ gameMinutes: this.gameMinutes, weather: this.weather.state, indoors, ...(district ? { districtId: district.id } : {}) });
    this.audio.update();

    this.measureSystem('render', () => this.renderer.renderFrame(this.scene, this.camera.camera));
    const info = this.renderer.renderer.info.render;
    this.performance.recordRenderer(info.calls, info.triangles);
    this.performance.recordCpuFrame(performance.now() - start);
    this.sceneMetricsElapsed += deltaSeconds;
    if (this.sceneMetricsElapsed >= 0.25) {
      this.sceneMetricsElapsed = 0;
      this.recordSceneMetrics();
    }
    this.applyVisualBudget(this.adaptiveQuality.sample(this.performance.read()));
    this.debug.update(deltaSeconds, {
      weather: this.weather.state,
      gameTime: formatGameTime(this.gameMinutes),
      cameraMode: this.camera.mode,
      playerPosition,
      remotePlayers: this.remotePlayers.userIds().flatMap((userId) => {
        const position = this.remotePlayers.getPosition(userId);
        return position ? [{ userId, position: { x: position.x, y: position.y, z: position.z } }] : [];
      }),
    });
  }

  private measureSystem<T>(name: string, operation: () => T): T {
    const started = performance.now();
    try { return operation(); } finally { this.performance.recordSystem(name, performance.now() - started); }
  }

  private recordSceneMetrics(): void {
    const geometries = new Set<string>();
    const materials = new Set<string>();
    let meshes = 0; let instancedMeshes = 0; let instances = 0;
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      meshes += 1;
      geometries.add(object.geometry.uuid);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) materials.add(material.uuid);
      if (object instanceof THREE.InstancedMesh) { instancedMeshes += 1; instances += object.count; }
    });
    this.performance.recordSceneResources({ meshes, instancedMeshes, instances, geometries: geometries.size, materials: materials.size, colliders: this.physics.getActiveColliderCount() });
  }

  private updateGrass(deltaSeconds: number): void {
    if (!this.grass) {
      this.grass = new GrassField({
        // Planted ground only: not on paving, sand, streets, routes or the home plot.
        accepts: (x, z) => {
          if (!isInsideAmayaBay(x, z)) return false;
          const district = districtAtPosition(x, z)?.id;
          if (district === 'the_common' || district === 'bay_steps') return false;
          if (this.homeReserveRadius > 0 && Math.hypot(x - this.homeCenter.x, z - this.homeCenter.z) < this.homeReserveRadius) return false;
          // The Lantern hero street paves its own 17 m roadway and wide sidewalks.
          if (Math.abs(x + 30) <= 12.6 && Math.abs(z - 75) <= 60) return false;
          // Only drawn surface routes matter; roads keep a wider margin so sidewalks stay clear.
          const nearest = nearestAmayaBaySurfaceRoute(x, z);
          return !nearest || nearest.distance >= nearest.route.width / 2 + (nearest.route.kind === 'road' ? 2.3 : 0.9);
        },
        heightAt: cityHeightAt,
      });
      this.grass.setDensity(this.grassDensity);
      this.scene.add(this.grass.root);
    }
    this.grassElapsed += deltaSeconds;
    this.grass.update(this.avatar.root.position, this.grassElapsed, this.weather.atmosphere.wind);
  }

  private applyVisualBudget(budget: AdaptiveVisualBudget): void {
    // Grass is nearly free on the CPU, so Low keeps a thinner meadow rather than bare lawns.
    this.grassDensity = budget.shadowsEnabled ? Math.min(1, budget.vegetationScale) : 0.35;
    this.grass?.setDensity(this.grassDensity);
    this.renderer.setPixelRatioCap(budget.pixelRatioCap, budget.resolutionScale);
    this.renderer.setShadowsEnabled(budget.shadowsEnabled);
    this.renderer.setPostEffectsEnabled(budget.shadowsEnabled);
    this.lighting.setShadowScale(budget.shadowScale);
    this.worldStreamer.setVegetationScale(budget.vegetationScale);
    this.worldStreamer.setResidencyRadiusChunks(budget.streamRadiusChunks);
  }

  private updateAutoRide(deltaSeconds: number): void {
    const ride = this.autoRide;
    if (!ride) return;
    ride.elapsed += deltaSeconds;
    const t = Math.min(1, ride.elapsed / Math.max(0.001, ride.duration));
    const eased = t * t * (3 - 2 * t);
    const point = sampleAutoRideRoute(ride.route, eased);
    this.player.setWorldPosition({ x: point.x, y: cityHeightAt(point.x, point.z) + 1.1, z: point.z });
    // Ease the view toward the direction of travel, like turning to look down the road.
    const lookYaw = point.heading + Math.PI;
    const turn = Math.atan2(Math.sin(lookYaw - this.camera.yaw), Math.cos(lookYaw - this.camera.yaw));
    this.camera.yaw += turn * (1 - Math.exp(-deltaSeconds * 2.5));
    if (t >= 1) this.finishAutoRide();
  }

  private finishAutoRide(): void {
    this.autoRide = null;
    this.player.setTransportMode('on_foot');
    this.player.setInteractionLock(false);
    this.interactions.setEnabled(true);
    this.onInteractionPrompt?.(null);
  }

  private fixedUpdate(deltaSeconds: number): void {
    this.player.fixedUpdate(deltaSeconds, this.camera.yaw);
    this.measureSystem('physics', () => this.physics.step());
    if (this.transportOuting?.ready) this.transportOuting.physicsElapsed += deltaSeconds;
  }

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.camera.resize(width, height);
  };

  private readonly onAudioVisibility = (): void => { this.audio.setSuspended(document.hidden); };
  private readonly onAudioBlur = (): void => { this.audio.setSuspended(true); };

  private readonly onFirstGesture = (): void => {
    void this.audio.unlock();
    this.audio.setZone('lantern_street');
  };
}


function locationInteraction(
  locationId: string,
  label: string,
  action: WorldInteraction['action'],
  radius: number,
  priority: number,
  extras: Pick<WorldInteraction, 'activityId' | 'transportMode'> = {},
): WorldInteraction {
  const anchor = locationAnchor(locationId);
  if (!anchor) throw new Error(`Missing authored Amaya Bay anchor: ${locationId}`);
  return { id: `activity:${locationId}`, label, action, x: anchor.position.x, z: anchor.position.z, radius, priority, durationSeconds: 2.2, ...extras };
}

function formatGameTime(minutes: number): string {
  const normalized = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60).toString().padStart(2, '0');
  const minute = (normalized % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function anchorInteraction(anchors: Map<string, THREE.Vector3>, id: string, label: string, action: WorldInteraction['action'], radius: number, priority: number, durationSeconds: number): WorldInteraction {
  const position = anchors.get(id);
  if (!position) throw new Error(`Missing interaction anchor: ${id}`);
  return { id, label, action, x: position.x, z: position.z, radius, priority, durationSeconds };
}

function venueInteractionLabel(category: (typeof AMAYA_BAY_VENUES)[number]['category'], name: string): string {
  if (category === 'grocery') return `Shop at ${name}`;
  if (category === 'cafe' || category === 'food' || category === 'bakery') return `Visit ${name}`;
  if (category === 'repair') return `Talk to ${name}`;
  if (category === 'plants') return `Browse ${name}`;
  return `Enter ${name}`;
}


function jobActionToAvatarAction(action: string): Exclude<AvatarAction, 'idle' | 'walk' | 'jog'> {
  const actions: Record<string, Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>> = {
    take_order: 'point', grind: 'stir', brew: 'pour', heat_milk: 'stir', serve: 'hand_over', wipe: 'wipe',
    carry_crate: 'carry', restock: 'place', bag: 'carry', clean_spill: 'wipe',
    collect: 'pick_up', load_carrier: 'place', ride: 'cycle', handover: 'hand_over',
    water: 'water', repot: 'place', sweep: 'wipe', arrange: 'place', prune: 'cut',
    type: 'type', plan: 'point', arrange_documents: 'place', focus: 'type',
  };
  return actions[action] ?? 'point';
}

function cookingActionToAvatarAction(action: RecipeAction): Exclude<AvatarAction, 'idle' | 'walk' | 'jog'> {
  const actions: Record<RecipeAction, Exclude<AvatarAction, 'idle' | 'walk' | 'jog'>> = {
    wash: 'wash', cut: 'cut', measure: 'place', boil: 'stir', fry: 'stir', stir: 'stir', pour: 'pour', plate: 'place', serve: 'hand_over',
  };
  return actions[action];
}

function reportVoiceError(error: unknown): void {
  console.warn('[Together voice]', error);
}

function networkTransport(mode: 'on_foot' | 'bicycle' | 'scooter' | 'kayak' | 'auto_rickshaw'): 'walking' | 'bicycle' | 'scooter' | 'kayak' | 'auto' {
  if (mode === 'on_foot') return 'walking';
  if (mode === 'auto_rickshaw') return 'auto';
  return mode;
}

/** A stable lane (-2..2) per user so co-arriving players usually stand apart. */
function memberSpawnLane(userId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) hash = Math.imul(hash ^ userId.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 5) - 2;
}
