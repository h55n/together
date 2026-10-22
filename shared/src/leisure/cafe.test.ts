import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptCafeCommand, createCafeState } from './cafe.js';

test('cafe guests choose seats, order drinks, serve and sip together', () => {
  let state = createCafeState(['a', 'b']);
  state = acceptCafeCommand(state, 'a', ['a', 'b'], { key: 'seat-a', expectedRevision: 0, kind: 'choose_seat', seat: 1 });
  state = acceptCafeCommand(state, 'b', ['a', 'b'], { key: 'seat-b', expectedRevision: 1, kind: 'choose_seat', seat: 2 });
  state = acceptCafeCommand(state, 'a', ['a', 'b'], { key: 'order', expectedRevision: 2, kind: 'order_drink', drink: 'filter_coffee' });
  const order = state.orders[0]!;
  state = acceptCafeCommand(state, 'a', ['a', 'b'], { key: 'serve', expectedRevision: 3, kind: 'serve_drink', orderId: order.id, recipientId: 'b' });
  assert.equal(state.orders[0]!.servedTo, 'b');
  state = acceptCafeCommand(state, 'b', ['a', 'b'], { key: 'sip', expectedRevision: 4, kind: 'sip_drink', orderId: order.id });
  assert.equal(state.orders[0]!.sippedBy, 'b');
  assert.equal(state.phase, 'active');
});

test('cafe preserves an open hangout until players finish, with exclusive seats', () => {
  let state = createCafeState(['a', 'b']);
  state = acceptCafeCommand(state, 'a', ['a', 'b'], { key: 'seat', expectedRevision: 0, kind: 'choose_seat', seat: 1 });
  assert.throws(() => acceptCafeCommand(state, 'b', ['a', 'b'], { key: 'seat-b', expectedRevision: 1, kind: 'choose_seat', seat: 1 }), /taken/i);
  state = acceptCafeCommand(state, 'b', ['a', 'b'], { key: 'finish', expectedRevision: 1, kind: 'finish' });
  assert.equal(state.phase, 'finished');
  assert.throws(() => acceptCafeCommand(state, 'a', ['a', 'b'], { key: 'late', expectedRevision: 2, kind: 'order_drink', drink: 'chai' }), /finished/i);
});
