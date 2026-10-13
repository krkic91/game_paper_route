// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../games/race-logic.js');

const STEP = 1 / 120;
function solo() {
  const state = R.createRace(() => 0);
  state.obstacles = [];
  state.rivals = [];
  return state;
}
function ride(state, seconds, input = {}, hz = 120) {
  for (let i = 0; i < Math.round(seconds * hz); i++) R.stepRace(state, 1 / hz, input);
  return state;
}
function moving() {
  return Object.assign(solo(), { distance: 100, speed: 12, energy: 50 });
}
function oneRival(state, overrides = {}) {
  const rival = Object.assign(R.createRace(() => 0).rivals[0], overrides);
  state.rivals = [rival];
  return rival;
}

test('race: seeded races are reproducible and start all riders at rest', () => {
  const a = R.createRace(() => 0.34), b = R.createRace(() => 0.34);
  assert.deepEqual(a, b);
  assert.equal(a.length, 1000);
  assert.equal(a.rivals.length, 3);
  assert.ok([a, ...a.rivals].every((rider) => rider.speed === 0 && rider.energy === 100));
  assert.ok(a.obstacles.every((obstacle) => obstacle.z > 0 && obstacle.z < a.length));
  const badRandom = R.createRace(() => NaN);
  assert.ok(Number.isFinite(badRandom.trackSeed));
  assert.ok(badRandom.obstacles.every((obstacle) => Number.isFinite(obstacle.x)));
});

test('race: steering cannot slide a stopped bike and moving steering builds gradually', () => {
  const stopped = solo();
  ride(stopped, 1, { steer: 1, brake: true });
  assert.equal(stopped.x, 1.5);
  assert.equal(stopped.speed, 0);
  const state = moving();
  R.stepRace(state, STEP, { steer: 1 });
  assert.ok(state.x > 1.5 && state.x < 1.51);
  assert.ok(state.vx > 0 && state.vx < 0.2);
});

test('race: reversing direction preserves inertia before turning back', () => {
  const state = moving();
  ride(state, 0.25, { steer: 1 });
  const before = state.x, velocity = state.vx;
  R.stepRace(state, STEP, { steer: -1 });
  assert.ok(state.x > before, 'the bike cannot instantly reverse its sideways movement');
  assert.ok(state.vx > 0 && state.vx < velocity);
  ride(state, 0.5, { steer: -1 });
  assert.ok(state.vx < 0);
  assert.ok(Math.abs(state.lean) <= 0.38);
});

test('race: sustained steering and invalid input never escape the road or corrupt state', () => {
  const state = moving();
  for (const steer of [1, -1, NaN, Infinity, 1000, -1000]) {
    ride(state, 2, { steer, sprint: true });
    assert.ok(state.x >= 0 && state.x <= 3);
    assert.ok(state.energy >= 0 && state.energy <= 100);
    for (const key of ['distance', 'speed', 'vx', 'lean', 'wheelAngle', 'pedalPhase'])
      assert.ok(Number.isFinite(state[key]), key);
  }
});

test('race: sprint accelerates over time and spends energy instead of setting speed instantly', () => {
  const regular = solo(), sprint = solo();
  R.stepRace(sprint, STEP, { sprint: true });
  assert.ok(sprint.speed > 0 && sprint.speed < 0.1);
  ride(regular, 2);
  ride(sprint, 2 - STEP, { sprint: true });
  assert.ok(sprint.speed > regular.speed + 2);
  assert.ok(sprint.speed < 12);
  assert.ok(sprint.distance > regular.distance);
  assert.ok(sprint.energy < 60 && regular.energy === 100);
  const exhausted = moving();
  exhausted.energy = 0;
  R.stepRace(exhausted, STEP, { sprint: true });
  assert.equal(exhausted.sprinting, false);
  assert.ok(exhausted.energy > 0);
  ride(exhausted, 1, { coast: true });
  R.stepRace(exhausted, STEP, { sprint: true });
  assert.equal(exhausted.sprinting, true);
});

test('race: coasting rolls with stationary pedals, while braking slows down faster', () => {
  const pedalling = moving(), coasting = moving(), braking = moving();
  coasting.pedalPhase = 1.2;
  ride(pedalling, 1);
  ride(coasting, 1, { coast: true });
  ride(braking, 1, { brake: true, sprint: true });
  assert.ok(pedalling.speed > coasting.speed && coasting.speed > braking.speed);
  assert.ok(coasting.distance > 100 && braking.distance > 100);
  assert.equal(coasting.pedalPhase, 1.2);
  assert.ok(coasting.wheelAngle > 0);
  assert.ok(coasting.energy > pedalling.energy);
  assert.equal(braking.sprinting, false);
  assert.equal(braking.effort, 0);
  ride(braking, 5, { brake: true });
  assert.equal(braking.speed, 0);
});

test('race: downhill coasting preserves more speed than climbing', () => {
  const uphill = moving(), downhill = moving();
  uphill.distance = 0;
  downhill.distance = 150;
  ride(uphill, 0.5, { coast: true });
  ride(downhill, 0.5, { coast: true });
  assert.ok(uphill.grade > 0 && downhill.grade < 0);
  assert.ok(downhill.speed > uphill.speed + 0.2);
});

test('race: wet grip reduces braking and steering, and the shoulder slows the bike', () => {
  const dry = moving(), wet = moving();
  wet.wetTime = 2;
  ride(dry, 0.5, { brake: true, steer: 1 });
  ride(wet, 0.5, { brake: true, steer: 1 });
  assert.ok(wet.grip < dry.grip);
  assert.ok(wet.speed > dry.speed);
  assert.ok(wet.x < dry.x);
  const road = moving(), shoulder = moving();
  shoulder.x = 0;
  ride(road, 0.1, { coast: true });
  ride(shoulder, 0.1, { coast: true });
  assert.equal(shoulder.surface, 'shoulder');
  assert.ok(shoulder.speed < road.speed);
  assert.equal(shoulder.event.type, 'shoulder');
});

test('race: track has continuous bends and hills plus wet and gravel sections', () => {
  assert.equal(R.trackAt(0).center, 0);
  assert.equal(R.trackAt(0).height, 0);
  assert.equal(R.trackAt(190).surface, 'wet');
  assert.equal(R.trackAt(430).surface, 'gravel');
  assert.equal(R.trackAt(100).surface, 'asphalt');
  let bends = false, climbs = false, descents = false;
  for (let d = 0; d < 1000; d += 2) {
    const point = R.trackAt(d), next = R.trackAt(d + 0.01);
    assert.ok(Math.abs(next.center - point.center) < 0.004);
    assert.ok(Math.abs(next.height - point.height) < 0.001);
    bends ||= Math.abs(point.curvature) > 0.003;
    climbs ||= point.grade > 0.025;
    descents ||= point.grade < -0.025;
  }
  assert.ok(bends && climbs && descents);
});

test('race: drafting benefits speed and energy only inside the following pocket', () => {
  const alone = moving(), following = moving();
  oneRival(following, { x: 1.5, preferredX: 1.5, distance: 108, speed: 12 });
  ride(alone, 1, { sprint: true });
  ride(following, 1, { sprint: true });
  assert.equal(following.drafting, true);
  assert.ok(following.energy > alone.energy + 4);
  assert.ok(following.speed > alone.speed);
  for (const [distance, x] of [[115, 1.5], [108, 2.5], [99, 1.5], [101, 1.5]]) {
    const outside = moving();
    oneRival(outside, { distance, x, speed: 12 });
    R.stepRace(outside, STEP);
    assert.equal(outside.drafting, false, `gap ${distance - 100}, lateral ${x - 1.5}`);
  }
});

test('race: all drafting decisions use positions from the same instant', () => {
  for (const [gap, expected] of [[2.19, false], [13.97, true]]) {
    const state = moving();
    const rival = oneRival(state, { distance: state.distance - gap, x: state.x, speed: 12 });
    R.stepRace(state, STEP);
    assert.equal(rival.drafting, expected,
      'a rider must not draft from a player position already advanced by the current step');
  }
});

test('race: AI moves around a cone and does not teleport or receive collision immunity', () => {
  const state = solo();
  state.x = 2.7;
  const rival = oneRival(state, { distance: 60, speed: 12, x: 0.45 });
  state.obstacles = [{ x: 0.45, z: 77, type: 'cone', passed: false }];
  R.stepRace(state, STEP);
  assert.ok(rival.targetX > 0.9);
  assert.ok(rival.x > 0.45 && rival.x < 0.46);
  ride(state, 2 - STEP);
  assert.ok(rival.distance > 82.6);
  assert.equal(rival.impact, null);
  assert.ok(rival.speed > 12);
  assert.equal(state.obstacles[0].rivalsPassed[0], true);
  assert.equal(state.obstacles[0].passed, false, 'the player still has their own obstacle');
  const hit = moving();
  const struck = oneRival(hit, { x: 1.5, distance: 100, speed: 12 });
  hit.obstacles = [{ x: 1.5, z: 100.75, type: 'cone', passed: false }];
  R.stepRace(hit, STEP);
  assert.ok(struck.speed < 6);
  assert.equal(struck.impact.type, 'cone');
  assert.equal(hit.hearts, 2);
});

test('race: AI anticipates slower traffic and seeks a wheel when saving energy', () => {
  const passing = moving();
  Object.assign(passing, { distance: 110, speed: 6, x: 0.45 });
  const rival = oneRival(passing, { distance: 100, speed: 15, x: 0.45 });
  R.stepRace(passing, STEP, { coast: true });
  assert.ok(rival.targetX > 0.9, 'closing speed makes a slow rider ahead matter before contact');
  ride(passing, 1, { coast: true });
  assert.ok(Math.abs(rival.x - passing.x) > 0.4);
  assert.notEqual(rival.impact?.type, 'rider');
  const saving = moving();
  Object.assign(saving, { distance: 108, x: 1.5 });
  const tired = oneRival(saving, { distance: 100, speed: 12, x: 0.45, energy: 40 });
  R.stepRace(saving, STEP);
  assert.equal(tired.targetX, 1.5);
});

test('race: puddles, cones and water have distinct one-time consequences', () => {
  const cases = {};
  for (const type of ['cone', 'puddle', 'water']) {
    const state = moving();
    state.obstacles = [{ x: 1.5, z: 100.75, type, passed: false }];
    R.stepRace(state, STEP);
    cases[type] = state;
    assert.equal(state.event.type, type);
    assert.equal(state.eventId, 1);
    ride(state, 0.25, { coast: true });
    assert.equal(state.eventId, 1, 'a single obstacle is only consumed once per rider');
  }
  assert.equal(cases.cone.hearts, 2);
  assert.equal(cases.puddle.hearts, 3);
  assert.ok(cases.cone.speed < cases.puddle.speed);
  assert.ok(cases.puddle.speed < cases.water.speed);
  assert.equal(cases.puddle.surface, 'wet');
  assert.ok(cases.water.energy > 85);
});

test('race: overlapping cones cost one heart and crashes freeze a lost race', () => {
  const state = moving();
  state.obstacles = [0, 1].map(() => ({ x: 1.5, z: 100.75, type: 'cone', passed: false }));
  R.stepRace(state, STEP);
  assert.equal(state.hearts, 2);
  assert.ok(state.invulnerable > 0);
  assert.ok(state.obstacles.every((obstacle) => obstacle.passed));
  state.hearts = 1;
  state.invulnerable = 0;
  state.obstacles.push({ x: state.x, z: state.distance + 1, type: 'cone', passed: false });
  R.stepRace(state, STEP);
  assert.equal(state.status, 'lost');
  const snapshot = structuredClone(state);
  ride(state, 1, { sprint: true, steer: 1 });
  assert.deepEqual(state, snapshot);
});

test('race: rider contact slows both riders and creates a temporary separation', () => {
  const state = moving();
  const rival = oneRival(state, { x: 1.6, distance: 100.5, speed: 12 });
  R.stepRace(state, STEP);
  assert.equal(state.event.type, 'rider');
  assert.equal(state.hearts, 3);
  assert.ok(state.speed < 11 && rival.speed < 11);
  assert.ok(state.vx < 0 && rival.vx > 0);
  assert.ok(state.invulnerable > 0 && rival.invulnerable > 0);
  const eventId = state.eventId;
  ride(state, 0.1);
  assert.equal(state.eventId, eventId);
});

test('race: collision reach and shoulder match the visible road and bicycle', () => {
  const state = moving();
  state.obstacles = [{ x: state.x, z: 102.5, type: 'cone', passed: false }];
  R.stepRace(state, STEP);
  assert.equal(state.hearts, 3, 'a cone several metres ahead must not hit the rider');
  ride(state, .2);
  assert.equal(state.hearts, 2);
  for (const x of [.11, .13, 2.87, 2.89]) {
    const edge = moving(); edge.distance = 0; edge.x = x;
    const visibleOffRoad = Math.abs((x - 1.5) * 2.5) > R.trackAt(0).width / 2;
    R.stepRace(edge, STEP);
    assert.equal(edge.surface === 'shoulder', visibleOffRoad);
  }
});

test('race: matching input at 30, 60 and 120 Hz yields identical simulation results', () => {
  const results = [30, 60, 120].map((hz) => {
    const state = R.createRace(() => 0.3);
    ride(state, 2, { sprint: true, steer: 0.1 }, hz);
    ride(state, 1, { steer: 0.1 }, hz);
    ride(state, 6, {}, hz);
    ride(state, 1, { brake: true, steer: -0.3 }, hz);
    ride(state, 2, { coast: true }, hz);
    return state;
  });
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});

test('race: finish order uses crossing times within the step and the final state freezes', () => {
  const state = R.createRace(() => 0);
  state.obstacles = [];
  Object.assign(state, { time: 60, distance: 999.98, speed: 6, x: 0.3 });
  Object.assign(state.rivals[0], { distance: 1000, finishTime: 59.9 });
  Object.assign(state.rivals[1], { distance: 999.97, speed: 15, x: 1.5 });
  Object.assign(state.rivals[2], { distance: 999.99, speed: 0.1, x: 2.7 });
  R.stepRace(state, STEP);
  assert.equal(state.status, 'won');
  assert.equal(state.distance, 1000);
  assert.ok(state.finishTime > 60 && state.finishTime < 60 + STEP);
  assert.ok(state.rivals[1].finishTime < state.finishTime);
  assert.equal(state.rivals[2].finishTime, null);
  assert.equal(state.place, 3);
  assert.equal(state.time, state.finishTime);
  assert.equal(state.event.type, 'finish');
  const snapshot = structuredClone(state);
  ride(state, 2, { sprint: true, steer: 1 });
  assert.deepEqual(state, snapshot);
});

test('race: a full kilometre completes and invalid or background frame times are safe', () => {
  const state = solo(), original = structuredClone(state);
  for (const dt of [0, -1, NaN, Infinity]) R.stepRace(state, dt);
  assert.deepEqual(state, original);
  const clamped = solo(), oneSecond = solo();
  R.stepRace(clamped, 100);
  R.stepRace(oneSecond, 1);
  assert.deepEqual(clamped, oneSecond);
  ride(state, 100);
  assert.equal(state.status, 'won');
  assert.equal(state.distance, 1000);
  assert.equal(state.place, 1);
});
