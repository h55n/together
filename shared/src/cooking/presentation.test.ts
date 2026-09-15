import test from 'node:test';
import assert from 'node:assert/strict';
import { cookingActionPresentation } from './presentation.js';

test('cooking actions map to distinct embodied avatar motions and readable labels', () => {
  assert.deepEqual(cookingActionPresentation('wash'), { label: 'Wash', avatarAction: 'wash' });
  assert.deepEqual(cookingActionPresentation('cut'), { label: 'Cut', avatarAction: 'cut' });
  assert.deepEqual(cookingActionPresentation('stir'), { label: 'Stir', avatarAction: 'stir' });
  assert.deepEqual(cookingActionPresentation('pour'), { label: 'Pour', avatarAction: 'pour' });
  assert.deepEqual(cookingActionPresentation('serve'), { label: 'Serve', avatarAction: 'hand_over' });
});
