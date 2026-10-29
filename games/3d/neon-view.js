/* Standalone iframe edition: same simulation/input/HUD, instanced WebGL actors. */
(function(){
  'use strict';
  const base=new URL('../../vendor/three-r180.min.js',document.currentScript.src);
  window.ArcadeNeon3D={async create(canvas){
    if(!window.TramThree)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=base.href;script.onload=resolve;script.onerror=()=>reject(new Error('Không tải được bộ dựng cảnh 3D cục bộ.'));document.head.append(script);});
    const T=window.TramThree,gl=canvas.getContext('webgl2',{antialias:true});
    if(!gl)throw new Error('Thiết bị chưa bật WebGL 2. Bạn có thể chuyển sang bản 2D.');
    const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;
    const scene=new T.Scene();scene.background=new T.Color('#080b20');
    const camera=new T.OrthographicCamera(-10,10,10,-10,.1,200);
    scene.add(new T.HemisphereLight('#c8eaff','#2c1652',2.5));const light=new T.DirectionalLight('#ffd3f2',3);light.position.set(-8,20,12);scene.add(light);
    const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:'#11172b',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-.1;scene.add(floor);
    const grid=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#243456'}),202),gridMatrix=new T.Matrix4();
    for(let i=0;i<=100;i++){gridMatrix.makeScale(.02,.02,160);gridMatrix.setPosition(i*1.6-80,0,0);grid.setMatrixAt(i,gridMatrix);gridMatrix.makeScale(160,.02,.02);gridMatrix.setPosition(0,0,i*1.6-80);grid.setMatrixAt(i+101,gridMatrix);}grid.frustumCulled=false;scene.add(grid);
    const geometries={sphere:new T.SphereGeometry(1,12,8),gem:new T.SphereGeometry(1,4,2),box:new T.BoxGeometry(1,1,1),ring:new T.TorusGeometry(1,.055,6,32),rod:new T.CylinderGeometry(1,1,1,6)};
    const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.38,metalness:.22});
    const pools=new Map(),matrix=new T.Matrix4(),vector=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),rotationPart=new T.Quaternion(),color=new T.Color();
    const axes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)];
    let disposed=false,width=1,height=1,top=false,last=null,frames=0;
    const button=document.createElement('button');button.type='button';button.textContent='Góc 3D';button.setAttribute('aria-label','Đổi camera 3D / từ trên');
    button.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:15;background:#162640;color:#b5eafa;border:1px solid #5c8eae;border-radius:8px;padding:9px 14px;font:600 12px sans-serif;min-height:38px';
    document.body.append(button);button.onclick=()=>{top=!top;button.textContent=top?'Từ trên':'Góc 3D';draw(last);};
    function instances(key,kind,items){
      let pool=pools.get(key);
      if(!pool||pool.capacity<items.length){
        if(pool){scene.remove(pool.mesh);pool.mesh.dispose();}
        const capacity=Math.max(16,2**Math.ceil(Math.log2(Math.max(1,items.length))));
        const mesh=new T.InstancedMesh(geometries[kind],material,capacity);mesh.instanceMatrix.setUsage(gl.DYNAMIC_DRAW);mesh.frustumCulled=false;scene.add(mesh);pool={mesh,capacity};pools.set(key,pool);
      }
      pool.mesh.count=items.length;
      items.forEach((d,i)=>{
        vector.set(d.x,d.y||.3,d.z);scale.set(d.w||1,d.h||d.w||1,d.d||d.w||1);rotation.identity();[d.rx||0,d.ry||0,d.rz||0].forEach((angle,n)=>rotation.multiply(rotationPart.setFromAxisAngle(axes[n],angle)));matrix.compose(vector,rotation,scale);
        pool.mesh.setMatrixAt(i,matrix);pool.mesh.setColorAt(i,color.set(d.color||'#66d8eb'));
      });pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
    }
    function draw(data){
      if(disposed)return;last=data;
      const cam=data?.cam||{x:0,y:0},cx=cam.x/36,cz=cam.y/36;
      const halfH=height/72,halfW=width/72;camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();
      camera.position.set(cx,top?60:48,cz+(top?.01:32));camera.lookAt(cx,0,cz);floor.position.set(cx,-.1,cz);grid.position.set(Math.round(cx/1.6)*1.6,0,Math.round(cz/1.6)*1.6);
      const p=data?.P,ball=(v,extra={})=>({x:v.x/36,z:v.y/36,w:(v.r||5)/36,y:(v.r||5)/36+.1,color:v.color,...extra});
      const enemies=data?.enemies||[];
      instances('round','sphere',enemies.filter(v=>!['drone','brute'].includes(v.type)).map(v=>ball(v,{color:v.flash>0?'#ffffff':v.color})));
      instances('drone','gem',enemies.filter(v=>v.type==='drone').map(v=>ball(v,{ry:v.t,color:v.flash>0?'#ffffff':v.color})));
      instances('brute','box',enemies.filter(v=>v.type==='brute').map(v=>ball(v,{w:v.r/22,ry:v.t*.5,color:v.flash>0?'#ffffff':v.color})));
      instances('health','box',enemies.filter(v=>v.hp<v.maxHp).map(v=>({x:v.x/36,z:v.y/36-.6,y:1.2,w:Math.max(.02,v.r/18*v.hp/v.maxHp),h:.08,d:.06,color:'#fa76af'})));
      instances('player','sphere',p?[ball(p,{color:p.invuln>0?'#dfedfc':p.color})]:[]);
      instances('halo','ring',p?[ball(p,{w:(p.r+4)/36,y:.12,rx:-Math.PI/2,color:'#dbeaff'})]:[]);
      instances('gems','gem',(data?.gems||[]).map(v=>ball(v,{color:v.v>=20?'#ee64b0':v.v>=5?'#aa80ef':'#45ccdf'})));
      instances('coins','sphere',(data?.coins||[]).map(v=>ball(v,{w:.16,color:'#eed056'})));
      instances('shots','sphere',[...(data?.projs||[]),...(data?.ebullets||[]).map(v=>({...v,color:'#ff5e78'}))].map(v=>ball(v)));
      instances('orbit','gem',(p?.weapons.orbit?.blades||[]).map(v=>ball(v,{w:.16,h:.4,ry:(data?.time||0)*9,color:'#5ce4ed'})));
      instances('rings','ring',(data?.rings||[]).map(v=>ball(v,{w:v.r/36,y:.14,rx:-Math.PI/2})));
      instances('bolts','rod',(data?.bolts||[]).map(v=>{const dx=(v.x2-v.x1)/36,dz=(v.y2-v.y1)/36;return{x:(v.x1+v.x2)/72,z:(v.y1+v.y2)/72,y:.4,w:.035,h:Math.hypot(dx,dz),d:.035,rx:Math.PI/2,rz:-Math.atan2(dx,dz),color:v.color};}));
      renderer.render(scene,camera);frames++;canvas.dataset.rendered='true';canvas.dataset.engine='webgl2';
    }
    function resize(w,h,dpr=1){width=w;height=h;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);draw(last);}
    function dispose(){if(disposed)return;disposed=true;button.remove();for(const {mesh}of pools.values())mesh.dispose();for(const g of Object.values(geometries))g.dispose();floor.geometry.dispose();floor.material.dispose();grid.dispose();grid.geometry.dispose();grid.material.dispose();material.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();}
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(disposed)return;dispose();window.dispatchEvent(new CustomEvent('neon:3d-error',{detail:'Kết nối GPU bị gián đoạn. Mở lại 3D hoặc chuyển sang 2D.'}));});
    window.addEventListener('pagehide',dispose,{once:true});
    const api={draw,resize,dispose,diagnostics:()=>({id:'neon',frames,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries})};window.__neon3D=api;return api;
  }};
})();
