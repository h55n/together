import * as THREE from 'three';

/** Deterministic painterly tiles generated without external assets. */
export function createSurfaceTexture(kind: 'mineral' | 'plaster' | 'wood' | 'paving' | 'grass' | 'asphalt'): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 7419;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296;
      const ax = x / size * Math.PI * 2, ay = y / size * Math.PI * 2;
      const brush = Math.sin(ax * 3 + Math.sin(ay * 2)) * Math.cos(ay * 4) * 8;
      const mottling = Math.sin(ax + ay * 2) * 5 + Math.cos(ax * 2 - ay) * 5;
      let value = 222 + noise * 22 + brush + mottling;
      let red = 1, green = 1, blue = 1;
      if (kind === 'wood') {
        value = 231 + noise * 13 - 22 * (.5 + .5 * Math.sin(ax * 18 + Math.sin(ay * 3) * 1.5));
        if (x % 64 < 2) value -= 28;
        blue = .94;
      }
      if (kind === 'plaster') value = 240 + brush * .4 + mottling * .35 + noise * 9;
      if (kind === 'paving') {
        const row = Math.floor(y / 32), shiftedX = (x + row % 2 * 32) % size;
        value = 228 + brush * .6 + noise * 16 + Math.sin(Math.floor(shiftedX / 64) * 2 + row * 3) * 5;
        if (y % 32 < 2 || shiftedX % 64 < 2) value = 185 + noise * 12;
        blue = .96;
      }
      if (kind === 'grass') {
        const blades = Math.sin(ax * 33 + Math.sin(ay * 19)) * Math.cos(ay * 29) * 9;
        value = 218 + noise * 18 + brush + mottling + blades;
        red = .95; blue = .89;
      }
      if (kind === 'asphalt') {
        value = 226 + noise * 17 + mottling * .45 + (noise > .96 ? -30 : 0);
        red = .96;
      }
      const index = (y * size + x) * 4;
      data[index] = Math.min(255, value * red); data[index + 1] = Math.min(255, value * green); data[index + 2] = Math.min(255, value * blue); data[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(kind === 'plaster' ? 3 : 8, kind === 'wood' ? 2 : 8);
  texture.needsUpdate = true;
  return texture;
}
