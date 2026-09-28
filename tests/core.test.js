const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createGameState,
  getTargetMailbox,
  spawnThrow,
  updateGame,
  crashPlayer,
  constants,
} = require('../core.js');

function stepGame(game, seconds, input = {}) {
  const dt = 1 / 60;
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) {
    updateGame(game, dt, input);
  }
}

test('pedaling advances the rider forward and steering release stops lateral motion immediately', () => {
  const game = createGameState({ skipBuild: true });
  const startZ = game.player.z;

  stepGame(game, 0.5, { pedal: true });
  assert.ok(game.player.z > startZ + 5, 'pedaling should move the rider down the route');

  stepGame(game, 0.2, { steering: 1 });
  assert.ok(game.player.vx > 0, 'steering input should create lateral velocity');

  updateGame(game, 1 / 60, { stopSteering: true });
  assert.equal(game.player.vx, 0, 'mobile steering should cut out immediately when released');
});

test('targeted paper throws land on the selected mailbox and award score', () => {
  const game = createGameState({ skipBuild: true });
  game.mailboxes.push({ x: 6.2, z: 12, side: 1, hit: false, pulse: 0 });

  const paper = spawnThrow(game, 1);
  assert.ok(paper, 'a throw should spawn when a mailbox is in range');

  stepGame(game, 1.2);

  assert.equal(game.papers.length, 0, 'paper should resolve after finishing its arc');
  assert.equal(game.delivered, 1, 'mailbox should count as delivered');
  assert.equal(game.score, 100, 'delivery should award score');
  assert.equal(game.mailboxes[0].hit, true, 'mailbox should be marked as hit');
  assert.equal(game.missed, 0, 'a successful delivery should not count as a miss');
});

test('a mailbox with a paper already in flight is not targeted twice', () => {
  const game = createGameState({ skipBuild: true });
  const firstMailbox = { x: -6.2, z: 12, side: -1, hit: false, pulse: 0 };
  const secondMailbox = { x: 6.2, z: 16, side: 1, hit: false, pulse: 0 };
  game.mailboxes.push(firstMailbox, secondMailbox);

  const paper = spawnThrow(game, -1);
  assert.equal(paper.targetMailbox, firstMailbox);
  assert.equal(getTargetMailbox(game, 0), secondMailbox, 'aiming should move to the next available mailbox');
  assert.equal(getTargetMailbox(game, -1), null, 'the reserved mailbox should not be offered again');
});

test('missed throws increment the miss counter when no valid mailbox target exists', () => {
  const game = createGameState({ skipBuild: true });

  const paper = spawnThrow(game, 1);
  assert.ok(paper, 'fallback throws should still spawn without a mailbox');

  stepGame(game, 1.2);

  assert.equal(game.delivered, 0);
  assert.equal(game.missed, 1);
  assert.equal(game.score, 0);
});

test('collision recovery prevents repeated life loss', () => {
  const game = createGameState({ skipBuild: true });

  assert.equal(crashPlayer(game), true);
  assert.equal(game.player.hearts, 2, 'first collision should remove one life');
  assert.equal(crashPlayer(game), false, 'another collision during recovery should be ignored');
  assert.equal(game.player.hearts, 2);

  stepGame(game, constants.COLLISION_RECOVERY_TIME + 0.1, {});
  assert.equal(crashPlayer(game), true);
  assert.equal(game.player.hearts, 1, 'a collision after recovery should remove another life');
});

test('an obstacle disappears in the same update that the player passes it', () => {
  const game = createGameState({ skipBuild: true });
  game.obstacles.push({ type: 'trash', x: 0, z: 0.1, r: 1 });

  updateGame(game, 1 / 60, {});

  assert.equal(game.player.hearts, 2, 'collision should still register while passing the obstacle');
  assert.equal(game.obstacles.length, 0, 'a passed obstacle should be removed immediately');
});
