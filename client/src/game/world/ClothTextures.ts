import * as THREE from 'three';

/** Neutral cotton/twill tiles retain each garment's chosen colour. */
export function createClothTextures(kind: 'cotton' | 'denim'): { color: THREE.DataTexture; height: THREE.DataTexture } {
  const size = 128;
  const colorData = new Uint8Array(size * size * 4);
  const heightData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const warp = Math.pow(Math.sin(x * Math.PI / 4), 2);
      const weft = Math.pow(Math.sin(y * Math.PI / 4), 2);
      const over = kind === 'denim' ? (Math.floor(x / 4) + Math.floor(y / 4)) % 4 < 3 : (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      const yarn = over ? warp * 0.8 + weft * 0.2 : warp * 0.2 + weft * 0.8;
      const fibre = Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2) * 2;
      const color = Math.round(226 + yarn * 24 + fibre);
      const height = Math.round(112 + yarn * 48);
      const index = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        colorData[index + channel] = color;
        heightData[index + channel] = height;
      }
      colorData[index + 3] = heightData[index + 3] = 255;
    }
  }
  const color = texture(colorData, size, THREE.SRGBColorSpace);
  const height = texture(heightData, size, THREE.NoColorSpace);
  color.name = `cloth:${kind}:colour`;
  height.name = `cloth:${kind}:height`;
  return { color, height };
}

function texture(data: Uint8Array, size: number, colorSpace: THREE.ColorSpace): THREE.DataTexture {
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = 4;
  result.colorSpace = colorSpace;
  result.repeat.set(4, 4);
  result.needsUpdate = true;
  return result;
}
