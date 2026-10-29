// version v1.0
/* Classic scripts deliberately keep local file:// play working without a bundler. */
(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const resources = new Map();
  const legacy = ['race-logic.js', 'logic.js'];
  const boards = [...legacy, 'layouts.js', 'boards.js'];
  const action = [...legacy, 'action.js'];
  const manifest = {
    riddles: { scripts: ['riddles-data.js', 'riddles-logic.js', 'riddles.js'], css: ['family.css', 'extras.css'] },
    coloring: { scripts: ['coloring-art.js', 'coloring-logic.js', 'coloring.js'], css: ['family.css', 'extras.css'] },
    samloc: { scripts: ['vn-cards.js', 'vn-card-ui.js', 'samloc-logic.js', 'samloc.js'], css: ['family.css', 'extras.css'] },
    maubinh: { scripts: ['vn-cards.js', 'vn-card-ui.js', 'maubinh-logic.js', 'maubinh.js'], css: ['family.css', 'extras.css'] },
    caro: { scripts: ['online.js', 'caro-online-ui.js', ...boards] },
    ludo: { scripts: boards }, quan: { scripts: boards },
    '2048': { scripts: boards }, memory: { scripts: boards },
    snake: { scripts: action }, pool: { scripts: action }, breakout: { scripts: action },
    race: { scripts: ['race-logic.js', 'race-audio.js', 'race-2d.js', 'race.js'], css: 'race.css' },
    chess: { scripts: ['chess-logic.js', 'royal.js'], css: 'royal.css' },
    xiangqi: { scripts: ['xiangqi-logic.js', 'royal.js'], css: 'royal.css' },
    jigsaw: { scripts: ['jigsaw-logic.js', 'jigsaw-art.js', 'jigsaw.js'], css: ['family.css', 'culture.css'] },
    puppies: { scripts: ['puppies-catalog.js', 'puppies-logic.js', 'puppies.js'], css: 'puppies.css' },
  };
  for (const id of ['sudoku', 'uno', 'domino', 'monopoly', 'tienlen', 'xidach', 'werewolf',
    'battleship', 'minesweeper', 'tower', 'onet', 'blocks', 'reversi', 'jungle']) {
    manifest[id] = { scripts: [`${id}-logic.js`, `${id}.js`], css: `${id}.css` };
  }
  for (const id of ['draughts', 'match3', 'phom', 'penalty', 'wordchain', 'fishing']) {
    manifest[id] = { scripts: [`${id}-logic.js`, `${id}.js`], css: 'family.css' };
  }
  for (const id of ['coganh', 'piano']) manifest[id] = { scripts: [`${id}-logic.js`, `${id}.js`], css: ['family.css', 'culture.css'] };
  function resource(relative, kind) {
    const url = new URL(relative, base).href;
    if (resources.has(url)) return resources.get(url);
    const promise = new Promise((resolve, reject) => {
      const element = document.createElement(kind === 'css' ? 'link' : 'script');
      if (kind === 'css') { element.rel = 'stylesheet'; element.href = url; }
      else { element.src = url; element.async = false; }
      element.onload = () => { element.onload = element.onerror = null; resolve(); };
      element.onerror = () => {
        element.remove();
        resources.delete(url);
        reject(new Error('Chưa tải được tài nguyên game. Kiểm tra kết nối hoặc các file trong thư mục game, rồi thử lại.'));
      };
      // The shared library/3D stylesheet originally followed the 2D game styles.
      const editionStyles = document.querySelector('link[href="games/3d/three.css"]');
      if (kind === 'css' && relative !== 'race.css' && editionStyles) editionStyles.before(element);
      else document.head.append(element);
    });
    resources.set(url, promise);
    return promise;
  }
  async function scripts(paths) {
    for (const path of paths) await resource(path, 'js');
  }
  window.ArcadeLoader = {
    async load(game, edition) {
      if (game.frameSrc && edition !== '3d') return;
      const entry = manifest[game.id];
      if (!entry && !(game.id === 'delivery' && edition === '3d')) throw new Error('Không tìm thấy tài nguyên của game.');
      // Append base CSS before overrides; await both before mounting to avoid an unstyled board.
      const styles = [resource('games.css', 'css')];
      if (entry?.css) for (const path of Array.isArray(entry.css) ? entry.css : [entry.css]) styles.push(resource(path, 'css'));
      if (edition === '3d') styles.push(resource('3d/extended.css', 'css'));
      const code = (async () => {
        await scripts(['shared.js', ...(entry?.scripts || [])]);
        if (edition === '3d') {
          await scripts([...legacy, 'layouts.js', '3d/loader.js']);
          await window.Arcade3D.load(game.id);
        }
      })();
      await Promise.all([...styles, code]);
      if (!game.frameSrc && typeof window.ArcadeGames?.[game.id] !== 'function') throw new Error('Game chưa sẵn sàng. Hãy thử mở lại.');
    },
  };
})();
