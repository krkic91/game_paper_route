// version v1.0
'use strict';
const { assert, capture, state, press, restart, pauseAfter, run } = require('./browser-expansion-kit.cjs');
function fixture(s, name) {
  if (name === 'clear') {
    s.active = { kind: 'I', x: 2, y: 16, rotation: 1 };
    for (let y = 16; y < 20; y++) s.board[y] = Array.from({ length: 10 }, (_, x) => x === 4 ? null : 'J');
  }
  if (name === 'over') { s.active = { kind: 'T', x: 3, y: -1, rotation: 0 }; s.board[1].fill('J'); }
}
const selector = name => `[data-blocks-action="${name}"]`;
run({
  id: 'blocks', api: 'ArcadeBlocks',
  setup: page => capture(page, 'ArcadeBlocks', {}, fixture),
  async functional(page) {
    assert.equal(await page.locator('[data-blocks-next] .blocks-mini').count(), 3);
    const first = await state(page);
    await page.keyboard.press('ArrowLeft'); assert.equal((await state(page)).active.x, first.active.x - 1);
    await page.keyboard.press('c'); const stored = await state(page); assert.equal(stored.hold, first.active.kind); assert.equal(stored.holdUsed, true);
    await page.keyboard.press('c'); assert.equal((await state(page)).active.kind, stored.active.kind);
    await pauseAfter(page, () => { document.querySelector('[data-blocks-action="left"]').click(); });
    await page.locator('.blocks-workspace').focus(); await page.keyboard.press('Space');
    assert.equal((await state(page)).pieces, 1); assert.equal((await state(page)).holdUsed, false);
    // A held key is forgotten on blur, so returning to the game does not slide a new piece.
    await page.keyboard.down('ArrowLeft'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const afterBlur = (await state(page)).active.x; await page.waitForTimeout(240); assert.equal((await state(page)).active.x, afterBlur); await page.keyboard.up('ArrowLeft');
    await restart(page, 'clear'); await press(page, selector('drop'));
    assert.equal((await state(page)).lines, 4); assert.equal((await state(page)).score, 800);
    await restart(page, 'over'); await press(page, selector('drop')); await page.locator('.result-overlay').waitFor();
    assert.equal((await state(page)).phase, 'over'); await page.locator('[data-again]').click(); assert.equal((await state(page)).phase, 'play');
    assert.equal((await state(page)).score, 0);
  },
  async responsive(page, { touch }) {
    await press(page, selector('left'), touch); await press(page, selector('right'), touch);
    await press(page, selector('hold'), touch); assert.equal((await state(page)).holdUsed, true);
    await press(page, selector('rotate'), touch); await press(page, selector('counter'), touch);
    await press(page, selector('soft'), touch); await press(page, selector('drop'), touch);
    assert.equal((await state(page)).pieces, 1);
  },
}).catch(error => { console.error(error); process.exitCode = 1; });
