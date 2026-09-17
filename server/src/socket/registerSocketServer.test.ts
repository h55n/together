import { describe, expect, it } from 'vitest';
import { projectRemoteProfile } from './registerSocketServer.js';

describe('socket remote profile projection', () => {
  it('never broadcasts private settings with a player profile', () => {
    const profile = projectRemoteProfile({
      userId: 'user-1',
      displayName: 'Mira',
      avatarConfig: {
        bodyFrame: 'average', height: 1.72, skinTone: 5, faceBase: 'face_01', hair: 'hair_01',
        hairColor: '#2f211b', homeOutfit: 'home_01', outdoorOutfit: 'outdoor_01', sleepOutfit: 'sleep_01',
      },
      settings: { voiceVolume: 0.2, privatePreference: 'do-not-broadcast' },
      updatedAt: new Date(0).toISOString(),
    });

    expect(profile).toEqual(expect.objectContaining({ displayName: 'Mira' }));
    expect(profile).not.toHaveProperty('settings');
    expect(profile).not.toHaveProperty('userId');
  });
});
