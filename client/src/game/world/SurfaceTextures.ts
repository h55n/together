import * as THREE from 'three';

/** Deterministic painterly tiles generated without external assets. */
export function createSurfaceTexture(kind: 'mineral' | 'plaster' | 'wood' | 'paving'): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let seed = 7419;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296;
      let value = 222 + noise * 26;
      if (kind === 'wood') value -= 25 * (0.5 + 0.5 * Math.sin(x * 0.8 + Math.sin(y * 0.09) * 2));
      if (kind === 'plaster') value = 237 + noise * 15;
      if (kind === 'paving' && (y % 16 < 1 || (x + (Math.floor(y / 16) % 2) * 16) % 32 < 1)) value = 207;
      const index = (y * size + x) * 4;
      data[index] = value; data[index + 1] = value; data[index + 2] = value; data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(kind === 'plaster' ? 3 : 8, kind === 'wood' ? 2 : 8);
  texture.needsUpdate = true;
  return texture;
}
