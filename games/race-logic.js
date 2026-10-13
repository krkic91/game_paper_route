// version v1.0
/* Deterministic, DOM-free cycling simulation shared by both renderers. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RaceLogic = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const STEP = 1 / 120;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;

  // All distances/heights are metres. World forward is -Z. A lane coordinate
  // x is lateral to the road centre: (x - 1.5) * 2.5 metres, with room at the edge.
  function trackAt(distance, trackSeed = 0) {
    const d = finite(distance), p = finite(trackSeed);
    const a = d / 92 + p, b = d / 41 + p * 0.6;
    const h = d / 105 + p * 0.4, k = d / 51 + p * 0.7;
    const slope = 14 / 92 * Math.cos(a) + 6 / 41 * Math.cos(b);
    const second = -14 / (92 * 92) * Math.sin(a) - 6 / (41 * 41) * Math.sin(b);
    const zone = d + 12 * Math.sin(p);
    return {
      center: 14 * (Math.sin(a) - Math.sin(p)) + 6 * (Math.sin(b) - Math.sin(p * 0.6)),
      height: 2.6 * (Math.sin(h) - Math.sin(p * 0.4)) + 1.3 * (Math.sin(k) - Math.sin(p * 0.7)),
      heading: Math.atan(slope),
      curvature: second / Math.pow(1 + slope * slope, 1.5),
      grade: 2.6 / 105 * Math.cos(h) + 1.3 / 51 * Math.cos(k),
      surface: (zone >= 180 && zone < 235) || (zone >= 600 && zone < 650) ? 'wet'
        : (zone >= 420 && zone < 465) || (zone >= 810 && zone < 845) ? 'gravel' : 'asphalt',
      width: 6.9,
    };
  }

  function rider(x, distance = 0) {
    return {
      x, distance, speed: 0, vx: 0, lean: 0, energy: 100,
      cadence: 0, pedalPhase: 0, wheelAngle: 0, effort: 0,
      sprinting: false, braking: false, drafting: false,
      grip: 1, surface: 'asphalt', grade: 0, acceleration: 0,
      invulnerable: 0, impact: null, finishTime: null, wetTime: 0,
    };
  }

  function createRace(rng = Math.random) {
    const random = () => clamp(finite(rng(), 0.5), 0, 1 - Number.EPSILON);
    const trackSeed = random() * TAU;
    return {
      ...rider(1.5), length: 1000, time: 0, hearts: 3,
      status: 'playing', place: 4, trackSeed, event: null, eventId: 0, remainder: 0,
      rivals: [0, 1, 2].map((n) => ({
        ...rider([0.45, 1.5, 2.55][n], 3 + n * 3),
        id: n, preferredX: [0.45, 1.5, 2.55][n], targetX: [0.45, 1.5, 2.55][n],
        fitness: [0.94, 0.98, 1.02][n], burst: 0, cooldown: 8 + n * 3,
      })),
      obstacles: Array.from({ length: 19 }, (_, i) => ({
        x: 0.3 + Math.floor(random() * 4) * 0.8,
        z: 80 + i * 47,
        type: i % 5 === 3 ? 'water' : i % 3 === 0 ? 'puddle' : 'cone',
        passed: false, rivalsPassed: [],
      })),
    };
  }

  function emit(state, type, strength = 1) {
    state.event = { id: ++state.eventId, type, time: state.time, strength };
  }

  function draftFor(subject, riders) {
    return riders.some((other) => other !== subject && other.finishTime === null &&
      other.distance - subject.distance > 2.2 && other.distance - subject.distance < 14 &&
      Math.abs(other.x - subject.x) < 0.36 && subject.speed > 4);
  }

  function aiInput(state, subject, riders, dt) {
    const track = trackAt(subject.distance, state.trackSeed);
    subject.cooldown = Math.max(0, subject.cooldown - dt);
    subject.burst = Math.max(0, subject.burst - dt);
    const lookahead = Math.max(16, subject.speed * 1.5);
    const threats = state.obstacles.filter((o) => o.type !== 'water' &&
      o.z > subject.distance - 2 && o.z < subject.distance + lookahead);
    const ahead = riders.filter((r) => r !== subject && r.finishTime === null &&
      r.distance > subject.distance && r.distance < subject.distance + Math.max(18, lookahead))
      .sort((a, b) => a.distance - b.distance || (a.id ?? -1) - (b.id ?? -1));
    const blocked = threats.some((o) => Math.abs(o.x - subject.x) < 0.56) ||
      ahead.some((r) => r.distance - subject.distance < 6 && Math.abs(r.x - subject.x) < 0.42);
    const leader = ahead.find((r) => r.distance - subject.distance > 6);
    let preferred = subject.preferredX;
    if (!blocked && leader && subject.energy < 65 && subject.distance < 790) preferred = leader.x;
    const lanes = [0.3, 0.78, 1.26, 1.74, 2.22, 2.7, preferred];
    let best = preferred, bestCost = Infinity;
    for (const lane of lanes) {
      let cost = Math.abs(lane - preferred) * 0.35 + Math.abs(lane - subject.x) * 0.3;
      for (const o of threats) {
        const clearance = Math.abs(lane - o.x);
        if (clearance < 0.7) cost += (0.7 - clearance) * 16 / (1 + (o.z - subject.distance) / lookahead);
      }
      for (const other of ahead) {
        const gap = other.distance - subject.distance;
        const clearanceDistance = 7 + Math.max(0, subject.speed - other.speed) * 0.8;
        if (gap < clearanceDistance && Math.abs(lane - other.x) < 0.55)
          cost += (0.55 - Math.abs(lane - other.x)) * (clearanceDistance + 1 - gap) * 2;
      }
      if (cost < bestCost) { bestCost = cost; best = lane; }
    }
    subject.targetX = best;
    const finalSprint = subject.distance > 790 && subject.energy > (subject.sprinting ? 1 : 12);
    if (!finalSprint && subject.distance > 200 && !subject.cooldown && subject.energy > 70 &&
      ahead.length && !threats.length && Math.abs(track.curvature) < 0.003) {
      subject.burst = 1.3 + subject.id * 0.25;
      subject.cooldown = 11 + subject.id * 2;
    }
    // A small feed-forward correction follows the bend without changing position directly.
    const curveCorrection = track.curvature * subject.speed * subject.speed * 0.018;
    return {
      steer: clamp((best - subject.x) * 2.8 - subject.vx * 0.55 + curveCorrection, -1, 1),
      sprint: finalSprint || subject.burst > 0,
      brake: threats.some((o) => o.z - subject.distance < 4 && Math.abs(o.x - subject.x) < 0.5) ||
        ahead.some((other) => Math.abs(other.x - subject.x) < 0.42 &&
          other.distance - subject.distance < 2.4 + Math.max(0, subject.speed - other.speed) * 0.55),
      coast: track.grade < -0.035 && subject.speed > 19 && subject.energy < 80,
    };
  }

  function integrate(subject, dt, input, trackSeed, drafting) {
    const road = trackAt(subject.distance, trackSeed);
    subject.invulnerable = Math.max(0, subject.invulnerable - dt);
    subject.wetTime = Math.max(0, subject.wetTime - dt);
    if (subject.impact) {
      subject.impact.time -= dt;
      if (subject.impact.time <= 0) subject.impact = null;
    }
    const shoulder = Math.abs((subject.x - 1.5) * 2.5) > road.width / 2;
    subject.surface = shoulder ? 'shoulder' : subject.wetTime > 0 ? 'wet' : road.surface;
    subject.grip = { asphalt: 1, wet: 0.62, gravel: 0.74, shoulder: 0.48 }[subject.surface];
    subject.grade = road.grade;
    subject.drafting = drafting;
    subject.braking = Boolean(input.brake);
    subject.sprinting = Boolean(input.sprint && !input.coast && !input.brake &&
      subject.energy > (subject.sprinting ? 1 : 12));
    subject.effort = input.coast || input.brake ? 0 : subject.sprinting ? 1 : 0.57;
    const energyRate = subject.sprinting ? (subject.drafting ? -17 : -23) :
      subject.effort ? (subject.drafting ? 11 : 8) : 15;
    subject.energy = clamp(subject.energy + energyRate * dt, 0, 100);
    const rolling = { asphalt: 0.12, wet: 0.18, gravel: 0.6, shoulder: 1.1 }[subject.surface];
    const drive = 8.4 * subject.effort * (subject.fitness || 1) / (1 + subject.speed * 0.12);
    const drag = 0.0042 * subject.speed * subject.speed * (subject.drafting ? 0.65 : 1);
    const braking = subject.braking ? 6.5 * subject.grip : 0;
    subject.acceleration = drive - drag - rolling - 9.81 * road.grade - braking;
    const beforeSpeed = subject.speed;
    subject.speed = clamp(subject.speed + subject.acceleration * dt, 0, 31);
    const travelled = (beforeSpeed + subject.speed) * 0.5 * dt;
    subject.distance += travelled;

    const steer = clamp(finite(input.steer), -1, 1);
    const turnRate = (1.1 + Math.min(subject.speed / 20, 1) * 0.7) * subject.grip *
      clamp(subject.speed / 2, 0, 1);
    const targetVx = steer * turnRate;
    subject.vx += (targetVx - subject.vx) * (1 - Math.exp(-7 * subject.grip * dt));
    subject.vx -= road.curvature * subject.speed * subject.speed * 0.045 * dt;
    const nextX = subject.x + subject.vx * dt;
    subject.x = clamp(nextX, 0, 3);
    if (nextX !== subject.x) subject.vx = 0;
    const targetLean = clamp(-subject.vx * 0.2 - road.curvature * subject.speed * subject.speed * 0.09, -0.38, 0.38);
    subject.lean += (targetLean - subject.lean) * (1 - Math.exp(-7 * dt));
    const cadence = subject.effort ? clamp(44 + subject.speed * 2.5 + (subject.sprinting ? 17 : 0), 44, 116) : 0;
    subject.cadence += (cadence - subject.cadence) * (1 - Math.exp(-9 * dt));
    if (subject.effort) subject.pedalPhase = (subject.pedalPhase + subject.cadence / 60 * TAU * dt) % TAU;
    subject.wheelAngle = (subject.wheelAngle + travelled / 0.34) % TAU;
    return travelled;
  }

  function obstacleContacts(state, subject, player) {
    for (const obstacle of state.obstacles) {
      const passed = player ? obstacle.passed : obstacle.rivalsPassed?.[subject.id];
      const reach = obstacle.type === 'puddle' ? 1.5 : 1.1;
      const lateralReach = obstacle.type === 'puddle' ? .4 : .23;
      if (passed || obstacle.z > subject.distance + reach) continue;
      const close = Math.abs(subject.distance - obstacle.z) < reach && Math.abs(subject.x - obstacle.x) < lateralReach;
      if (close) {
        if (obstacle.type === 'water') {
          subject.energy = Math.min(100, subject.energy + 38);
          if (player) emit(state, 'water', 0.3);
        } else if (obstacle.type === 'puddle') {
          subject.speed *= 0.8;
          subject.wetTime = 1.7;
          subject.impact = { type: 'puddle', time: 0.75, strength: 0.4 };
          subject.vx += (subject.x > 1.5 ? -1 : 1) * 0.18;
          if (player) emit(state, 'puddle', 0.4);
        } else if (!subject.invulnerable) {
          if (player) state.hearts--;
          subject.speed *= 0.42;
          subject.invulnerable = 1.5;
          subject.impact = { type: 'cone', time: 0.8, strength: 1 };
          subject.vx += (subject.x > obstacle.x ? 1 : -1) * 0.5;
          if (player) emit(state, 'cone');
        }
      }
      if (close || subject.distance > obstacle.z + reach) {
        if (player) obstacle.passed = true;
        else {
          if (!obstacle.rivalsPassed) obstacle.rivalsPassed = [];
          obstacle.rivalsPassed[subject.id] = true;
        }
      }
    }
  }

  function updateContacts(state, riders) {
    for (let i = 0; i < riders.length; i++) {
      for (let j = i + 1; j < riders.length; j++) {
        const a = riders[i], b = riders[j];
        if (a.finishTime !== null || b.finishTime !== null || a.invulnerable || b.invulnerable ||
          Math.abs(a.distance - b.distance) > 1.8 || Math.abs(a.x - b.x) > 0.24) continue;
        const side = a.x >= b.x ? 1 : -1;
        a.vx += side * 0.42; b.vx -= side * 0.42;
        a.speed *= 0.88; b.speed *= 0.88;
        a.invulnerable = b.invulnerable = 0.7;
        a.impact = { type: 'rider', time: 0.5, strength: 0.35 };
        b.impact = { type: 'rider', time: 0.5, strength: 0.35 };
        if (a === state || b === state) emit(state, 'rider', 0.35);
      }
    }
  }

  function tick(state, dt, input) {
    const riders = [state, ...state.rivals];
    const beforeTime = state.time;
    state.time += dt;
    // Plan from the same snapshot so a rival never sees a future player position.
    const decisions = state.rivals.map((r) => aiInput(state, r, riders, dt));
    const drafting = riders.map((r) => draftFor(r, riders));
    const before = riders.map((r) => r.distance);
    const wasShoulder = state.surface === 'shoulder';
    for (let i = 0; i < riders.length; i++) {
      const subject = riders[i];
      if (subject.finishTime !== null) continue;
      integrate(subject, dt, i ? decisions[i - 1] : input, state.trackSeed, drafting[i]);
      obstacleContacts(state, subject, i === 0);
    }
    updateContacts(state, riders);
    if (state.surface === 'shoulder' && !wasShoulder) {
      state.impact = { type: 'shoulder', time: 0.4, strength: 0.18 };
      emit(state, 'shoulder', 0.18);
    }
    for (let i = 0; i < riders.length; i++) {
      const subject = riders[i];
      if (subject.finishTime === null && subject.distance >= state.length) {
        const fraction = clamp((state.length - before[i]) / Math.max(0.000001, subject.distance - before[i]), 0, 1);
        subject.finishTime = beforeTime + fraction * dt;
        subject.distance = state.length;
      }
    }
    state.place = 1 + state.rivals.filter((r) => state.finishTime !== null ?
      r.finishTime !== null && r.finishTime < state.finishTime : r.distance > state.distance).length;
    if (state.hearts <= 0) state.status = 'lost';
    else if (state.finishTime !== null) {
      state.status = 'won';
      state.time = state.finishTime;
      emit(state, 'finish', 0);
    }
  }

  function stepRace(state, dt, input = {}) {
    if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state;
    // Fixed substeps preserve handling at 30/60/120 Hz. Clamp only long resumed
    // background frames; the scope normally stops calling us while paused.
    state.remainder += Math.min(dt, 1);
    while (state.remainder + 1e-10 >= STEP && state.status === 'playing') {
      state.remainder -= STEP;
      tick(state, STEP, input || {});
    }
    if (state.remainder < 1e-10 || state.status !== 'playing') state.remainder = 0;
    return state;
  }

  return { createRace, stepRace, trackAt };
});
