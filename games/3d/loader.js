// version v1.0
/* Lazy local scripts work over HTTP and file://. No CDN dependency at runtime. */
(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const resources = new Map();
  function script(relative) {
    const url = new URL(relative, base).href;
    if (resources.has(url)) return resources.get(url);
    const promise = new Promise((resolve, reject) => {
      const element = document.createElement('script');
      element.src = url;
      element.onload = () => { element.onload = element.onerror = null; resolve(); };
      element.onerror = () => { element.remove(); resources.delete(url); reject(new Error('Không tải được tài nguyên 3D cục bộ. Kiểm tra thư mục vendor và games/3d.')); };
      document.head.append(element);
    });
    resources.set(url, promise);
    return promise;
  }
  window.Arcade3D = {
    views: {},
    async load(id) {
      const assets = ['../../vendor/three-r180.min.js', 'engine.js', 'models.js'];
      if (!id || ['caro', 'ludo', 'quan', '2048', 'memory'].includes(id)) assets.push('board-views.js');
      if (!id || ['snake', 'pool', 'breakout', 'delivery'].includes(id)) assets.push('action-views.js');
      if (!id || id === 'race') assets.push('race-view.js');
      if (!id || id === 'delivery') assets.push('../../core.js', 'delivery.js');
      for (const asset of assets) await script(asset);
    },
    createView(id, ui, scope) {
      try { return this.views[id](ui, scope); }
      catch (error) { scope.destroy(); throw error; }
    },
  };
})();
