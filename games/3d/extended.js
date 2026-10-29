/* Additional editions share the original rules and their public presentation.
   Adapters create individual meshes, never screenshots of a game or hidden hands. */
(function () {
  'use strict';
  const A = window.Arcade3D, S = window.ArcadeShared;
  const installed = new Set();
  A.editions = {};
  A.installEdition = function (id) {
    if (installed.has(id) || !A.editions[id]) return;
    const original = window.ArcadeGames[id];
    window.ArcadeGames[id] = function (host, options = {}) {
      if (options.renderer !== '3d') return original(host, options);
      let snapshot = null, meta = null, handle, scope;
      try {
        handle = original(host, { ...options, onSceneState(state, extra) { snapshot = state; meta = extra; } });
        scope = S.createScope();
        const workspace = host.querySelector('.game-workspace');
        const adapter = A.editions[id](workspace, () => ({ state: snapshot, meta }));
        const source = workspace.querySelector(adapter.source);
        if (!source) throw new Error('Chưa tìm thấy bàn chơi để dựng cảnh 3D.');
        const mount = document.createElement('div'); mount.className = 'three-edition-mount'; source.before(mount);
        const ui = { host, workspace, area: mount };
        const e = A.createScene(ui, scope, { id, label: adapter.label || id, width: 18, depth: 15, height: 2.5, yaw: 0, elevation: 1.02, ...adapter.camera });
        const controls = document.createElement('details'); controls.className = 'three-accessible';
        controls.innerHTML = '<summary>Bàn điều khiển dễ truy cập</summary>';
        for (const selector of adapter.hide || [adapter.source]) {
          for (const element of workspace.querySelectorAll(selector)) { element.classList.add('three-original-board'); controls.append(element); }
        }
        mount.append(controls);
        const world = createWorld(e, scope, workspace);
        adapter.setup?.(world);
        let dirty = true;
        const observer = new MutationObserver(records => {
          if (records.some(record => !mount.contains(record.target) || controls.contains(record.target))) dirty = true;
        });
        observer.observe(workspace, { subtree: true, childList: true, attributes: true, characterData: true });
        scope.cleanup(() => observer.disconnect());
        function sync(dt) {
          if (dirty || adapter.live) { dirty = false; world.sync(adapter.read(world, dt) || []); }
          adapter.animate?.(world, dt); e.render(dt);
        }
        sync(0); scope.loop(sync);
        // Keep the game's keyboard handlers and accessible controls available.
        scope.on(e.canvas, 'keydown', event => {
          if (!adapter.keyboard || event.ctrlKey || event.altKey || event.metaKey) return;
          const target = workspace.querySelector(`${adapter.keyboard} [tabindex="0"]`) || workspace.querySelector(adapter.keyboard);
          if (!target || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','Delete','Backspace','1','2','3','4','5','6','7','8','9','f','F','x','X','n','N'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          target.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, code: event.code, bubbles: true, cancelable: true }));
          e.canvas.focus({ preventScroll: true });
        });
        return {
          ...handle,
          restart() { handle.restart(); dirty = true; },
          setPaused(value) { handle.setPaused(value); scope.setPaused(value); },
          destroy() { scope.destroy(); handle.destroy(); },
        };
      } catch (error) { scope?.destroy(); handle?.destroy(); throw error; }
    };
    installed.add(id);
  };

  function createWorld(e, scope, workspace) {
    const objects = new Map();
    let outlineMaterial;
    const $ = selector => workspace.querySelector(selector);
    const all = selector => [...workspace.querySelectorAll(selector)];
    function enabled(element) {
      return element?.isConnected && !element.disabled && element.getAttribute('aria-disabled') !== 'true' && !element.closest('[hidden]') && !workspace.querySelector('.game-overlay');
    }
    function remove(item) {
      e.unhit(item.key); item.group.removeFromParent();
      if (item.texture) e.releaseTexture(item.texture);
      if (item.material) e.releaseMaterial(item.material);
      item.cancelled = true;
    }
    function surface(item, d) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = Math.max(64,Math.min(512,Math.round(256*(d.d||.9)/(d.w||.9))));
      const texture = e.trackTexture(new e.T.CanvasTexture(canvas)); texture.colorSpace = e.T.SRGBColorSpace;
      const material = e.trackMaterial(new e.T.MeshBasicMaterial({ map: texture, transparent: true, side: e.T.DoubleSide, depthWrite: false, toneMapped: false }));
      const face = e.mesh(e.geometry('edition-face', () => new e.T.PlaneGeometry(1, 1)), material, 0, (d.h || .18) / 2 + .012, 0, item.group);
      face.rotation.x = -Math.PI / 2; face.scale.set(d.w || .9, d.d || .9, 1); face.castShadow = false;
      item.texture = texture; item.material = material; item.face = face; item.canvas = canvas;
    }
    function paint(item, d) {
      if (!item.canvas) surface(item, d);
      const ctx = item.canvas.getContext('2d'),width=item.canvas.width,height=item.canvas.height; ctx.clearRect(0, 0, width, height);
      if (d.svg) {
        const image = new Image(), revision = item.revision = (item.revision || 0) + 1;
        image.onload = () => {
          if (e.disposed || item.cancelled || item.revision !== revision) return;
          ctx.clearRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height); item.texture.needsUpdate = true; e.invalidate();
        };
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d.svg);
      } else {
        ctx.fillStyle = d.ink || '#263c36'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const lines = String(d.text ?? '').split('\n');
        const size = Math.min(d.font || 144, (width-20) / Math.max(1, ...lines.map(t => [...t].length * .56)), (height-20)/(lines.length*1.25));
        ctx.font = `700 ${size}px "Segoe UI", "Segoe UI Emoji", Arial, sans-serif`;
        lines.forEach((line, i) => ctx.fillText(line, width/2, height/2 + (i - (lines.length - 1) / 2) * size * 1.15, width-20));
        item.texture.needsUpdate = true;
      }
    }
    function build(item, d) {
      const g = item.group, color = d.color || '#f0e5c8', w = d.w || .9, depth = d.d || .9, h = d.h || .18;
      const model = d.model || 'tile';
      if (model === 'shape') {
        e.mesh(d.geometry, color, 0, 0, 0, g);
        if(d.geometry.userData.outline){
          outlineMaterial ||= e.trackMaterial(new e.T.LineBasicMaterial({color:'#42554d',toneMapped:false}));
          const line=new e.T.Line(d.geometry.userData.outline,outlineMaterial);line.raycast=()=>{};g.add(line);
        }
      }
      else if (model === 'disc') e.cylinder(0, 0, 0, w * .46, w * .48, h, color, g);
      else if (model === 'gem') {
        const gem = e.mesh(e.geometry('edition-gem', () => new e.T.SphereGeometry(.46,4,2)), e.material(color, { metalness: .25, roughness: .23 }), 0, .2, 0, g); gem.scale.set(w, .9, depth);
      } else if (model === 'pawn' || model === 'chess' || model === 'dog' || model === 'person') {
        e.cylinder(0, .03, 0, w * .28, w * .38, .16, color, g);
        e.cylinder(0, .28, 0, w * .13, w * .25, .45, color, g);
        if (model === 'chess') {
          const role = d.role || 'P';
          if (role === 'N') {
            const neck = e.box(0, .61, 0, .25, .48, .32, color, g); neck.rotation.z = -.3;
            e.box(0, .83, -.13, .3, .24, .48, color, g);
          } else if (role === 'R') {
            e.cylinder(0, .58, 0, .29, .22, .3, color, g);
            for (let i = 0; i < 4; i++) e.box(Math.cos(i * Math.PI / 2) * .21, .79, Math.sin(i * Math.PI / 2) * .21, .16, .17, .16, color, g);
          } else {
            e.ball(0, .64, 0, role === 'P' ? .21 : .26, color, g);
            if (role === 'K') { e.box(0, 1, 0, .1, .35, .1, color, g); e.box(0, 1.05, 0, .3, .09, .1, color, g); }
            if (role === 'Q') for (let i = 0; i < 5; i++) e.ball(Math.cos(i * 1.257) * .17, .91, Math.sin(i * 1.257) * .17, .07, color, g, 8);
            if (role === 'B') e.ball(0, .95, 0, .1, color, g);
          }
        } else {
          e.ball(0, .67, 0, .23, model === 'person' ? '#eac4a0' : color, g);
          if (model === 'dog') { e.ball(-.23,.7,0,.13,'#876342',g); e.ball(.23,.7,0,.13,'#876342',g); e.ball(0,.62,.21,.09,'#493b31',g); }
        }
      } else if (model === 'ship') {
        e.box(0, .05, 0, w * .7, .25, depth * .84, color, g); e.box(0, .3, 0, w * .4, .32, depth * .45, '#c7d9d0', g);
      } else if (model === 'ring') {
        const ring=e.torus(0,0,0,.5,.025,color,g);ring.scale.set(w,depth,1);
      } else if (model === 'fish') {
        const body=e.ball(0,0,0,.5,color,g);body.scale.set(1.7,.7,1);
        const tail=e.mesh(e.geometry('fish-tail',()=>new e.T.ConeGeometry(.45,.6,3)),color,.9,0,0,g);tail.rotation.z=Math.PI/2;
        e.ball(-.5,.25,.2,.07,'#283d3d',g,8);
      } else if (model === 'ball') e.ball(0, 0, 0, w / 2, color, g);
      else if (model !== 'label') e.box(0, 0, 0, w, h, depth, color, g);
      if (d.text !== undefined || d.svg) paint(item, d);
    }
    function sync(descriptors) {
      const keys = new Set();
      for (const d of descriptors) {
        keys.add(d.key);
        const shape = JSON.stringify([d.model, d.role, d.w, d.d, d.h, d.color, d.geometry?.uuid]);
        let item = objects.get(d.key);
        if (item && item.shape !== shape) { remove(item); objects.delete(d.key); item = null; }
        if (!item) { item = { key: d.key, shape, group: e.group() }; objects.set(d.key, item); build(item, d); e.invalidate(); }
        const label = JSON.stringify([d.text, d.ink, d.svg]);
        if (item.label !== label) { item.label = label; if (d.text !== undefined || d.svg) paint(item, d); e.invalidate(); }
        const position = [d.x || 0, d.y ?? .25, d.z || 0];
        if (!item.group.position.equals(new e.T.Vector3(...position)) || item.group.rotation.y !== (d.rotate || 0)) e.invalidate();
        item.group.position.set(...position); item.group.rotation.y = d.rotate || 0; item.group.rotation.z = d.tilt || 0;
        item.descriptor = d;
        if (d.element || d.action) e.hit(item.group, d.key, () => {
          const current = item.descriptor;
          if (scope.paused || workspace.querySelector('.game-overlay')) return;
          if (current.action) current.action();
          else if (enabled(current.element)) current.element.click();
        }, { enabled: () => Boolean(item.descriptor.action) || enabled(item.descriptor.element) });
      }
      for (const [key, item] of objects) if (!keys.has(key)) { remove(item); objects.delete(key); e.invalidate(); }
    }
    scope.cleanup(() => { for (const item of objects.values()) remove(item); objects.clear(); });
    return { e, scope, workspace, $, all, sync, enabled, objects,
      table(w = 15, d = 13, color = '#426b59') {
        e.box(0, -.24, 0, w + .5, .5, d + .5, '#7c5942'); e.box(0, .035, 0, w, .05, d, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) e.box(x * (w / 2 - .6), -1.1, z * (d / 2 - .6), .55, 1.5, .55, '#594636');
      },
    };
  }
  A.editionHelpers = {
    selected: el => el.matches('.is-selected,.is-hint,[aria-pressed="true"],[aria-selected="true"]'),
    text: el => el?.textContent.trim() || '',
    grid(index, cols, rows = cols, step = 1.35) { return { x: (index % cols - (cols - 1) / 2) * step, z: (Math.floor(index / cols) - (rows - 1) / 2) * step }; },
  };
})();
