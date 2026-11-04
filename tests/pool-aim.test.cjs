'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../games/logic.js');
const ball = (id, x, y, active = true) => ({ id, x, y, active, vx: 0, vy: 0 });
const table = (...targets) => ({ status: 'ready', balls: [ball(0, 260, 250), ...targets] });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('pool aim predicts a head-on contact and short object direction without mutation', () => {
  const state = table(ball(1, 400, 250));
  const before = structuredClone(state), guide = L.poolAim(state, 0);
  assert.deepEqual(state, before);
  assert.equal(guide.hit, 'ball');
  assert.deepEqual(guide.cue.to, { x: 378, y: 250 });
  assert.deepEqual(guide.target, { id: 1, from: { x: 400, y: 250 }, to: { x: 540, y: 250 }, hit: 'range' });
});

test('cut-shot object direction follows the contact normal, not the cue direction', () => {
  const guide = L.poolAim(table(ball(1, 400, 261)), 0);
  near(guide.cue.to.x, 400 - Math.sqrt(22 ** 2 - 11 ** 2));
  near(guide.target.to.x, 400 + 140 * Math.sqrt(3) / 2);
  near(guide.target.to.y, 331);
});

test('aim selects the nearest active ball and clips its path at the next object', () => {
  const guide = L.poolAim(table(ball(3, 490, 250), ball(2, 320, 250, false), ball(4, 150, 250), ball(1, 400, 250)), 0);
  assert.equal(guide.target.id, 1);
  assert.equal(guide.target.hit, 'ball');
  near(guide.target.to.x, 468);
});

test('both cue and object paths stop at the physical cushion bounds', () => {
  const empty = L.poolAim(table(), 0);
  assert.equal(empty.hit, 'rail');
  assert.equal(empty.target, null);
  near(empty.cue.to.x, 834);
  near(L.poolAim(table(), Math.PI).cue.to.x, 66);
  const object = L.poolAim(table(ball(1, 800, 250)), 0);
  assert.equal(object.target.hit, 'rail');
  near(object.target.to.x, 834);
});

test('pocket capture clips the ray before the cushion and suppresses target direction', () => {
  const state = table(); state.balls[0].x = 450;
  const guide = L.poolAim(state, -Math.PI / 2);
  assert.equal(guide.hit, 'pocket'); near(guide.cue.to.y, 72);
  assert.equal(guide.target, null);
  state.balls.push(ball(1, 450, 140));
  const object = L.poolAim(state, -Math.PI / 2);
  assert.equal(object.target.hit, 'pocket'); near(object.target.to.y, 72);
});

test('a tangent contact has no invented object direction, and moving/invalid input has no guide', () => {
  const state = table(ball(1, 400, 272));
  const guide = L.poolAim(state, 0);
  assert.equal(guide.target, null);
  assert.equal(L.poolAim(state, NaN), null);
  assert.equal(L.poolAim(null, 0), null);
  state.status = 'moving'; assert.equal(L.poolAim(state, 0), null);
  state.status = 'ready'; state.balls[0].active = false; assert.equal(L.poolAim(state, 0), null);
});

test('predicted cut direction agrees with the first collision in the unchanged physics', () => {
  const state = L.createPool();
  state.balls = [ball(0, 260, 250), ball(1, 400, 261)];
  const target = L.poolAim(state, 0).target;
  L.shootPool(state, 0, 0.4);
  for (let frame = 0; frame < 120 && state.balls[1].vx === 0; frame++) L.stepPool(state, 1 / 180);
  const object = state.balls[1];
  assert.ok(object.vx > 0 && object.vy > 0);
  assert.ok(Math.abs(Math.atan2(object.vy, object.vx) - Math.atan2(target.to.y - target.from.y, target.to.x - target.from.x)) < 0.04);
});
