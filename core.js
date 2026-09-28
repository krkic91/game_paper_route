(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TAU = Math.PI * 2;
  const ROAD_WIDTH = 9.5;
  const VIEW_DISTANCE = 120;
  const STREET_END = 300;
  const COURSE_START = 305;
  const LEVEL_END = 430;
  const HOUSE_OFFSET = 14;
  const MAX_PAPERS = 36;
  const THROW_RANGE = 22;
  const COLLISION_RECOVERY_TIME = 1.35;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function randRange(rng, min, max) {
    return min + rng() * (max - min);
  }

  function hitRadius(a, b, radius) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz < radius * radius;
  }

  function createGameState(options = {}) {
    const game = {
      player: null,
      papers: [],
      particles: [],
      mailboxes: [],
      obstacles: [],
      houses: [],
      score: 0,
      delivered: 0,
      missed: 0,
      crashes: 0,
      state: 'playing',
      endTimer: 0,
      rng: options.rng || Math.random,
    };

    return resetGameState(game, options);
  }

  function resetGameState(game, options = {}) {
    const rng = options.rng || game.rng || Math.random;
    game.rng = rng;
    game.player = {
      x: 0,
      z: 0,
      vx: 0,
      speed: 10,
      targetSpeed: 10,
      tilt: 0,
      throwCooldown: 0,
      crashTimer: 0,
      invuln: 0,
      collisionRecovery: 0,
      hearts: 3,
      papersLeft: MAX_PAPERS,
    };

    game.papers = [];
    game.particles = [];
    game.mailboxes = [];
    game.obstacles = [];
    game.houses = [];
    game.score = 0;
    game.delivered = 0;
    game.missed = 0;
    game.crashes = 0;
    game.state = 'playing';
    game.endTimer = 0;

    if (!options.skipBuild) {
      buildStreet(game, rng);
      buildObstacleCourse(game, rng);
    }

    return game;
  }

  function buildStreet(game, rng = Math.random) {
    let side = 1;
    for (let i = 0; i < 24; i++) {
      const z = 20 + i * 11.5;
      side *= -1;
      const houseX = side * HOUSE_OFFSET;
      const mailboxX = side * (ROAD_WIDTH * 0.5 + 1.6 + randRange(rng, -0.15, 0.15));

      game.houses.push({
        x: houseX,
        z: z + randRange(rng, -1.2, 1.2),
        width: randRange(rng, 5.5, 7.5),
        depth: randRange(rng, 4.5, 6.5),
        color: side > 0 ? '#f5d377' : '#98d0ff',
        roof: side > 0 ? '#d77355' : '#c45772',
      });

      game.mailboxes.push({
        x: mailboxX,
        z,
        side,
        hit: false,
        broken: false,
        pulse: randRange(rng, 0, TAU),
      });

      if (rng() > 0.18) {
        game.obstacles.push({
          type: 'trash',
          x: side * randRange(rng, ROAD_WIDTH * 0.25, ROAD_WIDTH * 0.48),
          z: z + randRange(rng, 3.5, 7.5),
          r: 0.7,
        });
      }

      if (i > 1 && i < 22 && rng() > 0.58) {
        game.obstacles.push({
          type: 'dog',
          x: side * randRange(rng, ROAD_WIDTH * 0.1, ROAD_WIDTH * 0.55),
          z: z + randRange(rng, 0.5, 4),
          r: 0.85,
          baseX: side * randRange(rng, ROAD_WIDTH * 0.1, ROAD_WIDTH * 0.55),
          phase: randRange(rng, 0, TAU),
          drift: randRange(rng, 0.8, 1.6),
        });
      }
    }

    for (let z = 28; z < STREET_END - 16; z += 18) {
      game.obstacles.push({
        type: 'pothole',
        x: randRange(rng, -ROAD_WIDTH * 0.25, ROAD_WIDTH * 0.25),
        z: z + randRange(rng, -3, 3),
        r: 0.75,
      });
    }
  }

  function buildObstacleCourse(game, rng = Math.random) {
    for (let i = 0; i < 18; i++) {
      const z = COURSE_START + i * 6.5;
      const wave = Math.sin(i * 0.7);
      game.obstacles.push({
        type: 'cone',
        x: clamp(wave * 3.2, -ROAD_WIDTH * 0.42, ROAD_WIDTH * 0.42),
        z,
        r: 0.7,
      });

      if (i % 2 === 0) {
        game.obstacles.push({
          type: 'barrier',
          x: -Math.sign(wave || 1) * randRange(rng, 1.8, 3.2),
          z: z + 2.2,
          r: 1.2,
        });
      }
    }

    for (let i = 0; i < 8; i++) {
      game.obstacles.push({
        type: 'dog',
        x: randRange(rng, -2.2, 2.2),
        z: COURSE_START + 10 + i * 11.5,
        r: 0.9,
        baseX: randRange(rng, -2, 2),
        phase: randRange(rng, 0, TAU),
        drift: randRange(rng, 1.5, 2.2),
      });
    }
  }

  function nearestMailboxSide(game) {
    const target = getTargetMailbox(game, 0);
    return target ? target.side : (game.player.x >= 0 ? 1 : -1);
  }

  function getTargetMailbox(game, preferredSide = 0) {
    let best = null;
    const reservedMailboxes = new Set(
      game.papers
        .map((paper) => paper.targetMailbox)
        .filter(Boolean),
    );

    for (const mailbox of game.mailboxes) {
      if (mailbox.hit || reservedMailboxes.has(mailbox)) continue;
      const dz = mailbox.z - game.player.z;
      if (dz < 3 || dz > THROW_RANGE) continue;
      if (preferredSide && mailbox.side !== preferredSide) continue;

      const lateral = Math.abs(mailbox.x - game.player.x);
      const alignmentPenalty = preferredSide === 0 ? 0 : Math.abs(mailbox.side - preferredSide) * 10;
      const score = lateral + dz * 0.45 + alignmentPenalty;
      if (!best || score < best.score) best = { mailbox, score };
    }

    return best ? best.mailbox : null;
  }

  function buildThrowSpec(game, target) {
    const player = game.player;
    const side = Math.sign(target.x - player.x) || target.side || 1;
    const startX = player.x + side * 0.65;
    const startZ = player.z + 1.8;
    const distance = Math.hypot(target.x - startX, target.z - startZ);
    const duration = clamp(distance / (player.speed + 16), 0.34, 0.82);
    const arcHeight = clamp(distance * 0.28, 2.6, 6.2);

    return {
      startX,
      startZ,
      targetX: target.x,
      targetZ: target.z,
      targetMailbox: target.mailbox || null,
      duration,
      arcHeight,
      side,
    };
  }

  function createFallbackTarget(game, preferredSide = 0) {
    const side = preferredSide || nearestMailboxSide(game);
    return {
      x: clamp(game.player.x + side * 7.5, -HOUSE_OFFSET + 2, HOUSE_OFFSET - 2),
      z: game.player.z + 15,
      side,
      mailbox: null,
    };
  }

  function spawnThrow(game, preferredSide = 0) {
    const player = game.player;
    if (player.throwCooldown > 0 || player.papersLeft <= 0 || game.state !== 'playing') return null;

    const mailbox = getTargetMailbox(game, preferredSide);
    const target = mailbox
      ? { x: mailbox.x, z: mailbox.z, side: mailbox.side, mailbox }
      : createFallbackTarget(game, preferredSide);

    return spawnThrowAtTarget(game, target);
  }

  function spawnThrowAtTarget(game, target) {
    const player = game.player;
    if (player.throwCooldown > 0 || player.papersLeft <= 0 || game.state !== 'playing') return null;

    const spec = buildThrowSpec(game, target);
    player.throwCooldown = 0.24;
    player.papersLeft -= 1;

    const paper = {
      x: spec.startX,
      z: spec.startZ,
      y: 0,
      startX: spec.startX,
      startZ: spec.startZ,
      targetX: spec.targetX,
      targetZ: spec.targetZ,
      targetMailbox: spec.targetMailbox,
      duration: spec.duration,
      progress: 0,
      arcHeight: spec.arcHeight,
      age: 0,
      delivered: false,
    };

    game.papers.push(paper);
    return paper;
  }

  function getAimPreview(game, preferredSide = 0, sampleCount = 14) {
    if (game.state !== 'playing' || game.player.papersLeft <= 0) return null;

    const mailbox = getTargetMailbox(game, preferredSide);
    const target = mailbox
      ? { x: mailbox.x, z: mailbox.z, side: mailbox.side, mailbox }
      : createFallbackTarget(game, preferredSide);
    const spec = buildThrowSpec(game, target);

    return {
      target,
      mailbox,
      points: sampleThrowPoints(spec, sampleCount),
    };
  }

  function sampleThrowPoints(spec, sampleCount = 14) {
    const points = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      points.push({
        x: lerp(spec.startX, spec.targetX, t),
        z: lerp(spec.startZ, spec.targetZ, t),
        y: 4 * spec.arcHeight * t * (1 - t),
      });
    }
    return points;
  }

  function addCrashParticles(game) {
    const player = game.player;
    for (let i = 0; i < 14; i++) {
      game.particles.push({
        x: player.x + randRange(game.rng, -0.5, 0.5),
        z: player.z + randRange(game.rng, -0.2, 0.8),
        vx: randRange(game.rng, -4, 4),
        vz: randRange(game.rng, 0, 8),
        life: randRange(game.rng, 0.4, 0.8),
        color: i % 2 ? '#ffffff' : '#f0d050',
        size: randRange(game.rng, 0.08, 0.18),
      });
    }
  }

  function addDeliveryParticles(game, mailbox) {
    for (let i = 0; i < 10; i++) {
      game.particles.push({
        x: mailbox.x,
        z: mailbox.z,
        vx: randRange(game.rng, -2.5, 2.5),
        vz: randRange(game.rng, -1.5, 3.5),
        life: randRange(game.rng, 0.35, 0.75),
        color: '#fff2a3',
        size: randRange(game.rng, 0.06, 0.14),
      });
    }
  }

  function crashPlayer(game) {
    const player = game.player;
    if (player.collisionRecovery > 0 || game.state !== 'playing') return false;

    player.hearts -= 1;
    player.crashTimer = 1.1;
    player.invuln = Math.max(player.invuln, COLLISION_RECOVERY_TIME + 0.4);
    player.collisionRecovery = COLLISION_RECOVERY_TIME;
    player.speed = Math.max(5.5, player.speed * 0.45);
    player.vx *= -0.7;
    game.crashes += 1;
    addCrashParticles(game);

    if (player.hearts <= 0) {
      game.state = 'failed';
      game.endTimer = 0;
    }

    return true;
  }

  function updateGame(game, dt, input = {}) {
    const player = game.player;
    const steering = clamp(input.steering || 0, -1, 1);
    let throttle = clamp(input.throttle || 0, -1, 1);

    if (input.pedal) throttle = Math.max(throttle, 1);

    if (game.state === 'playing') {
      let desiredSpeed = clamp(10 + throttle * 4.2, 6, 15.5);
      if (player.z >= COURSE_START) desiredSpeed = Math.min(desiredSpeed, 13.4);
      player.targetSpeed = desiredSpeed;
      player.speed = lerp(player.speed, player.targetSpeed, dt * 3.2);

      if (input.stopSteering) {
        player.vx = 0;
      } else {
        const steerForce = player.crashTimer > 0 ? 0 : steering * 30;
        player.vx += steerForce * dt;
        player.vx *= Math.pow(0.08, dt);
        player.vx = clamp(player.vx, -7.4, 7.4);
      }

      player.x += player.vx * dt;
      player.x = clamp(player.x, -ROAD_WIDTH * 0.64, ROAD_WIDTH * 0.64);
      player.z += player.speed * dt;
      player.tilt = lerp(player.tilt, clamp(-player.vx * 0.12, -0.65, 0.65), dt * 9);

      if (input.throwLeft) spawnThrow(game, -1);
      if (input.throwRight) spawnThrow(game, 1);
      if (input.throwAuto) spawnThrow(game, 0);

      if (player.z >= LEVEL_END) {
        game.state = 'won';
        game.endTimer = 0;
      }
    } else {
      game.endTimer += dt;
    }

    player.throwCooldown = Math.max(0, player.throwCooldown - dt);
    player.crashTimer = Math.max(0, player.crashTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.collisionRecovery = Math.max(0, player.collisionRecovery - dt);

    for (const obstacle of game.obstacles) {
      if (obstacle.type === 'dog') {
        obstacle.x = obstacle.baseX + Math.sin(player.z * 0.12 + obstacle.phase) * obstacle.drift;
        obstacle.x = clamp(obstacle.x, -ROAD_WIDTH * 0.48, ROAD_WIDTH * 0.48);
      }

      if (player.collisionRecovery <= 0 && Math.abs(obstacle.z - player.z) < 1.25) {
        if (Math.abs(obstacle.x - player.x) < obstacle.r + 0.55) crashPlayer(game);
      }
    }

    for (let i = game.papers.length - 1; i >= 0; i--) {
      const paper = game.papers[i];
      paper.age += dt;
      paper.progress = Math.min(1, paper.progress + dt / paper.duration);
      paper.x = lerp(paper.startX, paper.targetX, paper.progress);
      paper.z = lerp(paper.startZ, paper.targetZ, paper.progress);
      paper.y = 4 * paper.arcHeight * paper.progress * (1 - paper.progress);

      let removed = false;

      for (const obstacle of game.obstacles) {
        if (paper.y < 1.1 && hitRadius(paper, obstacle, obstacle.r + 0.28)) {
          obstacle.hitFlash = 0.2;
          game.missed += 1;
          game.papers.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (removed) continue;

      if (paper.progress >= 1) {
        if (paper.targetMailbox && !paper.targetMailbox.hit) {
          paper.targetMailbox.hit = true;
          paper.delivered = true;
          game.delivered += 1;
          game.score += 100;
          addDeliveryParticles(game, paper.targetMailbox);
        } else {
          game.missed += 1;
        }
        game.papers.splice(i, 1);
      }
    }

    for (const obstacle of game.obstacles) {
      obstacle.hitFlash = Math.max(0, (obstacle.hitFlash || 0) - dt);
    }

    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      if (game.obstacles[i].z < player.z) game.obstacles.splice(i, 1);
    }

    for (let i = game.particles.length - 1; i >= 0; i--) {
      const particle = game.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.z += particle.vz * dt;
      particle.vx *= Math.pow(0.4, dt);
      particle.vz *= Math.pow(0.4, dt);
      if (particle.life <= 0) game.particles.splice(i, 1);
    }

    return game;
  }

  return {
    constants: {
      TAU,
      ROAD_WIDTH,
      VIEW_DISTANCE,
      STREET_END,
      COURSE_START,
      LEVEL_END,
      HOUSE_OFFSET,
      MAX_PAPERS,
      THROW_RANGE,
      COLLISION_RECOVERY_TIME,
    },
    clamp,
    lerp,
    smoothstep,
    hitRadius,
    createGameState,
    resetGameState,
    buildStreet,
    buildObstacleCourse,
    nearestMailboxSide,
    getTargetMailbox,
    spawnThrow,
    spawnThrowAtTarget,
    getAimPreview,
    sampleThrowPoints,
    updateGame,
    crashPlayer,
  };
});
