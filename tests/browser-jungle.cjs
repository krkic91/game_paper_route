// version v1.0
'use strict';
const K = require('./browser-expansion-kit.cjs');
const { assert, state, capture, restart, press, pauseAfter } = K;
const cell = index => `[data-jungle-cell="${index}"]`;

async function setup(page) {
  await capture(page, 'ArcadeJungle', {}, (s, name, L) => {
    const fixtures = {
      leap: [[21,6],[24,-5],[0,-2]],
      blocked: [[21,6],[22,-1],[0,-2]],
      trap: [[51,2],[52,-8],[0,-1]],
      win: [[10,2],[56,-8]],
    };
    if (!fixtures[name]) return;
    s.board.fill(0);
    for (const [index, piece] of fixtures[name]) s.board[index] = piece;
    Object.assign(s, { turn:0, phase:'play', winner:null, reason:null, ply:0, quiet:0, lastMove:null, history:[] });
    s.captured = L.initialBoard().filter(p => p && !s.board.includes(p));
    s.positions = [L.positionKey(s)];
  });
}
async function functional(page) {
  assert.equal(await page.locator('[data-jungle-cell]').count(),63);
  assert.equal(await page.locator('.jungle-animal').count(),16);
  await press(page,cell(48));
  assert.equal(await page.locator(cell(41)).evaluate(el => el.classList.contains('is-legal')),true);
  await pauseAfter(page, () => document.querySelector('[data-jungle-cell="41"]').click());
  await page.waitForFunction(() => window.__expansionState.ply === 2);
  await press(page,'[data-jungle-undo]');
  assert.equal((await state(page)).ply,0);
  await press(page,'[data-jungle-hint]');
  assert.equal(await page.locator('.jungle-cell.is-hint').count(),1);
  await press(page,'[data-jungle-flip]');
  assert.equal(await page.locator('[data-jungle-cell]').first().getAttribute('data-jungle-cell'),'62');
  await press(page,'[data-jungle-flip]');
  await page.locator('[data-jungle-mode]').selectOption('local');
  await page.locator('[data-jungle-first]').selectOption('1');
  assert.equal((await state(page)).turn,1);
  await page.locator(cell(0)).focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.jungleCell),'7');
  await page.locator('[data-jungle-first]').selectOption('0');

  await restart(page,'blocked');
  await press(page,cell(21));
  assert.equal(await page.locator(cell(24)).evaluate(el => el.classList.contains('is-legal')),false);
  await restart(page,'leap');
  await press(page,cell(21)); await press(page,cell(24));
  let current = await state(page);
  assert.equal(current.board[24],6); assert.equal(current.lastMove.capture,-5); assert.equal(current.lastMove.jump,true);
  await press(page,'[data-jungle-undo]');
  assert.equal((await state(page)).board[24],-5);

  await restart(page,'trap');
  await press(page,cell(51)); await press(page,cell(52));
  assert.equal((await state(page)).lastMove.capture,-8);
  await restart(page,'win');
  await press(page,cell(10)); await press(page,cell(3));
  current = await state(page);
  assert.equal(current.winner,0); assert.equal(current.reason,'den');
  await page.locator('.result-overlay').waitFor();
  await page.evaluate(() => { window.__fixture = 'opening'; });
  await press(page,'[data-again]');
  assert.equal((await state(page)).ply,0);
  assert.equal(await page.locator('.result-overlay').count(),0);
  // Queue a bot turn; the harness closes the game immediately and checks it stops.
  await page.locator('[data-jungle-mode]').selectOption('ai');
  await press(page,cell(48)); await press(page,cell(41));
}
async function responsive(page,{touch}) {
  await page.locator('[data-jungle-mode]').selectOption('local');
  await press(page,cell(48),touch,28); await press(page,cell(41),touch,28);
  assert.equal((await state(page)).board[41],1);
  await press(page,cell(0),touch,28); await press(page,cell(7),touch,28);
  assert.equal((await state(page)).ply,2);
  await press(page,'[data-jungle-flip]',touch);
  await press(page,'[data-jungle-undo]',touch);
  assert.equal((await state(page)).ply,1);
  const size = await page.locator(cell(41)).boundingBox();
  assert.ok(Math.abs(size.width - size.height) < 1.1,'board cells remain square');
}
K.run({ id:'jungle', api:'ArcadeJungle', setup, functional, responsive }).catch(error => { console.error(error); process.exitCode = 1; });
