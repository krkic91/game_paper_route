// version v1.0
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const source = readFileSync(join(__dirname, '../games/shared.js'), 'utf8');
function environment() {
  let time = 1000,
    id = 0;
  const frames = new Map();
  const context = vm.createContext({
    window: { ArcadeArt: { icon: () => '' } },
    document: { hidden: false },
    requestAnimationFrame: (fn) => {
      frames.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (key) => frames.delete(key),
    Element: class {},
  });
  vm.runInContext(source, context);
  const scope = context.window.ArcadeShared.createScope();
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      time += 16;
      const current = [...frames.values()];
      frames.clear();
      current.forEach((fn) => fn(time));
    }
  }
  return { scope, tick, frames, context };
}
test('game lifecycle: AI timers and game loops stop while paused or hidden', () => {
  const { scope, tick, context } = environment();
  let turns = 0,
    updates = 0;
  scope.after(0.1, () => turns++);
  scope.loop(() => updates++);
  tick(3);
  assert.equal(turns, 0);
  scope.setPaused(true);
  const before = updates;
  tick(100);
  assert.equal(turns, 0);
  assert.equal(updates, before);
  scope.setPaused(false);
  context.document.hidden = true;
  tick(100);
  assert.equal(turns, 0);
  context.document.hidden = false;
  tick(10);
  assert.equal(turns, 1);
  assert.ok(updates > before);
  scope.destroy();
});
test('game lifecycle: restart clears old AI callbacks, even during a timer callback', () => {
  const { scope, tick } = environment();
  const events = [];
  scope.after(0.01, () => {
    events.push('first');
    scope.clearTimers();
    scope.after(0.01, () => events.push('new game'));
  });
  scope.after(0.01, () => events.push('stale game'));
  tick(10);
  assert.deepEqual(events, ['first', 'new game']);
  scope.destroy();
});
test('game lifecycle: closing cancels animation frames, timers, and all input handlers', () => {
  const { scope, tick, frames } = environment();
  const target = new EventTarget();
  let input = 0,
    timers = 0,
    cleaned = 0;
  scope.on(target, 'move', () => input++);
  scope.after(0.1, () => timers++);
  scope.cleanup(() => cleaned++);
  target.dispatchEvent(new Event('move'));
  assert.equal(input, 1);
  scope.destroy();
  scope.destroy();
  target.dispatchEvent(new Event('move'));
  tick(100);
  assert.equal(input, 1);
  assert.equal(timers, 0);
  assert.equal(frames.size, 0);
  assert.equal(cleaned, 1);
});
test('game lifecycle: release handlers still work during pause to avoid stuck buttons', () => {
  const { scope } = environment();
  const target = new EventTarget();
  let pressed = 0,
    released = 0;
  scope.on(target, 'down', () => pressed++);
  scope.on(target, 'up', () => released++, true);
  scope.setPaused(true);
  target.dispatchEvent(new Event('down'));
  target.dispatchEvent(new Event('up'));
  assert.equal(pressed, 0);
  assert.equal(released, 1);
  scope.destroy();
});
