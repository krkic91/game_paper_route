(function () {
  'use strict';
  const A=window.Arcade3D,M=A.models,L=window.ArcadeLayouts;
  function driving(ui,scope,delivery) {
    const e=A.createScene(ui,scope,{id:delivery?'delivery':'race',driving:true,label:delivery?'Delivery Dash 3D':'Đường đua xe đạp 3D',background:'#c5dcd1',shadowSize:23});
    const roadWidth=delivery?9.5:11;
    e.box(0,-.21,-60,260,.4,280,'#99b480').castShadow=false;
    e.box(0,-.035,-65,roadWidth,.09,200,'#728177').castShadow=false;
    for(const x of [-roadWidth/2,roadWidth/2]){
      e.box(x,.025,-65,.19,.07,200,'#eee9c7').castShadow=false;
      if(delivery)e.box(x+Math.sign(x)*1.1,-.005,-65,2,.09,200,'#c2c7a6').castShadow=false;
    }
    const marks=[];
    for(let row=0;row<25;row++)for(const x of delivery?[0]:[-2.75,0,2.75])marks.push({row,mesh:e.box(x,.025,0,.09,.013,2.8,'#e8e7c1')});
    const trees=[];
    for(let row=0;row<10;row++)for(const side of [-1,1]){const tree=M.tree(e,side*(delivery?19:9+row%3*2.2),0,.65+row%3*.18,row%2?'#82a171':'#779567');trees.push({tree,row,side});}
    for(let i=0;i<7;i++){
      const mountain=e.mesh(e.geometry('mountain',()=>new e.T.ConeGeometry(21,36,5)),i%2?'#a4bd9b':'#8fae91',-85+i*28,10,-105-i%3*9);mountain.scale.set(1.1,.6+(i%3)*.2,1.1);mountain.castShadow=false;
    }
    const sun=e.ball(31,25,-99,6.5,e.material('#f9ecc2',{emissive:'#e4d7a5',emissiveIntensity:.35,fog:false}),e.root,24);sun.castShadow=false;
    const clouds=[];for(let i=0;i<4;i++){const cloud=e.group();cloud.position.set(-48+i*30,28+i%2*4,-90-i%2*20);for(let n=0;n<3;n++){const p=e.ball(n*3,0,0,3.2,'#e4e8d1',cloud,8);p.scale.y=.42;p.castShadow=false;}clouds.push(cloud);}
    const player=M.bike(e,'#b5d783',delivery),rivals=delivery?[]:['#d79683','#8cabcc','#d9bf7b'].map(color=>M.bike(e,color));
    const finish=e.group();
    for(const x of [-roadWidth*.55,roadWidth*.55])e.cylinder(x,2.7,0,.12,.16,5.4,'#e7e6c8',finish,10);
    e.box(0,5,0,roadWidth*1.15,.85,.22,'#f0edce',finish);
    const flag=e.putLabel('VỀ ĐÍCH',0,5.03,.135,{width:roadWidth*.63,height:.65,font:72,color:'#415d45'},finish);flag.rotation.x=0;
    for(let n=0;n<20;n++){const w=roadWidth/10;e.box(-roadWidth/2+(n%10+.5)*w,.041,Math.floor(n/10)*.65,w,.02,.65,n%2===Math.floor(n/10)?'#354a3c':'#edeaca',finish).castShadow=false;}
    let stateRef=null,obstacles=[],houses=[],mailboxes=[],papers=[];
    function rebuild(state){
      for(const item of obstacles)item.mesh.removeFromParent();for(const item of houses)item.mesh.removeFromParent();for(const item of mailboxes)item.model.group.removeFromParent();
      obstacles=(state.obstacles||[]).map(source=>({source,mesh:M.obstacle(e,source.type)}));
      houses=delivery?state.houses.map(source=>({source,mesh:M.house(e,source.color,source.roof)})):[];
      mailboxes=delivery?state.mailboxes.map(source=>({source,model:M.mailbox(e)})):[];
      stateRef=state;
    }
    const paperPool=Array.from({length:6},()=>{const g=e.group();M.rounded(e,0,0,0,.45,.035,.32,'#f4efce',.02,g);for(let i=0;i<3;i++)e.box(0,.04,-.07+i*.07,.29,.003,.017,'#9da88a',g);g.visible=false;return g;});
    const trajectory=Array.from({length:15},()=>{const dot=e.ball(0,0,0,.085,e.material('#f0db83',{emissive:'#d8c36c',emissiveIntensity:.15}),e.root,8);dot.castShadow=false;dot.visible=false;return dot;});
    const riderShadow=e.cylinder(0,.025,0,.56,.56,.01,e.material('#365642',{transparent:true,opacity:.2,depthWrite:false}));riderShadow.scale.z=1.65;riderShadow.castShadow=false;
    function draw(state,meta={},dt=1/60){
      if(state!==stateRef)rebuild(state);
      const distance=delivery?state.player.z:state.distance,time=meta.time ?? (delivery?e.time:state.time),x=delivery?state.player.x:(state.x-1.5)*2.5;
      player.group.position.x=x;player.update(time,delivery?state.player.tilt*.24:meta.lean||0);
      player.group.visible=delivery?(!state.player.invuln||Math.floor(time*12)%2===0):(!state.invulnerable||Math.floor(time*12)%2===0);
      riderShadow.position.x=x;
      for(const mark of marks)mark.mesh.position.z=-(mark.row*8-distance%8)+8;
      for(const item of trees)item.tree.position.z=-(item.row*17-distance%17)+8;
      for(const {source,mesh} of obstacles){
        const relative=source.z-distance;
        mesh.visible=relative>-3&&relative<125&&!source.passed&&(delivery?state.obstacles.includes(source):true);
        mesh.position.set(delivery?source.x:(source.x-1.5)*2.5,0,-relative);
        if(source.type==='water')mesh.rotation.y=time*.75;
        if(source.type==='dog')mesh.rotation.y=source.x>0?0:Math.PI;
      }
      houses.forEach(({source,mesh})=>{const z=source.z-distance;mesh.position.set(source.x,0,-z);mesh.rotation.y=source.x>0?-Math.PI/2:Math.PI/2;mesh.visible=z>-10&&z<125;});
      const target=meta.target;
      mailboxes.forEach(({source,model})=>{
        const relative=source.z-distance;model.group.position.set(source.x,0,-relative);model.group.visible=relative>-6&&relative<120;
        model.halo.visible=source===target&&!source.hit;model.flag.rotation.z=source.hit?Math.PI/2:0;
        model.halo.scale.setScalar(1+Math.sin(time*5)*.09);
      });
      if(delivery){
        papers=state.papers;
        paperPool.forEach((mesh,i)=>{const paper=papers[i];mesh.visible=Boolean(paper);if(paper){mesh.position.set(paper.x,1.3+paper.y,-(paper.z-distance));mesh.rotation.y=paper.age*8;mesh.rotation.z=Math.sin(paper.age*9)*.4;}});
        trajectory.forEach((dot,i)=>{const p=meta.preview?.points[i];dot.visible=Boolean(target&&p);if(p)dot.position.set(p.x,1.3+p.y,-(p.z-distance));});
      }else rivals.forEach((rider,i)=>{const rival=state.rivals[i],relative=rival.distance-distance;rider.group.position.set((rival.x-1.5)*2.5,0,-relative);rider.group.visible=relative>-14&&relative<140;rider.update(time+i);});
      finish.position.z=-((delivery?window.GameCore.constants.LEVEL_END:state.length)-distance);finish.visible=finish.position.z>-130&&finish.position.z<14;
      e.follow(x);e.render(dt,true);
    }
    return {draw,engine:e,canvas:e.canvas,point:event=>e.point(event),reset(){stateRef=null;}};
  }
  A.drivingScene=driving;
  A.views.race=(ui,scope)=>driving(ui,scope,false);

  A.views.snake=function(ui,scope){
    const e=A.createScene(ui,scope,{id:'snake',width:22.6,depth:22.6,height:1.6,label:'Rắn săn mồi 3D. Vuốt hoặc dùng phím mũi tên.',yaw:0,orbit:false,elevation:.9,background:'#294a3e'});
    M.table(e,21.5,21.5,'#8c9b72');
    e.box(0,.08,0,20,.11,20,'#477257').castShadow=false;
    const checks=new e.T.InstancedMesh(e.geometry('box',()=>new e.T.BoxGeometry(1,1,1)),e.material('#517b5d'),200);
    const checkTransform=new e.T.Object3D();let check=0;
    for(let row=0;row<20;row++)for(let col=0;col<20;col++)if((row+col)%2===0){checkTransform.position.set(col-9.5,.144,row-9.5);checkTransform.scale.set(1,.012,1);checkTransform.updateMatrix();checks.setMatrixAt(check++,checkTransform.matrix);}
    checks.receiveShadow=true;checks.instanceMatrix.needsUpdate=true;e.root.add(checks);
    for(const x of [-10.15,10.15])M.rounded(e,x,.14,0,.25,.34,20.5,'#c3cf9c',.07);
    for(const z of [-10.15,10.15])M.rounded(e,0,.14,z,20.5,.34,.25,'#c3cf9c',.07);
    const template=M.rounded(e,0,0,0,.88,.54,.88,'#a9d184',.16);template.removeFromParent();
    const body=new e.T.InstancedMesh(template.geometry,e.material('#a9d184'),400);body.castShadow=true;body.receiveShadow=true;body.count=0;e.root.add(body);
    const dummy=new e.T.Object3D(),head=e.group();M.rounded(e,0,0,0,.91,.59,.91,'#d0e49e',.18,head);
    for(const x of [-.24,.24]){e.ball(x,.58,.18,.12,'#f0edd1',head,10);e.ball(x,.63,.25,.065,'#324d3e',head,10);}
    e.rod([0,.25,.45],[0,.25,.7],.035,'#d5957b',head);
    const food=M.fruit(e,0,e.root);let positions=[];
    function draw(state,meta={},dt=1/60){
      const next=state.snake.map(p=>[p.x-9.5,p.y-9.5]);
      if(positions.length!==next.length)positions=next.map(p=>[...p]);
      next.forEach((p,i)=>{positions[i][0]+=(p[0]-positions[i][0])*.65;positions[i][1]+=(p[1]-positions[i][1])*.65;});
      head.position.set(positions[0][0],.16,positions[0][1]);head.rotation.y=Math.atan2(state.dir.x,state.dir.y);
      body.count=state.snake.length-1;
      for(let i=1;i<positions.length;i++){dummy.position.set(positions[i][0],.16,positions[i][1]);dummy.updateMatrix();body.setMatrixAt(i-1,dummy.matrix);}
      body.instanceMatrix.needsUpdate=true;
      food.visible=Boolean(state.food);if(state.food){food.position.set(state.food.x-9.5,.17+Math.sin(e.time*3)*.055,state.food.y-9.5);food.rotation.y=e.time*.4;}
      e.render(dt,true);
    }
    return {draw,canvas:e.canvas,engine:e};
  };

  A.views.pool=function(ui,scope){
    const e=A.createScene(ui,scope,{id:'pool',width:20.3,depth:12.6,height:1.4,label:'Bida 3D. Di chuột hoặc chạm mặt bàn để ngắm.',yaw:.1,elevation:.79,cursor:'crosshair'});
    M.table(e,18,10,'#836b52');
    M.rounded(e,0,.02,0,17.6,.25,9.6,'#b29567',.3);
    M.rounded(e,0,.28,0,16.4,.07,8.45,'#3d7658',.15);
    e.box(0,.36,0,15.8,.035,7.8,e.material('#417e5e',{roughness:.95})).castShadow=false;
    for(const z of [-4.18,4.18])for(const x of [-4,4])M.rounded(e,x,.35,z,7,.32,.4,'#315e45',.13);
    for(const x of [-8.14,8.14])M.rounded(e,x,.35,0,.4,.32,7,'#315e45',.13);
    for(const [px,py] of window.ArcadeLogic.POCKETS){const[x,z]=L.tableToWorld(px,py,900,500,50);e.cylinder(x,.385,z,.47,.47,.04,'#192e26');e.torus(x,.425,z,.46,.045,'#c2a574');}
    for(const x of [-5.6,-3.3,3.3,5.6])for(const z of [-4.6,4.6]){const diamond=e.box(x,.32,z,.11,.03,.11,'#e8d6a1');diamond.rotation.y=Math.PI/4;}
    e.putLabel('TRẠM CHƠI · BILLIARDS',0,.39,0,{width:5.8,height:.7,font:60,color:'#8cb890'});
    const colors=['#efebd0','#e3ba54','#7296b8','#c98271','#ac8db9','#d9a261','#7ea383','#b07f85','#30463c','#e3ba54','#7296b8','#c98271','#ac8db9','#d9a261','#7ea383','#b07f85'];
    const balls=[];
    for(let id=0;id<16;id++){
      const g=e.group();
      const image=document.createElement('canvas');image.width=512;image.height=256;
      const paint=image.getContext('2d');paint.fillStyle=id>8?'#efe8c9':colors[id];paint.fillRect(0,0,512,256);
      if(id>8){paint.fillStyle=colors[id];paint.fillRect(0,64,512,128);}
      if(id)for(const x of [128,384]){paint.fillStyle='#f3edd5';paint.beginPath();paint.arc(x,128,37,0,Math.PI*2);paint.fill();paint.fillStyle='#273f32';paint.textAlign='center';paint.textBaseline='middle';paint.font='700 43px Arial';paint.fillText(id,x,129);}
      const texture=e.trackTexture(new e.T.CanvasTexture(image));texture.colorSpace=e.T.SRGBColorSpace;texture.anisotropy=4;
      const mat=e.trackMaterial(new e.T.MeshStandardMaterial({map:texture,roughness:.24,metalness:.04}));
      const sphere=e.ball(0,0,0,.22,mat,g,24);sphere.rotation.y=-Math.PI/2;
      balls.push({group:g,sphere});
    }
    const cue=e.group();e.cylinder(0,0,0,.046,.029,3.4,'#cdb087',cue,10).rotation.x=Math.PI/2;
    e.cylinder(0,0,1.2,.049,.047,.94,'#775f49',cue,10).rotation.x=Math.PI/2;
    const dashes=Array.from({length:25},()=>{const m=e.box(0,.4,0,.024,.018,.12,'#dce3a7');m.castShadow=false;return m;});
    const ghost=e.torus(0,.405,0,.22,.014,'#a3c79c');ghost.castShadow=false;
    function point(event){const p=e.point(event,.39);return p?L.worldToTable(p.x,p.z,900,500,50):null;}
    function draw(state,meta={},dt=1/60){
      state.balls.forEach((ball,i)=>{const[x,z]=L.tableToWorld(ball.x,ball.y,900,500,50);const b=balls[i];b.group.position.set(x,.6,z);b.group.visible=ball.active;b.sphere.rotation.x+=ball.vy*dt/11;b.sphere.rotation.z-=ball.vx*dt/11;});
      const white=state.balls[0],angle=meta.angle||0,power=meta.power||65,dx=Math.cos(angle),dz=Math.sin(angle),[x,z]=L.tableToWorld(white.x,white.y,900,500,50);
      cue.visible=state.status==='ready';cue.rotation.y=Math.PI/2-angle;
      const pull=.65+power*.003;cue.position.set(x-dx*(pull+1.7),.6,z-dz*(pull+1.7));
      let distance=370;
      for(const ball of state.balls.slice(1))if(ball.active){const bx=ball.x-white.x,by=ball.y-white.y,dot=bx*dx+by*dz,cross=Math.abs(bx*dz-by*dx);if(dot>0&&cross<22)distance=Math.min(distance,Math.max(0,dot-Math.sqrt(484-cross*cross)));}
      for(const[axis,dir,min,max]of[[white.x,dx,67,833],[white.y,dz,67,433]])if(dir)distance=Math.min(distance,(dir>0?max-axis:min-axis)/dir);
      distance=Math.max(0,distance)/50;
      dashes.forEach((dash,i)=>{const at=.35+i*.27;dash.visible=cue.visible&&at<distance;dash.position.set(x+dx*at,.405,z+dz*at);dash.rotation.y=Math.PI/2-angle;});
      ghost.visible=cue.visible;ghost.position.set(x+dx*distance,.405,z+dz*distance);
      e.render(dt,true);
    }
    return {draw,point,canvas:e.canvas,engine:e};
  };

  A.views.breakout=function(ui,scope){
    const e=A.createScene(ui,scope,{id:'breakout',width:18.2,depth:12.5,height:1.8,label:'Phá gạch 3D. Di chuyển thanh đỡ bằng chuột, chạm hoặc mũi tên.',yaw:0,orbit:false,elevation:.9,background:'#293b48'});
    M.table(e,16.7,10.8,'#657e8b');
    M.rounded(e,0,.07,0,16.15,.1,10.1,'#355766',.16);
    for(const x of[-8.15,8.15])M.rounded(e,x,.15,0,.2,.44,10.35,'#8db3b8',.06);
    M.rounded(e,0,.15,-5.15,16.4,.44,.2,'#8db3b8',.06);
    for(let z=-4.5;z<5;z++)e.box(0,.178,z,15.9,.01,.014,'#63838a').castShadow=false;
    const ball=e.ball(0,.48,0,.17,e.material('#e6edb4',{roughness:.18,emissive:'#acb57c',emissiveIntensity:.15}),e.root,20);
    const paddle=M.rounded(e,0,.19,4.08,2.2,.3,.3,'#c4db9f',.09);
    const colors=['#b19fc9','#90b6ce','#85b9a9','#c8d29a','#dbb78f'];
    const bricks=[];let lastState=null;
    for(let i=0;i<50;i++){const[x,z]=L.tableToWorld(30+i%10*75+33,55+Math.floor(i/10)*29+10,800,500,50);const mesh=M.rounded(e,x,.2,z,1.32,.42,.4,colors[Math.floor(i/10)],.07);bricks.push(mesh);}
    function point(event){const p=e.point(event,.2);return p?L.worldToTable(p.x,p.z,800,500,50):null;}
    function draw(state,meta={},dt=1/60){
      const reset=state!==lastState;lastState=state;
      state.bricks.forEach((brick,i)=>{const mesh=bricks[i];if(reset){mesh.visible=true;mesh.scale.setScalar(1);mesh.position.y=.2;mesh.userData.burst=0;}
        if(!brick.alive&&mesh.visible){mesh.userData.burst+=dt;mesh.scale.setScalar(Math.max(.001,1-mesh.userData.burst*5));mesh.position.y=.2+mesh.userData.burst*2;if(mesh.userData.burst>.2)mesh.visible=false;}});
      const[x,z]=L.tableToWorld(state.ball.x,state.ball.y,800,500,50);ball.position.set(x,.48,z);
      paddle.position.x=(state.paddle.x-400)/50;e.render(dt,true);
    }
    return {draw,point,canvas:e.canvas,engine:e};
  };
})();
