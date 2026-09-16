import * as THREE from 'three';
import { AMAYA_BAY_VENUES, AUTO_DESTINATIONS, autoRideSeconds, avatarAppearanceFromConfig, cityHeightAt, districtAtPosition, locationAnchor, realSecondsToGameMinutes, subareaAtPosition, venueGameplayRole, type ActivityId, type AvatarAction, type AvatarConfig, type GameSettings, type HomeAction, type Placement2D, type VenueGameplayRole, type RecipeAction } from '@together/shared';
import { Renderer } from './core/Renderer';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { MaterialLibrary } from './world/MaterialLibrary';
import { buildLanternStreetHero } from './world/HeroStreet';
import { AmayaBayEnvironment } from './world/AmayaBayEnvironment';
import { WorldStreamer } from './world/WorldStreamer';
import { createAmayaBayChunkFactory } from './world/AmayaBayChunkFactory';
import { PlayerAvatar } from './player/PlayerAvatar';
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
import { GameSocketClient, type NetworkSession } from '../network/GameSocketClient';
import { VoiceManager } from '../network/voice/VoiceManager';
import type { VoiceMode } from '@together/shared';
import { weatherAllowsKayak, type WeatherState } from './weather/weatherModel';
import { InteractionSystem, type WorldInteraction } from './interaction/InteractionSystem';
import { buildPropertyInterior } from './world/PropertyInterior';
import { MicroActionRuntime } from './interaction/MicroActionRuntime';
import { HomeDecorationRenderer, type HomeObjectView } from './world/HomeDecorationRenderer';
import { namedNpcs as namedNpcDefinitions } from '@together/content';

export type GameEngineOptions = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  initialWeather?: WeatherState;
  initialGameMinutes?: number;
  networkSession?: NetworkSession;
  onConnectionState?: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  onNetworkError?: (message: string) => void;
  onInteractionPrompt?: (prompt: string | null) => void;
  onLocationChange?: (location: string | null) => void;
  onDomesticAction?: (action: HomeAction, interactionId: string) => void;
  onVoiceState?: (state: { mode: VoiceMode; muted: boolean; pushToTalk: boolean }) => void;
  onMoment?: (message: string) => void;
  onVenueInteraction?: (venue: { venueId: string; displayName: string; role: VenueGameplayRole }) => void;
  onKitchenInteraction?: () => void;
  onAutoStand?: () => void;
  onMemoryOpportunity?: (tag: string) => void;
  onActivityInteraction?: (activityId: ActivityId) => void;
  onNpcInteraction?: (npcId: string) => void;
  onHomeGrowthInteraction?: () => void;
  avatarConfig?: AvatarConfig;
  propertyId?: string;
};

export class GameEngine {
  readonly performance: PerformanceMonitor;

  private animationFrame = 0;
  private gameMinutes: number;
  private disposed = false;
  private readonly loop: GameLoop;
  private readonly input: InputManager;
  private readonly debug: DebugOverlay;
  private readonly audio = new AudioZoneManager();
  private readonly remotePlayers = new RemotePlayerSystem();
  private network: GameSocketClient | null = null;
  private voice: VoiceManager | null = null;
  private networkElapsed = 0;
  private networkSeq = 0;
  private locationElapsed = Number.POSITIVE_INFINITY;
  private sceneMetricsElapsed = Number.POSITIVE_INFINITY;
  private lastLocation: string | null = null;
  private homeCenter = { x: 0, z: 0 };
  private homeReserveRadius = 0;
  private autoRide: { start: THREE.Vector3; end: THREE.Vector3; elapsed: number; duration: number } | null = null;
  private adaptiveQuality = new AdaptiveQualityController('medium');

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
    this.input = new InputManager(canvas);
    this.debug = new DebugOverlay(container, this.performance, renderer.info);
    this.loop = new GameLoop(
      (delta) => this.update(delta),
      (fixedDelta) => this.fixedUpdate(fixedDelta),
    );
    this.scene.add(this.remotePlayers.root);
    if (networkSession) {
      const callbacks = {
        onPlayerSnapshot: (userId: string, snapshot: import('@together/shared').PlayerSnapshot) => this.remotePlayers.applySnapshot(userId, snapshot),
        onPlayerProfile: (userId: string, profile: import('../network/GameSocketClient').RemoteProfile) => this.remotePlayers.setProfile(userId, profile.avatarConfig),
        onPlayerLeave: (userId: string) => { this.remotePlayers.remove(userId); this.voice?.handleLeave(userId); },
        onVoiceJoin: (payload: Parameters<VoiceManager['handleJoin']>[0]) => { void this.voice?.handleJoin(payload).catch(reportVoiceError); },
        onVoiceOffer: (payload: Parameters<VoiceManager['handleOffer']>[0]) => { void this.voice?.handleOffer(payload).catch(reportVoiceError); },
        onVoiceAnswer: (payload: Parameters<VoiceManager['handleAnswer']>[0]) => { void this.voice?.handleAnswer(payload).catch(reportVoiceError); },
        onVoiceIce: (payload: Parameters<VoiceManager['handleIce']>[0]) => { void this.voice?.handleIce(payload).catch(reportVoiceError); },
        onVoiceLeave: (userId: string) => this.voice?.handleLeave(userId),
        ...(onConnectionState ? { onConnectionState } : {}),
        ...(onNetworkError ? { onError: onNetworkError } : {}),
      };
      this.network = new GameSocketClient(networkSession, callbacks);
      this.voice = new VoiceManager(networkSession.userId, this.network, onVoiceState);
    }
  }

  static async create(options: GameEngineOptions): Promise<GameEngine> {
    const renderer = await Renderer.create(options.canvas);
    const physics = await PhysicsWorld.create();
    const materials = new MaterialLibrary();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaabbb7);

    physics.createFixedCuboid({ x: 0, y: -0.25, z: 0 }, { x: 450, y: 0.6, z: 450 });
    const lanternOrigin = { x: -30, y: cityHeightAt(-30, 75), z: 75 };
    const street = buildLanternStreetHero(materials, physics, lanternOrigin);
    scene.add(street.group);
    const environment = new AmayaBayEnvironment(materials);
    scene.add(environment.root);
    const home = buildPropertyInterior(materials, physics, options.propertyId);
    scene.add(home.group);

    const localAppearance = options.avatarConfig ? avatarAppearanceFromConfig(options.avatarConfig, 'outdoor') : null;
    const avatar = new PlayerAvatar(localAppearance ? {
      height: localAppearance.height, bodyWidthScale: localAppearance.bodyWidthScale, skinTone: localAppearance.skinColor,
      shirtColor: localAppearance.shirtColor, trouserColor: localAppearance.trouserColor, hairColor: localAppearance.hairColor,
    } : {});
    scene.add(avatar.root);
    const player = new PlayerController(physics, avatar, home.spawn);
    const camera = new CameraController(avatar, window.innerWidth / Math.max(1, window.innerHeight));
    camera.addCollisionRoot(street.group);
    camera.addCollisionRoot(home.group);

    const lighting = new LightingSystem(scene);
    const weather = new WeatherSystem(scene, materials);
    weather.setState(options.initialWeather ?? 'clear');
    const npcs = new AmbientNPCSystem(32);
    scene.add(npcs.root);
    const namedNpcs = new NamedNPCSystem();
    scene.add(namedNpcs.root);
    const enginePerformance = new PerformanceMonitor();
    const worldStreamer = new WorldStreamer(createAmayaBayChunkFactory(materials, physics), enginePerformance);
    scene.add(worldStreamer.root);
    camera.addCollisionRoot(worldStreamer.root);
    const interactionDefinitions: WorldInteraction[] = [
      anchorInteraction(street.interactionAnchors, 'cafe_roshan', 'Wipe café counter', 'wipe', 2.7, 3, 1.8),
      anchorInteraction(street.interactionAnchors, 'street_bench_west', 'Sit on bench', 'sit', 2.4, 2, 2.4),
      { ...anchorInteraction(street.interactionAnchors, 'bicycle_rack', 'Take a bicycle', 'pick_up', 2.5, 2, 1.1), activityId: 'cycling' },
      anchorInteraction(street.interactionAnchors, 'street_planter', 'Water planter', 'water', 2.6, 3, 2.0),
      locationInteraction('bay_cycle_hut', 'Rent scooter', 'scooter', 3.4, 5, { transportMode: 'scooter' }),
      locationInteraction('bay_kayak_hut', 'Launch kayak', 'kayak', 4.0, 6, { transportMode: 'kayak', activityId: 'kayak' }),
      locationInteraction('park_picnic_lawn', 'Lay out a picnic', 'sit', 5.5, 3, { activityId: 'picnic' }),
      locationInteraction('park_badminton', 'Play badminton', 'high_five', 4.8, 4, { activityId: 'badminton' }),
      locationInteraction('hill_minigolf', 'Play a mini-golf hole', 'point', 4.8, 4, { activityId: 'mini_golf' }),
      locationInteraction('lantern_cafe_roshan', 'Sit for coffee', 'sit', 3.5, 3, { activityId: 'cafe_hangout' }),
      ...namedNpcDefinitions.flatMap((npc): WorldInteraction[] => {
        const anchor = locationAnchor(npc.homeOrWork);
        return anchor ? [{ id: `npc-talk:${npc.id}`, label: `Talk to ${npc.displayName}`, action: 'nod', x: anchor.position.x, z: anchor.position.z, radius: 4.0, priority: 7, durationSeconds: 0.7, npcId: npc.id }] : [];
      }),
      ...AUTO_DESTINATIONS.map((destination): WorldInteraction => ({ id: `auto-stand:${destination.id}`, label: 'Call auto-rickshaw', action: 'point', x: destination.position.x, z: destination.position.z, radius: 4.6, priority: 4, durationSeconds: 0.6 })),
      ...home.interactions,
      ...AMAYA_BAY_VENUES.map((venue): WorldInteraction => ({
        id: `venue:${venue.id}`, label: venueInteractionLabel(venue.category, venue.displayName), action: 'point',
        x: venue.position.x, z: venue.position.z, radius: Math.max(3.2, venue.frontageMetres * 0.55), priority: venue.hero ? 5 : 3, durationSeconds: 0.7,
      })),
    ];
    const interactions = new InteractionSystem(interactionDefinitions, options.onInteractionPrompt);
    const microActions = new MicroActionRuntime(
      options.onInteractionPrompt,
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
    return engine;
  }

  start(): void {
    this.input.enable();
    this.canvas.addEventListener('pointerdown', this.onFirstGesture, { once: true });
    window.addEventListener('resize', this.onResize);
    this.network?.connect();
    this.loop.reset();
    this.animationFrame = requestAnimationFrame(this.onAnimationFrame);
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

  setInputEnabled(enabled: boolean): void {
    if (enabled) this.input.enable();
    else this.input.disable();
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

  async captureFrame(quality = 0.86): Promise<Blob> {
    this.measureSystem('render', () => this.renderer.renderer.render(this.scene, this.camera.camera));
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
      this.finishAutoRide();
      return;
    }
    this.autoRide = { start: new THREE.Vector3(current.x, current.y, current.z), end, elapsed: 0, duration: autoRideSeconds(distance) };
    this.onMoment?.(`Auto ride · ${destination.displayName}`);
  }

  playContextAction(action: string): void {
    const mapped = jobActionToAvatarAction(action);
    this.player.beginMicroAction(mapped, mapped === 'carry' || mapped === 'cycle' ? 1.8 : 1.25, true);
  }

  playCookingAction(action: RecipeAction): void {
    const mapped = cookingActionToAvatarAction(action);
    this.player.beginMicroAction(mapped, action === 'boil' || action === 'fry' ? 1.8 : 1.35, true);
  }

  playActivityAction(action: AvatarAction): void {
    if (action === 'cycle') { this.player.setTransportMode('bicycle'); return; }
    if (action === 'kayak') { this.player.setTransportMode('kayak'); return; }
    if (action === 'walk' || action === 'jog' || action === 'idle') return;
    this.player.beginMicroAction(action, action === 'sit' ? 2.2 : 1.25, true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.onResize);
    this.input.disable();
    this.debug.dispose();
    this.audio.dispose();
    this.weather.dispose();
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
    this.avatar.dispose();
    this.materials.dispose();
    this.renderer.dispose();
  }

  private readonly onAnimationFrame = (timestamp: number): void => {
    if (this.disposed) return;
    this.loop.frame(timestamp);
    this.animationFrame = requestAnimationFrame(this.onAnimationFrame);
  };

  private update(deltaSeconds: number): void {
    const start = performance.now();
    const input = this.input.consumeSnapshot();
    if (input.cameraTogglePressed) this.camera.toggle();
    this.camera.applyLook(input.lookDeltaX, input.lookDeltaY);
    this.player.setInput(input);
    if (this.autoRide) this.updateAutoRide(deltaSeconds);
    this.measureSystem('player', () => this.player.syncVisual(this.camera.yaw, deltaSeconds));
    this.measureSystem('camera', () => this.camera.update(deltaSeconds, this.player.isMoving(), this.player.isJogging()));
    const playerPosition = this.player.getPosition();
    if (input.transportDismountPressed && this.player.getTransportMode() !== 'on_foot') {
      this.player.setTransportMode('on_foot');
      this.interactions.setEnabled(true);
      this.onInteractionPrompt?.(null);
    }
    if (this.microActions.isActive()) {
      this.microActions.update(deltaSeconds, input.interactPressed, this.player);
    } else {
      const interaction = this.interactions.update({ x: playerPosition.x, z: playerPosition.z, yaw: this.camera.yaw });
      if (input.interactPressed && interaction) {
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
          }
        } else if (interaction.id === 'bicycle_rack' || interaction.transportMode) {
          const mode = interaction.id === 'bicycle_rack' ? 'bicycle' : interaction.transportMode!;
          if (mode === 'kayak' && !weatherAllowsKayak(this.weather.state)) {
            this.onMoment?.('The kayak hut is closed in heavy weather. The bay will be here tomorrow.');
          } else {
            this.player.setTransportMode(mode);
            this.interactions.setEnabled(false);
            this.onInteractionPrompt?.(`X · Dismount ${mode === 'bicycle' ? 'bicycle' : mode}`);
            if (interaction.activityId) this.onActivityInteraction?.(interaction.activityId);
          }
        } else if (interaction.sequence) {
          this.interactions.setEnabled(false);
          this.microActions.start({ id: interaction.id, label: interaction.label, sequence: interaction.sequence, ...(interaction.completionAction ? { completionAction: interaction.completionAction } : {}) }, this.player);
        } else {
          this.player.beginMicroAction(interaction.action, interaction.durationSeconds ?? 1.25);
          if (interaction.activityId) this.onActivityInteraction?.(interaction.activityId);
        }
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
    this.measureSystem('lighting', () => this.lighting.update(this.gameMinutes, this.avatar.root.position));
    this.measureSystem('weather', () => this.weather.update(deltaSeconds, this.avatar.root.position));
    this.measureSystem('ambient-npcs', () => this.npcs.update(deltaSeconds, this.avatar.root.position));
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
        yaw: this.camera.yaw,
        animation: this.player.animationTag(),
        transport: networkTransport(this.player.getTransportMode()),
      });
    }
    const district = districtAtPosition(playerPosition.x, playerPosition.z);
    const indoors = Math.hypot(playerPosition.x - this.homeCenter.x, playerPosition.z - this.homeCenter.z) <= this.homeReserveRadius * 0.62;
    this.audio.setMusicContext({ gameMinutes: this.gameMinutes, weather: this.weather.state, indoors, ...(district ? { districtId: district.id } : {}) });
    this.audio.update();

    this.measureSystem('render', () => this.renderer.renderer.render(this.scene, this.camera.camera));
    const info = this.renderer.renderer.info.render;
    this.performance.recordRenderer(info.calls, info.triangles);
    this.performance.recordFrame(performance.now() - start);
    this.sceneMetricsElapsed += deltaSeconds;
    if (this.sceneMetricsElapsed >= 0.25) {
      this.sceneMetricsElapsed = 0;
      this.recordSceneMetrics();
    }
    this.applyVisualBudget(this.adaptiveQuality.sample(this.performance.read()));
    this.debug.update(deltaSeconds, { weather: this.weather.state, gameTime: formatGameTime(this.gameMinutes) });
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

  private applyVisualBudget(budget: AdaptiveVisualBudget): void {
    this.renderer.setPixelRatioCap(budget.pixelRatioCap);
    this.renderer.setShadowsEnabled(budget.shadowsEnabled);
    this.worldStreamer.setResidencyRadiusChunks(budget.streamRadiusChunks);
  }

  private updateAutoRide(deltaSeconds: number): void {
    const ride = this.autoRide;
    if (!ride) return;
    ride.elapsed += deltaSeconds;
    const t = Math.min(1, ride.elapsed / Math.max(0.001, ride.duration));
    const eased = t * t * (3 - 2 * t);
    const point = ride.start.clone().lerp(ride.end, eased);
    this.player.setWorldPosition({ x: point.x, y: point.y, z: point.z });
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
  }

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.camera.resize(width, height);
  };

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


function jobActionToAvatarAction(action: string): Exclude<import('@together/shared').AvatarAction, 'idle' | 'walk' | 'jog'> {
  const actions: Record<string, Exclude<import('@together/shared').AvatarAction, 'idle' | 'walk' | 'jog'>> = {
    take_order: 'point', grind: 'stir', brew: 'pour', heat_milk: 'stir', serve: 'hand_over', wipe: 'wipe',
    carry_crate: 'carry', restock: 'place', bag: 'carry', clean_spill: 'wipe',
    collect: 'pick_up', load_carrier: 'place', ride: 'cycle', handover: 'hand_over',
    water: 'water', repot: 'place', sweep: 'wipe', arrange: 'place', prune: 'cut',
    type: 'type', plan: 'point', arrange_documents: 'place', focus: 'type',
  };
  return actions[action] ?? 'point';
}

function cookingActionToAvatarAction(action: RecipeAction): Exclude<import('@together/shared').AvatarAction, 'idle' | 'walk' | 'jog'> {
  const actions: Record<RecipeAction, Exclude<import('@together/shared').AvatarAction, 'idle' | 'walk' | 'jog'>> = {
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
