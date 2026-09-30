import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '@together/shared';
import type { MaterialLibrary } from './MaterialLibrary';
import { AssetRegistry, type AssetRegistryMetrics } from '../assets/runtime/AssetRegistry';

export type VegetationSpecies = 'rain_tree' | 'gulmohar' | 'ficus' | 'palm' | 'ornamental';

type TreeOptions = { species: VegetationSpecies; seed: number; scale?: number; lod?: 'near' | 'far' };

/**
 * Three.js-native procedural vegetation. Authoring pieces are compiled into a
 * small material-grouped runtime representation before placement.
 */
export class VegetationSystem {
  private static readonly registries = new WeakMap<MaterialLibrary, AssetRegistry>();
  private readonly assets: AssetRegistry;

  constructor(private readonly materials: MaterialLibrary) {
    const shared = VegetationSystem.registries.get(materials);
    if (shared) { this.assets = shared; return; }
    this.assets = new AssetRegistry((assetId) => {
      if (assetId.startsWith('shrub:')) return { assetId, root: this.compileShrub(Number(assetId.split(':')[1])) };
      const [, species, seed, lod] = assetId.split(':');
      return { assetId, root: this.compileTree({ species: species as VegetationSpecies, seed: Number(seed), lod: lod as 'near' | 'far' }) };
    });
    VegetationSystem.registries.set(materials, this.assets);
    materials.onDispose?.(() => { this.assets.dispose(); VegetationSystem.registries.delete(materials); });
  }

  createTree(options: TreeOptions): THREE.Group {
    const variantSeed = Math.abs(options.seed % 8);
    const asset = this.assets.acquire(`tree:${options.species}:${variantSeed}:${options.lod ?? 'near'}`);
    const instance = asset.root.clone(true) as THREE.Group;
    instance.scale.setScalar(options.scale ?? 1);
    return instance;
  }

  metrics(): AssetRegistryMetrics { return this.assets.metrics(); }

  private compileTree(options: TreeOptions): THREE.Group {
    const random = createSeededRandom(options.seed);
    const scale = 1;
    const group = new THREE.Group();
    group.name = `vegetation:${options.species}`;

    const trunkHeight = (options.species === 'palm' ? 7.4 : (options.species === 'rain_tree' ? 6.8 : options.species === 'gulmohar' ? 6.0 : 4.7) + random() * 1.5) * scale;
    const trunkRadius = (options.species === 'palm' ? 0.19 : 0.3 + random() * 0.12) * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.72, trunkRadius, trunkHeight, 7),
      this.materials.get('wood'),
    );
    trunk.position.y = trunkHeight / 2;
    trunk.rotation.z = (random() - 0.5) * 0.05;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    if (options.species === 'palm') {
      for (let frond = 0; frond < 9; frond += 1) {
        const angle=frond/9*Math.PI*2+random()*0.15;
        const vertices:number[]=[];
        const point=(distance:number,side:number):THREE.Vector3=>new THREE.Vector3(
          Math.cos(angle)*distance-Math.sin(angle)*side,
          trunkHeight+0.5+Math.sin(distance/3.7*Math.PI)*0.8-distance*0.23,
          Math.sin(angle)*distance+Math.cos(angle)*side,
        );
        for(let leaf=0;leaf<12;leaf+=1){
          const t=0.3+leaf*0.28, reach=Math.sin((leaf+1)/14*Math.PI)*0.82;
          for(const side of [-1,1]){
            const a=point(t,0),b=point(t+0.72,side*reach),c=point(t+0.22,0);
            for(const p of [a,b,c,c,b,a])vertices.push(p.x,p.y,p.z);
          }
        }
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
        geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));geometry.computeVertexNormals();
        const mesh=new THREE.Mesh(geometry,this.materials.get(frond%3===0?'foliageLight':'foliageMid'));
        // Match the indexed primitive layout used by the tree compiler.
        geometry.setIndex(Array.from({length:vertices.length/3},(_,i)=>i));
        mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
      }
      return this.compileRuntimeTree(group);
    }
    const branchCount = options.species === 'rain_tree' ? 7 : 5;
    for (let i = 0; i < branchCount; i += 1) {
      const angle = (i / branchCount) * Math.PI * 2 + random() * 0.55;
      const reach = (1.6 + random() * 1.4) * scale;
      const start = new THREE.Vector3(0, trunkHeight * 0.68, 0);
      const end = new THREE.Vector3(Math.cos(angle) * reach, trunkHeight + 0.15 + random() * 0.4 + random() * 0.15, Math.sin(angle) * reach);
      const direction = end.clone().sub(start);
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scale, 0.14 * scale, direction.length(), 6),
        this.materials.get('wood'),
      );
      branch.position.copy(start).lerp(end, 0.5);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      branch.castShadow = true;
      group.add(branch);
    }

    const canopyCount = options.species === 'rain_tree' ? 13 : options.species === 'gulmohar' ? 11 : 8;
    const canopyRadius = options.species === 'rain_tree' ? 3.7 : options.species === 'gulmohar' ? 2.8 : 1.95;
    for (let i = 0; i < canopyCount; i += 1) {
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(random()) * canopyRadius * scale;
      const yOffset = (random() - 0.3) * 1.25 * scale;
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry((0.75 + random() * 0.55) * scale, options.lod === 'far' ? 0 : 1),
        this.materials.get(i % 5 === 0 ? 'foliageLight' : i % 3 === 0 ? 'foliageDeep' : 'foliageMid'),
      );
      foliage.scale.set(1.15 + random() * 0.45, 0.75 + random() * 0.28, 1.05 + random() * 0.5);
      foliage.position.set(Math.cos(angle) * radial, trunkHeight + yOffset, Math.sin(angle) * radial);
      foliage.rotation.set(random(), random(), random());
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      group.add(foliage);
      // Small asymmetric leaf masses break the smooth crown outline and catch light.
      for (let leaf = 0; leaf < 18; leaf += 1) {
        const azimuth = random() * Math.PI * 2;
        const reach = 0.65 + random() * 0.85;
        const spray = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38 + random() * 0.25, 0),
          this.materials.get(options.species === 'gulmohar' && leaf % 9 === 0 ? 'flowerCoral'
            : options.species === 'ornamental' && leaf % 11 === 0 ? 'flowerGold'
              : leaf % 5 === 0 ? 'foliageLight' : leaf % 3 === 0 ? 'foliageDeep' : 'foliageMid'));
        spray.position.copy(foliage.position).add(new THREE.Vector3(Math.cos(azimuth) * reach, (random() - 0.4) * 1.1, Math.sin(azimuth) * reach));
        spray.scale.set(1.1, 0.32 + random() * 0.3, 0.65);
        spray.rotation.set(random() * 0.5, azimuth, random() * 0.4);
        // Consume the same seeded samples so both detail levels share their crown layout.
        if (options.lod === 'far' && leaf % 3 !== 0) { spray.geometry.dispose(); continue; }
        spray.castShadow = true; spray.receiveShadow = true; group.add(spray);
      }
    }

    return this.compileRuntimeTree(group);
  }

  private compileRuntimeTree(authoring: THREE.Group): THREE.Group {
    authoring.updateMatrixWorld(true);
    const byMaterial = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
    authoring.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const sourceMaterial = object.material as THREE.MeshStandardMaterial;
      const painted = sourceMaterial !== this.materials.get('wood');
      const material = painted ? this.materials.get('foliagePainted') : sourceMaterial;
      let entry = byMaterial.get(material.uuid);
      if (!entry) {
        entry = { material, geometries: [] };
        byMaterial.set(material.uuid, entry);
      }
      const geometry = object.geometry.clone();
      if (painted) {
        const positions = geometry.getAttribute('position');
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox!;
        const height = Math.max(0.001, bounds.max.y - bounds.min.y);
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i += 1) {
          // Painted crown highlights remain in the shared mesh on both backends.
          const brightness = 0.72 + (positions.getY(i) - bounds.min.y) / height * 0.35;
          colors[i * 3] = sourceMaterial.color.r * brightness;
          colors[i * 3 + 1] = sourceMaterial.color.g * brightness;
          colors[i * 3 + 2] = sourceMaterial.color.b * brightness;
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      }
      entry.geometries.push(geometry.applyMatrix4(object.matrixWorld));
      object.geometry.dispose();
    });
    const runtime = new THREE.Group();
    runtime.name = authoring.name;
    for (const { material, geometries } of byMaterial.values()) {
      const geometry = mergeGeometries(geometries, false);
      for (const source of geometries) source.dispose();
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      runtime.add(mesh);
    }
    return runtime;
  }

  createShrub(seed: number, scale = 1): THREE.Group {
    const asset = this.assets.acquire(`shrub:${Math.abs(seed % 24)}`);
    const instance = asset.root.clone(true) as THREE.Group;
    instance.scale.setScalar(scale);
    return instance;
  }

  private compileShrub(seed: number): THREE.Group {
    const scale = 1;
    const random = createSeededRandom(seed);
    const group = new THREE.Group();
    group.name = 'vegetation:shrub';
    for (let i = 0; i < 5; i += 1) {
      const leafMass = new THREE.Mesh(
        new THREE.IcosahedronGeometry((0.42 + random() * 0.24) * scale, 1),
        this.materials.get(i % 2 === 0 ? 'foliageMid' : 'foliageDeep'),
      );
      leafMass.position.set((random() - 0.5) * scale, (0.35 + random() * 0.25) * scale, (random() - 0.5) * scale);
      leafMass.scale.y = 0.75;
      leafMass.castShadow = true;
      group.add(leafMass);
    }
    if (seed % 3 === 0) {
      for (let flower = 0; flower < 5; flower += 1) {
        const blossom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 * scale, 0),
          this.materials.get(seed % 2 === 0 ? 'flowerCoral' : 'flowerGold'));
        blossom.position.set((random() - 0.5) * 1.1 * scale, (0.68 + random() * 0.3) * scale, (random() - 0.5) * 1.1 * scale);
        group.add(blossom);
      }
    }
    return this.compileRuntimeTree(group);
  }
}
