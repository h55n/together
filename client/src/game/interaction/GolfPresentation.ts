import * as THREE from 'three';
import { cityHeightAt, GOLF_BALL_RADIUS, MINI_GOLF_HOLES, type GolfPoint, type GolfRound, type GolfShotReceipt } from '@together/shared';

/** Owns only its meshes. Disposing an old view cannot touch a successor. */
export class GolfPresentation {
  readonly group = new THREE.Group();
  private balls = new Map<string, THREE.Mesh>();
  private geometry = new THREE.SphereGeometry(GOLF_BALL_RADIUS, 16, 12);
  private aim = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.2, 0xffcc65);
  private revision = -1;
  private receipt: GolfShotReceipt | undefined;
  private elapsed = 0;
  private dead = false;
  private angle = 0;
  private power = 0.5;
  private priorRound: GolfRound | undefined;
  private replayBalls: Record<string, GolfPoint> = {};
  constructor(scene: THREE.Scene) {
    this.aim.line.geometry = this.aim.line.geometry.clone();
    this.aim.cone.geometry = this.aim.cone.geometry.clone();
    this.group.name = 'owned-golf-presentation';
    this.group.add(this.aim); scene.add(this.group);
  }
  get rolling(): boolean { return !!this.receipt && this.elapsed < (this.receipt.result.trace.at(-1)?.seconds ?? 0); }
  setAim(angle: number, power: number): void { if (!this.dead && Number.isFinite(angle) && Number.isFinite(power)) { this.angle = angle; this.power = power; } }
  update(round: GolfRound, dt: number): void {
    if (this.dead || round.revision < this.revision) return;
    if (round.revision > this.revision) {
      this.replayBalls = this.priorRound?.balls ?? round.balls;
      this.receipt = this.revision >= 0 ? round.lastShot : undefined;
      this.elapsed = 0; this.revision = round.revision;
      this.priorRound = round;
    }
    this.elapsed += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const receipt = this.receipt;
    // Keep the just-played green visible through capture before advancing.
    const hole = MINI_GOLF_HOLES[this.rolling && receipt ? receipt.hole : round.hole]!;
    for (const userId of round.players) {
      let mesh = this.balls.get(userId);
      if (!mesh) {
        mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({ color: [0xffffff, 0xffce72, 0x8ce5d5, 0xc9a5ff, 0xf49cb4, 0x96c4ff][round.players.indexOf(userId)]! }));
        mesh.castShadow = true; this.balls.set(userId, mesh); this.group.add(mesh);
      }
      let point = round.balls[userId]!;
      if (this.rolling && receipt) {
        point = userId === receipt.userId ? this.tracePoint(receipt, this.elapsed) : this.replayBalls[userId] ?? hole.tee;
      }
      mesh.visible = this.rolling || !round.captured[userId];
      this.place(mesh.position, hole.center, point);
    }
    this.aim.visible = !this.rolling && round.status === 'active' && !!round.turn;
    if (round.turn) this.place(this.aim.position, hole.center, round.balls[round.turn]!);
    this.aim.setDirection(new THREE.Vector3(Math.cos(this.angle), 0, Math.sin(this.angle)));
    this.aim.setLength(0.5 + this.power * 2, 0.2, 0.12);
  }
  private tracePoint(receipt: GolfShotReceipt, elapsed: number): GolfPoint {
    const trace = receipt.result.trace;
    const index = trace.findIndex(point => point.seconds >= elapsed);
    if (index <= 0) return index === 0 ? trace[0]! : receipt.result.ball;
    const a = trace[index - 1]!, b = trace[index]!;
    const t = (elapsed - a.seconds) / Math.max(0.000001, b.seconds - a.seconds);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }
  private place(position: THREE.Vector3, center: GolfPoint, point: GolfPoint): void {
    const x = center.x + point.x, z = center.z + point.z;
    position.set(x, cityHeightAt(x, z) + GOLF_BALL_RADIUS + 0.04, z);
  }
  dispose(): void {
    if (this.dead) return;
    this.dead = true; this.group.removeFromParent();
    this.geometry.dispose();
    for (const mesh of this.balls.values()) (mesh.material as THREE.Material).dispose();
    (this.aim.line.geometry).dispose(); (this.aim.line.material as THREE.Material).dispose();
    this.aim.cone.geometry.dispose(); (this.aim.cone.material as THREE.Material).dispose();
    this.balls.clear();
  }
}
