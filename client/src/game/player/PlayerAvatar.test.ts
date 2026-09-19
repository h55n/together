import { describe, expect, it } from 'vitest';
import { PlayerAvatar } from './PlayerAvatar';

describe('PlayerAvatar', () => {
  it('builds an articulated embodied rig with elbows, knees and a first-person-safe head', () => {
    const avatar = new PlayerAvatar();
    try {
      expect(avatar.root.getObjectByName('avatar:left-elbow')).toBeTruthy();
      expect(avatar.root.getObjectByName('avatar:right-elbow')).toBeTruthy();
      expect(avatar.root.getObjectByName('avatar:left-knee')).toBeTruthy();
      expect(avatar.root.getObjectByName('avatar:right-knee')).toBeTruthy();
      expect(avatar.root.getObjectByName('avatar:pelvis')).toBeTruthy();

      avatar.setFirstPerson(true);
      expect(avatar.head.visible).toBe(false);
      avatar.setFirstPerson(false);
      expect(avatar.head.visible).toBe(true);

      avatar.updateMotion(0.2, 'sit');
      const leftKnee = avatar.root.getObjectByName('avatar:left-knee');
      const rightKnee = avatar.root.getObjectByName('avatar:right-knee');
      expect(Math.abs(leftKnee?.rotation.x ?? 0)).toBeGreaterThan(0.5);
      expect(Math.abs(rightKnee?.rotation.x ?? 0)).toBeGreaterThan(0.5);
    } finally {
      avatar.dispose();
    }
  });
});
