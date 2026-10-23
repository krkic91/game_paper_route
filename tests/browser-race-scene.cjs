// version v1.0
/* Renderer regressions using native Canvas/WebGL and deterministic race states.
 * Start scripts/serve.js, then run with the Playwright tooling on NODE_PATH.
 * These fixtures do not replace the real-input tests in browser-race.cjs. */
'use strict';
const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOTS || join(__dirname, '../test-results/race-scene');
const engines = (process.env.RACE_BROWSERS || 'chromium,webkit').split(',');
mkdirSync(join(output, 'screenshots'), { recursive: true });
const report = {
  environment: 'Headless desktop browser engines on Windows, 1180 x 820. No physical iPhone/iPad or virtual machine.',
  coverage: 'Native Canvas screen-space lean checks for player/rivals; actual mounted Three.js renderer. Real start/pause/resume/close and camera button clicks; independently constructed RaceLogic fixture states are drawn with the game scope paused. Fixture screenshots show injected scenes, not a completed human-input race, and their HUD remains the paused live game HUD.',
  runs: [],
};
function save() { writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2)); }

async function run(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, reducedMotion: 'no-preference' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await page.goto(base);
    await page.waitForFunction(() => window.ArcadeLoader);
    await page.evaluate(async () => {
      // Both real renderers are inspected by this regression test. Preload
      // them before capturing factories; UI mounting still uses the route.
      await window.ArcadeLoader.load({ id: 'race' }, '2d');
      await window.ArcadeLoader.load({ id: 'race' }, '3d');
    });
    await page.waitForFunction(() => window.Arcade3D && window.RaceLogic);
    const canvasLean = await page.evaluate(() => {
      const results = [];
      for (const steer of [-1, 0, 1]) for (const reducedMotion of [false, true]) {
        const state = window.RaceLogic.createRace(() => 0), rivals = state.rivals;
        state.obstacles = []; state.rivals = []; state.speed = 12;
        if (steer) for (let i = 0; i < 60; i++) window.RaceLogic.stepRace(state, 1 / 120, { steer });
        state.rivals = rivals;
        rivals.forEach((rival, i) => Object.assign(rival, { distance: state.distance + 6 + i * 5, lean: state.lean }));
        const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 550;
        const ctx = canvas.getContext('2d'), ellipse = ctx.ellipse, riders = [];
        let groundX;
        ctx.ellipse = function (x, y, rx, ry, ...rest) {
          // Measure actual native Canvas transforms of the unrotated ground
          // shadow and the helmet, rather than asserting an angle formula.
          const point = this.getTransform().transformPoint({ x, y });
          if (rx === 18 && ry === 8) groundX = point.x;
          if (rx === 9 && ry === 10) riders.push({ groundX, headX: point.x });
          return ellipse.call(this, x, y, rx, ry, ...rest);
        };
        window.createRace2D({ ctx }).draw(state, { reducedMotion }, 0);
        if (riders.length !== 4) throw new Error('Expected player and three visible rivals in Canvas lean check');
        for (const { groundX, headX } of riders) {
          const delta = headX - groundX;
          if (steer ? delta * steer <= .1 : Math.abs(delta) > .001)
            throw new Error(`Canvas rider leans against steering: steer=${steer}, reducedMotion=${reducedMotion}, head-ground=${delta}`);
        }
        results.push({ steer, reducedMotion, riders });
      }
      return results;
    });
    await page.evaluate(async () => {
      const A = window.Arcade3D;
      await A.load();
      const originalScene = A.createScene, originalView = A.createView;
      A.createScene = function (ui, scope, config) {
        const e = originalScene.apply(this, arguments);
        if (config.id === 'race') window.__raceScene = { e, scope };
        return e;
      };
      A.createView = function (id) {
        const view = originalView.apply(this, arguments);
        if (id === 'race') window.__raceScene.view = view;
        return view;
      };
      location.hash = '#play/race/3d';
    });
    await page.locator('[data-start]').waitFor();
    await page.locator('[data-start]').click();
    await page.waitForFunction(() => Number(document.querySelector('.race-workspace')?.dataset.distance) > .1);
    await page.locator('#pause-game').click();
    await page.waitForFunction(() => document.querySelector('.race-workspace')?.dataset.mode === 'paused');
    const paused = await page.evaluate(() => ({ time: document.querySelector('.race-workspace').dataset.time, frames: window.__raceScene.e.diagnostics().frames }));
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(() => ({ time: document.querySelector('.race-workspace').dataset.time, frames: window.__raceScene.e.diagnostics().frames })), paused, 'Real pause freezes simulation and render loop');
    await page.locator('#resume-game').click();
    // Pause the actual scope without the pause overlay so screenshots stay
    // visible. Camera input is tested after explicitly resuming the scope.
    await page.evaluate(() => {
      const h = window.__raceScene;
      h.scope.setPaused(true);
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      h.check = check;
      h.fixture = at => {
        const state = window.RaceLogic.createRace(() => 0), track = window.RaceLogic.trackAt(at, 0);
        Object.assign(state, { distance: at, time: at / 12, speed: 12, surface: track.surface, grade: track.grade, cadence: 75, pedalPhase: 1.2, wheelAngle: 2.4 });
        state.rivals.forEach((rival, i) => Object.assign(rival, { distance: at + 6 + i * 8, speed: 11, cadence: 70, pedalPhase: i, wheelAngle: i + 1 }));
        return state;
      };
      h.inspect = () => {
        const { e } = h;
        let objects = 0, vertices = 0, instances = 0, ribbons = 0, roadTriangles = 0;
        e.scene.updateMatrixWorld(true);
        e.root.traverseVisible(object => {
          objects++;
          check([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray(), ...object.matrixWorld.elements].every(Number.isFinite), `Non-finite transform on ${object.type}`);
          if (object.isInstancedMesh) {
            instances += object.count;
            check(Array.from(object.instanceMatrix.array.subarray(0, object.count * 16)).every(Number.isFinite), 'Non-finite instance matrix');
            if (object.instanceColor) check(Array.from(object.instanceColor.array.subarray(0, object.count * 3)).every(Number.isFinite), 'Non-finite instance colour');
          }
          const geometry = object.geometry;
          if (!geometry) return;
          const position = geometry.getAttribute('position');
          if (!position) return;
          const count = Math.min(position.count, geometry.drawRange.count);
          vertices += count;
          check(Array.from(position.array.subarray(0, count * 3)).every(Number.isFinite), 'Non-finite visible geometry');
          // Road ribbons are non-indexed dynamic triangle strips; their normal
          // vectors alone cannot catch a reversed winding culled by WebGL.
          if (geometry.index || position.usage !== e.renderer.getContext().DYNAMIC_DRAW || !geometry.getAttribute('normal')) return;
          ribbons++;
          const normal = geometry.getAttribute('normal');
          check(Array.from(normal.array.subarray(0, count * 3)).every(Number.isFinite), 'Non-finite road normals');
          for (let i = 0; i < count; i += 3) {
            const ax = position.getX(i + 1) - position.getX(i), az = position.getZ(i + 1) - position.getZ(i);
            const bx = position.getX(i + 2) - position.getX(i), bz = position.getZ(i + 2) - position.getZ(i);
            check(az * bx - ax * bz > 0, 'Road triangle must face up, not be culled from above');
            roadTriangles++;
          }
        });
        check(objects > 100 && ribbons >= 7 && roadTriangles > 100, 'Expected complete road and rider geometry');
        check([...e.camera.position.toArray(), ...e.camera.quaternion.toArray(), ...e.camera.projectionMatrix.elements, ...e.camera.matrixWorldInverse.elements, e.camera.fov].every(Number.isFinite), 'Non-finite camera');
        return { objects, vertices, instances, ribbons, roadTriangles, surface: e.canvas.dataset.raceSurface, camera: { position: e.camera.position.toArray(), fov: e.camera.fov } };
      };
      // Identify rider components by their model geometry, not array indices.
      const bikes = [];
      h.e.root.traverse(object => {
        if (!object.isGroup) return;
        const wheels = object.children.filter(child => child.isGroup && child.children.filter(mesh => mesh.geometry?.type === 'TorusGeometry').length === 2);
        if (wheels.length === 2) bikes.push({ object, wheels });
      });
      check(bikes.length === 4, 'One player and three articulated rival bikes');
      h.player = bikes[0];
      h.pedals = h.player.object.children.filter(mesh => mesh.geometry?.type === 'BoxGeometry' && Math.abs(mesh.scale.x - .17) < 1e-6 && Math.abs(mesh.scale.y - .035) < 1e-6 && Math.abs(mesh.scale.z - .09) < 1e-6);
      check(h.pedals.length === 2, 'Two physical pedal meshes');
      h.particles = h.e.root.children.find(mesh => mesh.isInstancedMesh && mesh.geometry.type === 'SphereGeometry');
      check(Boolean(h.particles), 'Instanced road spray/dust renderer exists');
      h.finish = h.e.root.children.find(group => group.isGroup && group.children.filter(mesh => mesh.geometry?.type === 'BoxGeometry').length >= 21);
      check(Boolean(h.finish), 'Finish gate and chequered stripe exist');
    });
    const fixtures = [];
    for (const [distance, expected] of [[0, 'asphalt'], [190, 'wet'], [440, 'gravel'], [825, 'gravel'], [990, 'asphalt']]) {
      const inspection = await page.evaluate(distance => {
        const h = window.__raceScene, state = h.fixture(distance);
        h.view.draw(state, { reducedMotion: false }, 1 / 60);
        h.check(h.finish.visible === (distance > 850), 'Finish gate visibility follows distance');
        return h.inspect();
      }, distance);
      assert.equal(inspection.surface, expected);
      fixtures.push({ distance, ...inspection });
      await page.locator('.three-viewport').screenshot({ path: join(output, 'screenshots', `${engine}-fixture-${distance}m-${expected}.png`) });
    }
    const animation = await page.evaluate(() => {
      const h = window.__raceScene, state = h.fixture(40);
      state.obstacles = []; state.rivals = [];
      h.view.draw(state, { reducedMotion: false }, 0);
      const pose = () => ({ pedals: h.pedals.map(mesh => mesh.position.toArray()), wheels: h.player.wheels.map(wheel => wheel.rotation.x) });
      const initial = pose();
      for (let i = 0; i < 6; i++) window.RaceLogic.stepRace(state, .05, {});
      h.view.draw(state, { reducedMotion: false }, .05);
      const pedaling = pose(), phase = state.pedalPhase;
      h.check(JSON.stringify(pedaling.pedals) !== JSON.stringify(initial.pedals), 'Pedaling moves the pedal meshes');
      h.check(pedaling.wheels[0] !== initial.wheels[0], 'Moving wheels rotate');
      for (let i = 0; i < 6; i++) window.RaceLogic.stepRace(state, .05, { coast: true });
      h.view.draw(state, { reducedMotion: false }, .05);
      const coasting = pose();
      h.check(state.pedalPhase === phase, 'Coasting stops crank phase');
      h.check(JSON.stringify(coasting.pedals) === JSON.stringify(pedaling.pedals), 'Coasting feet stay on stationary pedals');
      h.check(coasting.wheels[0] !== pedaling.wheels[0], 'Coasting wheels keep turning');
      h.inspect();
      return { initial, pedaling, coasting };
    });
    const effects = await page.evaluate(() => {
      const h = window.__raceScene, state = h.fixture(190);
      state.event = { id: 1, type: 'puddle', time: state.time, strength: .6 };
      state.impact = { type: 'puddle', strength: .6, time: .5 };
      h.view.draw(state, { reducedMotion: false }, 1 / 60);
      const active = h.inspect();
      h.check(h.particles.count >= 16, 'Puddle event produces splash instances');
      const count = h.particles.count;
      h.cameraFixture = state;
      const normalFov = h.e.camera.fov;
      h.view.reset(); h.view.draw(state, { reducedMotion: true }, 1 / 60);
      const reduced = h.inspect();
      h.check(h.particles.count === 0, 'Reduced motion suppresses spray particles');
      h.check(h.e.camera.position.y === 4.9, 'Reduced motion removes camera road vibration');
      h.check(h.e.camera.fov < normalFov, 'Reduced motion removes speed-based FOV expansion');
      return { particles: count, active, reduced };
    });
    async function cameraAction(action) {
      await page.evaluate(() => window.__raceScene.scope.setPaused(false));
      await page.locator(`[data-camera="${action}"]`).click();
      return page.evaluate(() => {
        const h = window.__raceScene;
        h.scope.setPaused(true); h.view.reset();
        h.view.draw(h.cameraFixture, { reducedMotion: true }, 0);
        return h.inspect().camera;
      });
    }
    const camera = { top: await cameraAction('top') };
    assert.equal(camera.top.position[1], 22, 'Top camera preset survives road-aware draw');
    camera.zoom = await cameraAction('in');
    assert.ok(camera.zoom.fov < camera.top.fov, 'Toolbar zoom changes camera projection');
    camera.follow = await cameraAction('angle');
    assert.equal(camera.follow.position[1], 4.9, 'Follow camera returns to rider height');
    await page.setViewportSize({ width: 744, height: 1133 });
    await page.waitForTimeout(100);
    camera.resized = await page.evaluate(() => window.__raceScene.inspect().camera);
    assert.equal(camera.resized.position[1], 4.9, 'Paused resize preserves road-aware camera pose');
    await page.locator('.three-viewport').screenshot({ path: join(output, 'screenshots', `${engine}-fixture-reduced-motion-resized.png`) });

    // Observe disposal of every distinct resource reachable from scene meshes,
    // including dynamic ribbons, spoke lines and instanced particle geometry.
    const resources = await page.evaluate(() => {
      const h = window.__raceScene, sets = { geometry: new Set(), material: new Set(), texture: new Set() };
      h.e.scene.traverse(object => {
        if (object.geometry) sets.geometry.add(object.geometry);
        for (const material of (Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean)) {
          sets.material.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) sets.texture.add(value);
        }
      });
      h.disposal = { expected: {}, disposed: { geometry: 0, material: 0, texture: 0 } };
      for (const [kind, values] of Object.entries(sets)) {
        h.disposal.expected[kind] = values.size;
        for (const resource of values) resource.addEventListener('dispose', () => { h.disposal.disposed[kind]++; });
      }
      h.gl = h.e.renderer.getContext();
      return h.disposal.expected;
    });
    await page.locator('#close-game').click();
    await page.locator('#player-dialog').waitFor({ state: 'hidden' });
    const disposed = await page.evaluate(() => {
      const h = window.__raceScene;
      return { ...h.disposal, sceneDisposed: h.e.disposed, lost: h.gl.isContextLost(), live: window.Arcade3D.diagnostics().length };
    });
    assert.deepEqual(disposed.disposed, resources, 'All scene geometries/materials/textures must be disposed exactly once');
    assert.ok(resources.geometry > 10 && resources.texture >= 5);
    assert.ok(disposed.sceneDisposed && disposed.lost && disposed.live === 0, 'Close releases WebGL scene and context');
    assert.deepEqual(errors, [], 'No JavaScript, shader or WebGL console errors');
    return { canvasLean, fixtures, animation, effects, camera, disposed };
  } finally { await context.close(); }
}

(async () => {
  for (const name of engines) {
    const type = { chromium, webkit }[name]; assert.ok(type, `Unknown browser ${name}`);
    const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await type.launch({ headless: true, executablePath: name === 'chromium' ? process.env.BROWSER_PATH || (existsSync(edge) ? edge : undefined) : undefined });
    try {
      const measurements = await run(browser, name);
      report.runs.push({ engine: name, version: browser.version(), passed: true, measurements });
      console.log(`${name} actual WebGL fixture scenes: passed`);
    } catch (error) {
      report.runs.push({ engine: name, version: browser.version(), passed: false, error: error.stack });
      console.error(`${name}: ${error.stack}`);
    } finally { await browser.close(); save(); }
  }
  report.passed = report.runs.length > 0 && report.runs.every(run => run.passed);
  save(); if (!report.passed) process.exitCode = 1;
})().catch(error => { report.passed = false; report.error = error.stack; save(); console.error(error); process.exitCode = 1; });
