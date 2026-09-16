import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '@together/shared';
import type { MaterialLibrary } from './MaterialLibrary';
import { AssetRegistry, type AssetRegistryMetrics } from '../assets/runtime/AssetRegistry';

export type VegetationSpecies = 'rain_tree' | 'gulmohar' | 'ficus' | 'palm' | 'ornamental';

type TreeOptions = { species: VegetationSpecies; seed: number; scale?: number };

/**
 * Procedural placeholder vegetation with branch hierarchy and irregular canopy masses.
 * Final Blender-authored LOD assets can replace each returned tree group without changing placement data.
 */
export class VegetationSystem {
  private readonly assets: AssetRegistry;

  constructor(private readonly materials: MaterialLibrary) {
    this.assets = new AssetRegistry((assetId) => {
      const [, species, seed] = assetId.split(':');
      return { assetId, root: this.compileTree({ species: species as VegetationSpecies, seed: Number(seed) }) };
    });
  }

  createTree(options: TreeOptions): THREE.Group {
    const variantSeed = Math.abs(options.seed % 8);
    const asset = this.assets.acquire(`tree:${options.species}:${variantSeed}`);
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

    const trunkHeight = (options.species === 'palm' ? 7.4 : 4.7 + random() * 1.5) * scale;
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
      for (let i = 0; i < 9; i += 1) {
        const frond = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.08 * scale, 2.3 * scale, 3, 5),
          this.materials.get(i % 3 === 0 ? 'foliageLight' : 'foliageMid'),
        );
        const angle = (i / 9) * Math.PI * 2 + random() * 0.2;
        frond.position.set(Math.cos(angle) * 0.85 * scale, trunkHeight + 0.1 * scale, Math.sin(angle) * 0.85 * scale);
        frond.rotation.z = Math.PI * 0.48;
        frond.rotation.y = -angle;
        frond.castShadow = true;
        group.add(frond);
      }
      return this.compileRuntimeTree(group);
    }

    const branchCount = options.species === 'rain_tree' ? 7 : 5;
    for (let i = 0; i < branchCount; i += 1) {
      const angle = (i / branchCount) * Math.PI * 2 + random() * 0.55;
      const length = (1.6 + random() * 1.4) * scale;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scale, 0.14 * scale, length, 6),
        this.materials.get('wood'),
      );
      branch.position.set(
        Math.cos(angle) * length * 0.2,
        trunkHeight * (0.72 + random() * 0.14),
        Math.sin(angle) * length * 0.2,
      );
      branch.rotation.z = Math.PI / 2.8 + (random() - 0.5) * 0.3;
      branch.rotation.y = -angle;
      branch.castShadow = true;
      group.add(branch);
    }

    const canopyCount = options.species === 'rain_tree' ? 13 : options.species === 'gulmohar' ? 11 : 8;
    const canopyRadius = options.species === 'rain_tree' ? 2.4 : 1.65;
    for (let i = 0; i < canopyCount; i += 1) {
      const angle = random() * Math.PI * 2;
      const radial = Math.sqrt(random()) * canopyRadius * scale;
      const yOffset = (random() - 0.3) * 1.25 * scale;
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry((0.75 + random() * 0.55) * scale, 1),
        this.materials.get(i % 5 === 0 ? 'foliageLight' : i % 3 === 0 ? 'foliageDeep' : 'foliageMid'),
      );
      foliage.scale.set(1.15 + random() * 0.45, 0.75 + random() * 0.28, 1.05 + random() * 0.5);
      foliage.position.set(Math.cos(angle) * radial, trunkHeight + yOffset, Math.sin(angle) * radial);
      foliage.rotation.set(random(), random(), random());
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      group.add(foliage);
    }

    return this.compileRuntimeTree(group);
  }

  private compileRuntimeTree(authoring: THREE.Group): THREE.Group {
    authoring.updateMatrixWorld(true);
    const byMaterial = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
    authoring.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const material = object.material as THREE.Material;
      let entry = byMaterial.get(material.uuid);
      if (!entry) {
        entry = { material, geometries: [] };
        byMaterial.set(material.uuid, entry);
      }
      entry.geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
    });
    const runtime = new THREE.Group();
    runtime.name = authoring.name;
    for (const { material, geometries } of byMaterial.values()) {
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      runtime.add(mesh);
    }
    return runtime;
  }

  createShrub(seed: number, scale = 1): THREE.Group {
    const random = createSeededRandom(seed);
    const group = new THREE.Group();
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
    return group;
  }
}
