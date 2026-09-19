import type { VoiceMode } from '@together/shared';
import type { GameSocketClient } from '../GameSocketClient';

type ActiveVoiceMode = Exclude<VoiceMode, 'off'>;

type VoicePeer = {
  connection: RTCPeerConnection;
  gain: GainNode | null;
  source: MediaStreamAudioSourceNode | null;
};

export class VoiceManager {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private readonly peers = new Map<string, VoicePeer>();
  private mode: VoiceMode = 'off';
  private muted = false;
  private pushToTalk = false;
  private pushToTalkHeld = false;
  private iceServers: RTCIceServer[] = [];

  constructor(
    private readonly selfUserId: string,
    private readonly network: GameSocketClient,
    private readonly onState?: (state: { mode: VoiceMode; muted: boolean; pushToTalk: boolean }) => void,
  ) {}

  async enable(mode: ActiveVoiceMode): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not supported by this browser');
    this.iceServers = await this.network.fetchVoiceIceServers();
    if (this.iceServers.length === 0) throw new Error('Voice network configuration is unavailable');
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    }
    this.mode = mode;
    this.applyTrackState();
    this.network.joinVoice(mode);
    this.emitState();
  }

  disable(): void {
    this.network.leaveVoice();
    this.mode = 'off';
    for (const userId of [...this.peers.keys()]) this.removePeer(userId);
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.emitState();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyTrackState();
    this.network.sendVoiceMuteState(muted);
    this.emitState();
  }

  setPushToTalk(enabled: boolean): void {
    this.pushToTalk = enabled;
    this.applyTrackState();
    this.emitState();
  }

  setPushToTalkHeld(held: boolean): void {
    this.pushToTalkHeld = held;
    this.applyTrackState();
  }

  async handleJoin(payload: { userId?: string; peers?: string[]; mode: ActiveVoiceMode }): Promise<void> {
    if (this.mode === 'off') return;
    const peerIds = [...(payload.peers ?? []), ...(payload.userId ? [payload.userId] : [])];
    for (const peerId of new Set(peerIds)) {
      if (peerId === this.selfUserId || this.selfUserId.localeCompare(peerId) > 0) continue;
      await this.createOffer(peerId);
    }
  }

  async handleOffer(payload: { sourceUserId: string; sdp: string; mode: ActiveVoiceMode }): Promise<void> {
    if (this.mode === 'off') return;
    const peer = this.ensurePeer(payload.sourceUserId);
    await peer.connection.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);
    if (answer.sdp) this.network.sendVoiceAnswer(payload.sourceUserId, answer.sdp);
  }

  async handleAnswer(payload: { sourceUserId: string; sdp: string }): Promise<void> {
    const peer = this.peers.get(payload.sourceUserId);
    if (!peer) return;
    await peer.connection.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
  }

  async handleIce(payload: { sourceUserId: string; candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }): Promise<void> {
    const peer = this.ensurePeer(payload.sourceUserId);
    await peer.connection.addIceCandidate({ candidate: payload.candidate, sdpMid: payload.sdpMid, sdpMLineIndex: payload.sdpMLineIndex });
  }

  handleLeave(userId: string): void { this.removePeer(userId); }

  setPeerDistance(userId: string, distanceMetres: number): void {
    const peer = this.peers.get(userId);
    if (!peer?.gain) return;
    const gain = this.mode === 'proximity'
      ? Math.max(0, Math.min(1, 1 - Math.max(0, distanceMetres - 1.5) / 18))
      : 1;
    peer.gain.gain.setTargetAtTime(gain, this.audioContext?.currentTime ?? 0, 0.08);
  }

  dispose(): void { this.disable(); }

  private async createOffer(userId: string): Promise<void> {
    const peer = this.ensurePeer(userId);
    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);
    if (offer.sdp && this.mode !== 'off') this.network.sendVoiceOffer(userId, offer.sdp, this.mode);
  }

  private ensurePeer(userId: string): VoicePeer {
    const existing = this.peers.get(userId);
    if (existing) return existing;
    const connection = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: VoicePeer = { connection, gain: null, source: null };
    this.peers.set(userId, peer);
    for (const track of this.localStream?.getAudioTracks() ?? []) connection.addTrack(track, this.localStream!);
    connection.onicecandidate = (event) => { if (event.candidate) this.network.sendVoiceIce(userId, event.candidate); };
    connection.ontrack = (event) => this.attachRemoteAudio(peer, event.streams[0] ?? new MediaStream([event.track]));
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') this.removePeer(userId);
    };
    return peer;
  }

  private attachRemoteAudio(peer: VoicePeer, stream: MediaStream): void {
    this.audioContext ??= new AudioContext();
    peer.source?.disconnect();
    peer.gain?.disconnect();
    peer.source = this.audioContext.createMediaStreamSource(stream);
    peer.gain = this.audioContext.createGain();
    peer.source.connect(peer.gain).connect(this.audioContext.destination);
  }

  private removePeer(userId: string): void {
    const peer = this.peers.get(userId);
    if (!peer) return;
    peer.source?.disconnect();
    peer.gain?.disconnect();
    peer.connection.close();
    this.peers.delete(userId);
  }

  private applyTrackState(): void {
    const enabled = this.mode !== 'off' && !this.muted && (!this.pushToTalk || this.pushToTalkHeld);
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
  }

  private emitState(): void { this.onState?.({ mode: this.mode, muted: this.muted, pushToTalk: this.pushToTalk }); }
}
