import * as THREE from 'three';

export type GrassPlacement = { accepts(x: number, z: number): boolean; heightAt(x: number, z: number): number };

const CELL = 6;
const BLADES_PER_TUFT = 5;

/**
 * Camera-local instanced grass tufts. Purely visual: tufts never collide, and
 * each cell is scattered deterministically so revisiting a spot looks the same.
 */
type GrassCell = { tufts: THREE.Matrix4[]; flowers: Array<{ matrix: THREE.Matrix4; color: THREE.Color }> };
const FLOWER_COLORS = [0xfff6e8, 0xffd23f, 0xf27ba6, 0xe8604a, 0xb79cf2].map(hex => new THREE.Color(hex));

export class GrassField {
  readonly root = new THREE.Group();
  readonly mesh: THREE.InstancedMesh;
  private readonly flowers: THREE.InstancedMesh;
  private readonly cells = new Map<string, GrassCell>();
  private readonly time = { value: 0 };
  private readonly wind = { value: 0.3 };
  private centerKey = '';
  private density = 1;
  private pending: string[] = [];

  constructor(private readonly placement: GrassPlacement, private readonly radius = 34, private readonly maxTufts = 14000) {
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.grassTime = this.time;
      shader.uniforms.grassWind = this.wind;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float grassTime;\nuniform float grassWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 rootPos = instanceMatrix[3].xz;
            float sway = sin(grassTime * 1.7 + rootPos.x * 0.35 + rootPos.y * 0.21) + 0.45 * sin(grassTime * 3.1 + rootPos.y * 0.6);
            float bend = transformed.y * transformed.y;
            float gust = 0.6 + grassWind * 1.6;
            transformed.x += sway * 0.09 * bend * gust;
            transformed.z += sway * 0.05 * bend * gust;
          #endif`);
    };
    this.mesh = new THREE.InstancedMesh(createTuftGeometry(), material, maxTufts);
    this.mesh.name = 'grass-field';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    // Wildflower heads ride the same sway so they read as part of the meadow.
    const blossom = new THREE.IcosahedronGeometry(0.06, 0).translate(0, 0.3, 0);
    // The shared material reads vertex colours; white lets each instance colour show.
    blossom.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(blossom.getAttribute('position').count * 3).fill(1), 3));
    this.flowers = new THREE.InstancedMesh(blossom, material, Math.ceil(maxTufts / 6));
    this.flowers.name = 'grass-wildflowers';
    this.flowers.count = 0;
    this.flowers.frustumCulled = false;
    this.flowers.setColorAt(0, FLOWER_COLORS[0]!);
    this.root.name = 'grass-field-root';
    this.root.add(this.mesh, this.flowers);
  }

  /** 0 hides the field (Low quality); values up to 1 thin it for adaptive budgets. */
  setDensity(scale: number): void {
    const next = THREE.MathUtils.clamp(Number.isFinite(scale) ? scale : 1, 0, 1);
    if (next === this.density) return;
    this.density = next;
    this.cells.clear();
    this.centerKey = '';
  }

  update(focus: THREE.Vector3, elapsedSeconds: number, wind = 0.3): void {
    this.wind.value = wind;
    this.time.value = elapsedSeconds;
    this.root.visible = this.density > 0;
    if (this.density === 0) return;
    const cx = Math.floor(focus.x / CELL), cz = Math.floor(focus.z / CELL);
    const key = `${cx}:${cz}`;
    if (key !== this.centerKey) {
      this.centerKey = key;
      const span = Math.ceil(this.radius / CELL);
      const wanted: string[] = [];
      for (let dz = -span; dz <= span; dz += 1) for (let dx = -span; dx <= span; dx += 1) {
        if (Math.hypot(dx, dz) * CELL > this.radius + CELL) continue;
        wanted.push(`${cx + dx}:${cz + dz}`);
      }
      const keep = new Set(wanted);
      for (const cell of this.cells.keys()) if (!keep.has(cell)) this.cells.delete(cell);
      // Nearest cells first so the player's surroundings fill in before the edge.
      this.pending = wanted.filter(cell => !this.cells.has(cell))
        .sort((a, b) => cellDistance(a, cx, cz) - cellDistance(b, cx, cz));
      this.rebuild();
    }
    // Scatter a few cells per frame so crossing a cell boundary never hitches.
    if (this.pending.length > 0) {
      for (const cell of this.pending.splice(0, 6)) this.cells.set(cell, this.scatter(cell));
      this.rebuild();
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mesh.geometry.dispose();
    this.flowers.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
    this.flowers.dispose();
  }

  private scatter(cell: string): GrassCell {
    const [cx, cz] = cell.split(':').map(Number) as [number, number];
    const random = cellRandom(cx, cz);
    const count = Math.round(150 * this.density);
    const result: GrassCell = { tufts: [], flowers: [] };
    const rotation = new THREE.Quaternion(), scale = new THREE.Vector3(), position = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i += 1) {
      // Clumped distribution reads as natural tussocks rather than an even carpet.
      const clump = i % 7 === 0;
      const x = (cx + random()) * CELL, z = (cz + random()) * CELL;
      const yaw = random() * Math.PI * 2, size = (clump ? 0.85 : 0.5) + random() * 0.35;
      if (!this.placement.accepts(x, z)) continue;
      position.set(x, this.placement.heightAt(x, z) - 0.02, z);
      rotation.setFromAxisAngle(up, yaw);
      scale.set(size, size * (0.8 + random() * 0.5), size);
      const matrix = new THREE.Matrix4().compose(position, rotation, scale);
      result.tufts.push(matrix);
      // Wildflowers gather in drifts rather than sprinkling evenly.
      const drift = Math.sin(x * 0.13) * Math.cos(z * 0.11);
      if (drift > 0.35 && random() < 0.45) result.flowers.push({ matrix, color: FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)]! });
    }
    return result;
  }

  private rebuild(): void {
    let index = 0, flowerIndex = 0;
    const flowerLimit = this.flowers.instanceMatrix.count;
    for (const cell of this.cells.values()) {
      for (const matrix of cell.tufts) {
        if (index >= this.maxTufts) break;
        this.mesh.setMatrixAt(index, matrix);
        index += 1;
      }
      for (const flower of cell.flowers) {
        if (flowerIndex >= flowerLimit) break;
        this.flowers.setMatrixAt(flowerIndex, flower.matrix);
        this.flowers.setColorAt(flowerIndex, flower.color);
        flowerIndex += 1;
      }
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.flowers.count = flowerIndex;
    this.flowers.instanceMatrix.needsUpdate = true;
    if (this.flowers.instanceColor) this.flowers.instanceColor.needsUpdate = true;
  }
}

function cellDistance(cell: string, cx: number, cz: number): number {
  const [x, z] = cell.split(':').map(Number) as [number, number];
  return Math.hypot(x - cx, z - cz);
}

function cellRandom(cx: number, cz: number): () => number {
  let seed = (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ 0x5bd1e995) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** A tuft of tapered blades; colour runs from shaded roots to sunlit tips. */
function createTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
  const root = new THREE.Color(0x3f7f34), tip = new THREE.Color(0x8cc04c), tipWarm = new THREE.Color(0xa9c95a);
  for (let blade = 0; blade < BLADES_PER_TUFT; blade += 1) {
    const angle = (blade / BLADES_PER_TUFT) * Math.PI + blade * 0.37;
    const lean = 0.06 + (blade % 3) * 0.05, height = 0.26 + (blade % 4) * 0.06, width = 0.035;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const offsetX = Math.cos(angle * 2.3) * 0.08, offsetZ = Math.sin(angle * 1.7) * 0.08;
    const base = positions.length / 3;
    const tipColor = blade % 2 === 0 ? tip : tipWarm;
    // Two root corners, a mid pair and a single tip vertex give a curved, tapered blade.
    const verts: Array<[number, number, number, number]> = [
      [-width, 0, 0, 0], [width, 0, 0, 0],
      [-width * 0.6, height * 0.55, lean * 0.4, 0.55], [width * 0.6, height * 0.55, lean * 0.4, 0.55],
      [0, height, lean, 1],
    ];
    for (const [side, y, forward, t] of verts) {
      positions.push(offsetX + dx * side - dz * forward, y, offsetZ + dz * side + dx * forward);
      // Upward normals light blades like the ground beneath, avoiding dark backfaces.
      normals.push(0, 1, 0);
      const color = root.clone().lerp(tipColor, t);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(base, base + 1, base + 3, base, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}
