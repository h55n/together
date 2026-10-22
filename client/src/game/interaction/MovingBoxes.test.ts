import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MovingBoxes } from './MovingBoxes';

describe('moving boxes', () => {
  it('stacks one tagged box per packed item and clears after the move', () => {
    const scene = new THREE.Scene(), boxes = new MovingBoxes(scene);
    try {
      boxes.set({ x: 0, z: 0 }, [{ disposition: 'keep' }, { disposition: 'sell' }, { disposition: 'donate' }, { disposition: 'keep' }]);
      expect(boxes.root.children).toHaveLength(4);
      // A box stacked on the second layer sits above the first.
      expect(boxes.root.children[3]!.position.y).toBeGreaterThan(boxes.root.children[0]!.position.y + 0.4);
      const tagged = boxes.root.children.filter(box => box.children.length === 3).length;
      expect(tagged).toBe(2);
      boxes.set(null, []);
      expect(boxes.root.children).toHaveLength(0);
    } finally { boxes.dispose(); }
  });
});
