import assert from 'node:assert/strict';
import test from 'node:test';
import { PlayerAvatar } from './PlayerAvatar';

test('builds an articulated embodied rig with elbows, knees and a first-person-safe head', () => {
  const avatar = new PlayerAvatar();
  try {
    assert.ok(avatar.root.getObjectByName('avatar:left-elbow'));
    assert.ok(avatar.root.getObjectByName('avatar:right-elbow'));
    assert.ok(avatar.root.getObjectByName('avatar:left-knee'));
    assert.ok(avatar.root.getObjectByName('avatar:right-knee'));
    assert.ok(avatar.root.getObjectByName('avatar:pelvis'));

    avatar.setFirstPerson(true);
    assert.equal(avatar.head.visible, false);
    avatar.setFirstPerson(false);
    assert.equal(avatar.head.visible, true);

    avatar.updateMotion(0.2, 'sit');
    const leftKnee = avatar.root.getObjectByName('avatar:left-knee');
    const rightKnee = avatar.root.getObjectByName('avatar:right-knee');
    assert.ok(Math.abs(leftKnee?.rotation.x ?? 0) > 0.5);
    assert.ok(Math.abs(rightKnee?.rotation.x ?? 0) > 0.5);

    avatar.updateMotion(0.1, 'cut');
    assert.equal(avatar.root.getObjectByName('avatar:prop:knife')?.visible, true);
    assert.equal(avatar.root.getObjectByName('avatar:prop:produce')?.visible, true);

    avatar.updateMotion(0.1, 'wash');
    assert.equal(avatar.root.getObjectByName('avatar:prop:knife')?.visible, false);
    assert.equal(avatar.root.getObjectByName('avatar:prop:dish')?.visible, true);
    assert.equal(avatar.root.getObjectByName('avatar:prop:sponge')?.visible, true);
  } finally {
    avatar.dispose();
  }
});
