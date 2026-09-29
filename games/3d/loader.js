/* Lazy local scripts work over HTTP and file://. No CDN dependency at runtime. */
(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const loaded = new Set();
  let pending = null;
  function script(relative) {
    const url = new URL(relative, base).href;
    if (loaded.has(url)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const element = document.createElement('script');
      element.src = url;
      element.onload = () => { loaded.add(url); resolve(); };
      element.onerror = () => { element.remove(); reject(new Error('Không tải được tài nguyên 3D cục bộ. Kiểm tra thư mục vendor và games/3d.')); };
      document.head.append(element);
    });
  }
  window.Arcade3D = {
    views: {},
    async load() {
      if (!pending) {
        pending = (async () => {
          await script('../../vendor/three-r180.min.js');
          await script('../../core.js');
          await script('engine.js');
          await script('models.js');
          await script('board-views.js');
          await script('action-views.js');
          await script('delivery.js');
        })().catch(error => { pending = null; throw error; });
      }
      return pending;
    },
    createView(id, ui, scope) {
      try { return this.views[id](ui, scope); }
      catch (error) { scope.destroy(); throw error; }
    },
  };
})();
