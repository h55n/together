import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalGameRepository } from '../../server/src/db/LocalGameRepository.js';
import { ProfileService } from '../../server/src/game/ProfileService.js';

test('avatar identity persists validated appearance and settings per user', async () => {
  const repository = new LocalGameRepository();
  const service = new ProfileService(repository);
  const profile = await service.saveProfile('user-a', {
    displayName: 'Mira',
    avatarConfig: {
      bodyFrame: 'slim',
      height: 1.68,
      skinTone: 7,
      faceBase: 'face_02',
      hair: 'hair_waves',
      hairColor: '#2f211b',
      homeOutfit: 'home_sage',
      outdoorOutfit: 'outdoor_terracotta',
      sleepOutfit: 'sleep_soft',
    },
    settings: { voicePreference: 'proximity' },
  });

  assert.equal(profile.displayName, 'Mira');
  assert.equal(profile.avatarConfig.height, 1.68);
  assert.equal(profile.avatarConfig.skinTone, 7);
  assert.equal((await service.getProfile('user-a'))?.avatarConfig.outdoorOutfit, 'outdoor_terracotta');
});

test('profile service rejects invalid avatar values instead of persisting arbitrary client data', async () => {
  const service = new ProfileService(new LocalGameRepository());
  await assert.rejects(() => service.saveProfile('user-a', {
    displayName: 'Mira',
    avatarConfig: { height: 4.2 },
    settings: {},
  }), /avatar|height|validation|expected/i);
});
