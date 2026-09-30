// version v1.0
/* Real WebGL scene lifecycle, camera, picking and GPU resource ownership. */
(function () {
  'use strict';
  const T = window.TramThree, A = window.Arcade3D, S = window.ArcadeShared;
  const live = new Set();
  let serial = 0;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function create(ui, scope, config = {}) {
    const id = config.id || 'game', uid = ++serial;
    ui.workspace.classList.add('three-workspace', `three-${id}`);
    let canvas = ui.canvas, viewport;
    if (canvas) {
      viewport = canvas.parentElement;
      viewport.removeAttribute('style'); viewport.className = 'three-viewport';
    } else {
      viewport = document.createElement('div'); viewport.className = 'three-viewport';
      canvas = document.createElement('canvas'); viewport.append(canvas); ui.area.prepend(viewport);
    }
    canvas.className = 'three-canvas'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', `${config.label || id} — scène 3D`.replace('scène','không gian'));
    const attributes = { antialias:true, alpha:false, powerPreference:'high-performance' };
    let context;
    try { context = canvas.getContext('webgl2', attributes); } catch { context = null; }
    if (!context) throw new Error('Thiết bị chưa bật WebGL 2. Hãy bật tăng tốc đồ họa trong trình duyệt, hoặc chơi bản 2D.');
    let renderer;
    try { renderer = new T.WebGLRenderer({canvas,context,...attributes}); }
    catch (error) { context.getExtension('WEBGL_lose_context')?.loseContext(); throw error; }
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    const scene = new T.Scene(); scene.background = new T.Color(config.background || '#263c36');
    if (config.driving) scene.fog = new T.Fog(config.background || '#bfd8ce', 45, 145);
    const camera = config.driving ? new T.PerspectiveCamera(52,1,.1,240) : new T.OrthographicCamera(-10,10,10,-10,.1,220);
    const root = new T.Group(); root.name = `game-${id}`; scene.add(root);
    const hemi = new T.HemisphereLight('#f6f2d6','#435e55',1.55); scene.add(hemi);
    const sun = new T.DirectionalLight('#fff0cb',2.25); sun.position.set(-12,25,12); sun.castShadow = true;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -(config.shadowSize || 18);
    sun.shadow.camera.right = sun.shadow.camera.top = config.shadowSize || 18;
    sun.shadow.camera.near = .1; sun.shadow.camera.far = 90;
    sun.shadow.normalBias = .035; sun.shadow.bias = -.00015;
    scene.add(sun); scene.add(sun.target);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    const geometryCache = new Map(), materialCache = new Map(), labelCache = new Map();
    const hits = new Map(), raycaster = new T.Raycaster(), pointer = new T.Vector2();
    const ground = new T.Plane(new T.Vector3(0,1,0),0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false, dirty = true, frames = 0, elapsed = 0, lost = false;
    let quality = window.innerWidth <= 700 ? 'low' : 'high';
    try { quality = localStorage.getItem('tramchoi.graphics') || quality; } catch { /* private browsing */ }
    if (!['low','high'].includes(quality)) quality = 'low';
    let yaw = config.yaw ?? .12, elevation = config.elevation ?? .86, zoom = 1, preset = 'angle', followX = 0;
    let cssWidth = 1, cssHeight = 1, activeGesture = null, orbited = false;
    const badge = document.createElement('div'); badge.className = 'three-scene-badge';
    badge.innerHTML = `${window.ArcadeArt.icon('cube',14)}<span>3D LIVE</span><i></i>`; viewport.append(badge);
    const toolbar = document.createElement('div'); toolbar.className = 'three-camera-bar';
    toolbar.setAttribute('role','group'); toolbar.setAttribute('aria-label','Camera và đồ họa 3D');
    toolbar.innerHTML = `<button data-camera="angle" aria-pressed="true" title="Góc nhìn 3D">${config.driving?'Bám xe':'Góc 3D'}</button><button data-camera="top" aria-pressed="false" title="Góc nhìn từ trên">Từ trên</button><span class="camera-separator"></span><button data-camera="out" aria-label="Thu nhỏ camera">−</button><button data-camera="in" aria-label="Phóng to camera">+</button><button data-camera="reset" aria-label="Đặt lại camera" title="Đặt lại camera">${window.ArcadeArt.icon('restart',14)}</button>${!config.driving && config.orbit !== false ? `<button data-camera="rotate" aria-label="Xoay camera 15 độ" title="Xoay camera">${window.ArcadeArt.icon('history',14)}</button>` : ''}<button class="three-quality" data-quality aria-label="Đổi chất lượng đồ họa"></button>`;
    viewport.append(toolbar);
    const hint = document.createElement('div'); hint.className = 'three-camera-hint';
    hint.textContent = config.driving ? 'Đường phố 3D · Camera bám theo xe' : config.orbit === false ? 'Góc nhìn 3D · Giữ nguyên hướng điều khiển' : 'Shift + kéo / chuột phải: xoay · Con lăn: thu phóng';
    viewport.append(hint);
    function trackGeometry(g) { geometries.add(g); return g; }
    function geometry(key, factory) {
      if (!geometryCache.has(key)) geometryCache.set(key,trackGeometry(factory()));
      return geometryCache.get(key);
    }
    function material(color, extra = {}) {
      const key = `${color}:${JSON.stringify(extra)}`;
      if (!materialCache.has(key)) {
        const m = new T.MeshStandardMaterial({color,roughness:.68,metalness:0,...extra});
        materials.add(m); materialCache.set(key,m);
      }
      return materialCache.get(key);
    }
    function mesh(g, mat, x=0,y=0,z=0, parent=root) {
      const m = new T.Mesh(g,typeof mat==='string' ? material(mat) : mat);
      m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    }
    function box(x,y,z,w,h,d,color,parent=root) {
      const m = mesh(geometry('box',()=>new T.BoxGeometry(1,1,1)),color,x,y,z,parent); m.scale.set(w,h,d); return m;
    }
    function ball(x,y,z,r,color,parent=root,detail=16) {
      const m = mesh(geometry(`ball${detail}`,()=>new T.SphereGeometry(1,detail,Math.max(8,detail/2))),color,x,y,z,parent); m.scale.setScalar(r); return m;
    }
    function cylinder(x,y,z,top,bottom,height,color,parent=root,sides=24) {
      const key = `cylinder:${top}:${bottom}:${height}:${sides}`;
      return mesh(geometry(key,()=>new T.CylinderGeometry(top,bottom,height,sides)),color,x,y,z,parent);
    }
    function torus(x,y,z,r,t,color,parent=root) {
      const m = mesh(geometry(`torus:${r}:${t}`,()=>new T.TorusGeometry(r,t,8,28)),color,x,y,z,parent); m.rotation.x = -Math.PI/2; return m;
    }
    function rod(a,b,r,color,parent=root) {
      const from = new T.Vector3(...a),to = new T.Vector3(...b),delta = to.clone().sub(from);
      const m = mesh(geometry('rod',()=>new T.CylinderGeometry(1,1,1,8)),color,0,0,0,parent);
      m.position.copy(from.add(to).multiplyScalar(.5)); m.scale.set(r,delta.length(),r);
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()); return m;
    }
    function group(parent=root) { const g = new T.Group(); parent.add(g); return g; }
    function label(value, {width=1.3,height=.65,color='#24392f',background=null,font=72,weight=700} = {}) {
      const key = JSON.stringify([String(value),width,height,color,background,font,weight]);
      if (!labelCache.has(key)) {
        const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(128,Math.round(512*height/width));
        const ctx = c.getContext('2d');
        if (background) { ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height); }
        ctx.fillStyle=color;ctx.font=`${weight} ${font}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value),256,c.height/2,480);
        const texture = new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);
        const mat=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false});
        materials.add(mat);labelCache.set(key,mat);
      }
      const m=mesh(geometry('labelplane',()=>new T.PlaneGeometry(1,1)),labelCache.get(key));
      m.scale.set(width,height,1);m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=false;return m;
    }
    function putLabel(value,x,y,z,opts={},parent=root) {
      const m=label(value,opts);parent.add(m);m.position.set(x,y,z);return m;
    }
    function hit(object,key,action,{enabled=()=>true,label:description=key}={}) {
      object.userData.pick=key; hits.set(key,{object,action,enabled,label:description});return object;
    }
    function hitPlane(key,x,y,z,w,d,action,enabled) {
      const m=mesh(geometry('hitplane',()=>new T.PlaneGeometry(1,1)),material('#ffffff',{transparent:true,opacity:0,depthWrite:false}),x,y,z);
      m.rotation.x=-Math.PI/2;m.scale.set(w,d,1);m.castShadow=false;m.receiveShadow=false;
      m.material.visible=false; // Raycaster can still test it; no transparent draw call is needed.
      return hit(m,key,action,{enabled:enabled || (()=>true)});
    }
    function updateCamera() {
      const aspect=cssWidth/cssHeight;
      if (config.driving) {
        camera.aspect=aspect;camera.fov=(aspect<1?65:50)/Math.sqrt(zoom);
        if (preset==='top') {camera.position.set(followX*.35,22,17);camera.lookAt(followX*.3,0,-14);}
        else {camera.position.set(followX*.38,6.9,11.5);camera.lookAt(followX*.25,1,-13);}
      } else {
        const angle=preset==='top'?Math.PI/2-.001:elevation;
        const target=new T.Vector3(0,config.targetY || 0,0);
        camera.position.set(Math.sin(yaw)*Math.cos(angle)*42,Math.sin(angle)*42,Math.cos(yaw)*Math.cos(angle)*42).add(target);
        camera.lookAt(target);camera.updateMatrixWorld(true);
        const width=config.width||18, depth=config.depth||18, height=config.height||2;
        let maxX=0,maxY=0;
        for(const x of [-width/2,width/2])for(const z of [-depth/2,depth/2])for(const y of [-.5,height]){
          const point=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
          maxX=Math.max(maxX,Math.abs(point.x));maxY=Math.max(maxY,Math.abs(point.y));
        }
        const half=Math.max(maxY,maxX/aspect)*1.13/zoom;
        camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
      }
      camera.updateProjectionMatrix();camera.updateMatrixWorld(true);dirty=true;
    }
    function applyQuality() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='low'?1.15:1.8));
      renderer.shadowMap.enabled=quality==='high';
      sun.shadow.mapSize.set(1024,1024);renderer.shadowMap.needsUpdate=true;
      toolbar.querySelector('[data-quality]').textContent=quality==='high'?'Đẹp':'Nhẹ';
      toolbar.querySelector('[data-quality]').setAttribute('aria-label',`Đồ họa ${quality==='high'?'đẹp; chuyển sang nhẹ':'nhẹ; chuyển sang đẹp'}`);
      resize();dirty=true;
    }
    function resize() {
      if(disposed)return;
      const rect=viewport.getBoundingClientRect();cssWidth=Math.max(1,Math.floor(rect.width));cssHeight=Math.max(1,Math.floor(rect.height));
      renderer.setSize(cssWidth,cssHeight,false);updateCamera();
      render(0,true);
    }
    function setPointer(event) {
      const rect=canvas.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    }
    function point(event,y=0) {
      if(disposed||lost||activeGesture?.orbit)return null;
      setPointer(event);ground.constant=-y;
      return raycaster.ray.intersectPlane(ground,new T.Vector3());
    }
    function pick(event) {
      setPointer(event);
      const allowed=[...hits.values()].filter(item=>item.enabled()&&item.object.visible);
      const intersections=raycaster.intersectObjects(allowed.map(item=>item.object),true);
      if(!intersections.length)return null;
      let object=intersections[0].object;
      while(object&&!object.userData.pick)object=object.parent;
      return object?hits.get(object.userData.pick):null;
    }
    scope.on(canvas,'contextmenu',event=>event.preventDefault());
    scope.on(canvas,'pointerdown',event=>{
      if(event.target!==canvas)return;
      canvas.focus({preventScroll:true});orbited=false;
      activeGesture={id:event.pointerId,x:event.clientX,y:event.clientY,originX:event.clientX,originY:event.clientY,orbit:!config.driving&&config.orbit!==false&&(event.button===2||event.shiftKey)};
      if(activeGesture.orbit){event.preventDefault();canvas.setPointerCapture(event.pointerId);}
    });
    scope.on(canvas,'pointermove',event=>{
      if(activeGesture?.id===event.pointerId&&activeGesture.orbit){
        const dx=event.clientX-activeGesture.x,dy=event.clientY-activeGesture.y;
        yaw-=dx*.009;elevation=clamp(elevation+dy*.006,.55,1.5);preset='angle';orbited=true;
        activeGesture.x=event.clientX;activeGesture.y=event.clientY;updateCamera();updateButtons();
      }else if(hits.size){const target=pick(event);canvas.style.cursor=target?'pointer':config.cursor||'default';}
    });
    scope.on(canvas,'pointerup',event=>{
      if(!activeGesture||activeGesture.id!==event.pointerId)return;
      const moved=Math.hypot(event.clientX-activeGesture.originX,event.clientY-activeGesture.originY);
      const orbit=activeGesture.orbit;activeGesture=null;
      if(!orbit&&!orbited&&moved<9&&event.button===0){const target=pick(event);target?.action();}
    });
    for(const name of ['pointercancel','lostpointercapture'])scope.on(canvas,name,()=>{activeGesture=null;},true);
    scope.onPause(()=>{activeGesture=null;});
    scope.on(window,'blur',()=>{activeGesture=null;},true);
    scope.on(canvas,'wheel',event=>{event.preventDefault();zoom=clamp(zoom*Math.exp(-event.deltaY*.001),.8,1.65);updateCamera();},false,{passive:false});
    function updateButtons(){for(const button of toolbar.querySelectorAll('[aria-pressed]'))button.setAttribute('aria-pressed',String(button.dataset.camera===preset));}
    scope.on(toolbar,'click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-quality')){quality=quality==='high'?'low':'high';try{localStorage.setItem('tramchoi.graphics',quality);}catch{}applyQuality();}
      else {
        const action=button.dataset.camera;
        if(action==='in')zoom=clamp(zoom*1.15,.8,1.65);
        else if(action==='out')zoom=clamp(zoom/1.15,.8,1.65);
        else if(action==='rotate'){yaw+=Math.PI/12;preset='angle';}
        else if(action==='reset'){zoom=1;yaw=config.yaw??.12;elevation=config.elevation??.86;preset='angle';}
        else preset=action;
        updateCamera();updateButtons();render(0,true);
      }
      canvas.focus({preventScroll:true});
    });
    scope.on(canvas,'webglcontextlost',event=>{
      event.preventDefault();if(disposed)return;lost=true;scope.setPaused(true);
      ui.host.dispatchEvent(new CustomEvent('arcade:3d-lost',{bubbles:true}));
    },true);
    function render(dt=0,force=false) {
      if(disposed||lost)return;
      elapsed+=dt;
      if(!dirty&&!force)return;
      renderer.shadowMap.needsUpdate=true;
      renderer.render(scene,camera);frames++;dirty=false;
      canvas.dataset.rendered='true';canvas.dataset.engine='webgl2';
    }
    const observer=new ResizeObserver(resize);observer.observe(viewport);
    function dispose() {
      if(disposed)return;disposed=true;observer.disconnect();live.delete(api);
      for(const texture of textures)texture.dispose();
      for(const mat of materials)mat.dispose();
      for(const g of geometries)g.dispose();
      sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();
      scene.clear();hits.clear();geometryCache.clear();materialCache.clear();labelCache.clear();
      textures.clear();materials.clear();geometries.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();
      canvas.remove();
    }
    const api={
      id,uid,T,ui,scope,scene,root,camera,renderer,canvas,viewport,toolbar,reduced,
      floorColor: {caro:'#344e3d',ludo:'#514b3d',quan:'#48503c','2048':'#494653',memory:'#58484a',pool:'#244038',snake:'#2d4b3d',breakout:'#2b3f51'}[id] || '#273f37',
      geometry,trackGeometry,material,mesh,box,ball,cylinder,torus,rod,group,label,putLabel,hit,hitPlane,point,
      trackTexture(texture){textures.add(texture);return texture;},
      trackMaterial(mat){materials.add(mat);return mat;},
      get time(){return elapsed;},get disposed(){return disposed;},get interacting(){return Boolean(activeGesture?.orbit);},
      invalidate(){dirty=true;},render,resize,dispose,
      follow(x){followX=x;updateCamera();},
      project(x,y,z){const p=new T.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*cssWidth,y:(-.5*p.y+.5)*cssHeight};},
      accessible(element){
        const details=document.createElement('details');details.className='three-accessible';
        details.innerHTML='<summary>Contrôles accessibles</summary>'.replace('Contrôles accessibles','Bàn điều khiển dễ truy cập');
        element.classList.add('three-original-board');details.append(element);ui.area.append(details);return details;
      },
      diagnostics(){
        const rect=canvas.getBoundingClientRect();scene.updateMatrixWorld(true);
        return {id,uid,frames,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
          targets:[...hits.entries()].filter(([,value])=>value.enabled()).map(([key,value])=>{const v=value.object.getWorldPosition(new T.Vector3());const p=api.project(v.x,v.y,v.z);return {key,x:rect.left+p.x,y:rect.top+p.y};})};
      },
    };
    live.add(api);scope.cleanup(dispose);applyQuality();
    return api;
  }
  A.createScene=create;
  A.diagnostics=()=>[...live].map(view=>view.diagnostics());
})();
