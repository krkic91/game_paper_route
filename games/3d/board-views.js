/* 3D adapters reuse the existing board controllers, turns, AI and validation. */
(function () {
  'use strict';
  const A=window.Arcade3D, M=A.models, L=window.ArcadeLayouts;
  const grid=L.gridCoordinates;
  function boardScene(id,ui,scope,config,original) {
    const e=A.createScene(ui,scope,{id,...config});
    e.accessible(original);return e;
  }
  function keyboardGrid(e,size,onSelect) {
    let focused=Math.floor(size*size/2);
    const selector=e.box(0,.08,0,.96,.025,.96,e.material('#dce8a4',{transparent:true,opacity:.52,depthWrite:false}));selector.visible=false;selector.castShadow=false;
    function mark(index,spacing=1){focused=index;const[x,z]=grid(index,size,spacing);selector.position.set(x,.08,z);selector.scale.x=spacing*.94;selector.scale.z=spacing*.94;selector.visible=true;e.invalidate();}
    e.scope.on(e.canvas,'keydown',event=>{
      const changes={ArrowLeft:-1,ArrowRight:1,ArrowUp:-size,ArrowDown:size};
      if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(focused);return;}
      if(!changes[event.key])return;
      event.preventDefault();let next=focused+changes[event.key];
      if(next<0||next>=size*size||Math.abs(changes[event.key])===1&&Math.floor(next/size)!==Math.floor(focused/size))return;
      mark(next,e.gridSpacing||1);
    });
    return mark;
  }
  A.views.caro=function(ui,scope){
    const e=boardScene('caro',ui,scope,{width:17.2,depth:17.2,label:'Caro 3D, chạm ô hoặc dùng mũi tên và Enter'},ui.area.querySelector('.caro-frame'));
    M.table(e,16.4,16.4,'#ac8864');
    const face=M.rounded(e,0,.06,0,15.5,.1,15.5,'#e0ddbc',.05);
    face.castShadow=false;
    for(let n=0;n<=15;n++){
      const at=n-7.5;e.box(at,.175,0,.022,.012,15,'#9ca37e').castShadow=false;e.box(0,.175,at,15,.012,.022,'#9ca37e').castShadow=false;
    }
    for(let n=0;n<15;n++){e.putLabel(n+1,n-7,.19,8,{width:.6,height:.36,font:96,color:'#6e7960'});e.putLabel(String.fromCharCode(65+n),-8,.19,n-7,{width:.45,height:.42,font:96,color:'#6e7960'});}
    const pieces=Array(225).fill(null);let board=Array(225).fill(0),last=-1,animating=false;
    const select=i=>{const button=ui.area.querySelector(`[data-cell="${i}"]`);if(button?.getAttribute('aria-disabled')!=='true'){mark(i);button.click();}};
    const mark=keyboardGrid(e,15,select);
    for(let i=0;i<225;i++){
      const[x,z]=grid(i,15);
      e.hitPlane(`cell-${i}`,x,.21,z,.98,.98,()=>select(i),()=>ui.area.querySelector(`[data-cell="${i}"]`)?.getAttribute('aria-disabled')!=='true');
    }
    const lastRing=e.torus(0,.24,0,.42,.026,'#ceab64');lastRing.visible=false;
    const wins=[];
    function sync(state){
      for(let i=0;i<225;i++){
        const value=state.board[i];if(value===board[i])continue;
        if(pieces[i]){pieces[i].removeFromParent();pieces[i]=null;}
        if(value){
          const g=e.group(),[x,z]=grid(i,15);g.position.set(x,.21,z);g.scale.setScalar(e.reduced?1:.05);g.userData.growing=true;
          if(value===1){e.rod([-.23,.09,-.23],[.23,.09,.23],.08,'#4e856d',g);e.rod([.23,.09,-.23],[-.23,.09,.23],.08,'#4e856d',g);}
          else e.torus(0,.1,0,.29,.073,'#cc8c75',g);
          pieces[i]=g;
        }
      }
      board=[...state.board];animating=true;last=state.last;
      lastRing.visible=last>=0;if(last>=0){const[x,z]=grid(last,15);lastRing.position.set(x,.23,z);}
      for(const win of wins)win.removeFromParent();wins.length=0;
      for(const index of state.line){const[x,z]=grid(index,15);const ring=e.torus(x,.25,z,.43,.045,'#c5dc83');wins.push(ring);}
      e.invalidate();
    }
    scope.loop(dt=>{
      if(animating){animating=false;for(const g of pieces)if(g?.userData.growing){const n=Math.min(1,g.scale.x+dt*6);g.scale.setScalar(n);g.userData.growing=n<1;animating ||= n<1;e.invalidate();}}
      e.render(dt);
    });
    return {sync,engine:e};
  };

  A.views.ludo=function(ui,scope){
    const e=boardScene('ludo',ui,scope,{width:17.3,depth:20.2,height:2.2,label:'Cờ cá ngựa 3D. Tung xúc xắc và chạm quân ngựa đang sáng.',yaw:.08},ui.area.querySelector('.ludo-board'));
    M.table(e,16,16,'#a38262');
    const colors=L.LUDO_COLORS;
    [[-4.5,4.5],[-4.5,-4.5],[4.5,-4.5],[4.5,4.5]].forEach(([x,z],player)=>{
      M.rounded(e,x,.08,z,5.7,.08,5.7,colors[player],.3);
      M.rounded(e,x,.17,z,4.6,.05,4.6,'#ede6cc',.35);
      e.putLabel(L.LUDO_NAMES[player].toUpperCase(),x,.24,z+1.85,{width:3.4,height:.4,font:52,color:'#4d6956'});
    });
    L.LUDO_PATH.forEach(([col,row],i)=>{
      const start=[0,13,26,39].indexOf(i);
      M.rounded(e,col-7,.08,row-7,.94,.12,.94,start<0?'#efedd6':colors[start],.07);
      if([0,8,13,21,26,34,39,47].includes(i))e.putLabel('✦',col-7,.225,row-7,{width:.5,height:.5,font:170,color:'#7a9672'});
    });
    for(let player=0;player<4;player++)for(let n=52;n<=57;n++){
      const[x,z]=L.homePosition(player,n);M.rounded(e,x-7,.1,z-7,.93,.13,.93,colors[player],.05);
      e.putLabel(n-51,x-7,.245,z-7,{width:.6,height:.6,font:145,color:'#edf2cd'});
    }
    const center=e.cylinder(0,.17,0,.7,.7,.2,'#b6c78e',e.root,4);center.rotation.y=Math.PI/4;
    e.putLabel('★',0,.29,0,{width:.6,height:.6,font:140,color:'#f5f0d0'});
    const horses=[],halos=[];let stateRef=null,goals=[],animate=true;
    for(let player=0;player<4;player++)for(let token=0;token<4;token++){
      const g=M.horse(e,colors[player]);g.rotation.y=player%2===0?-.35:.35;g.scale.setScalar(.9);
      const halo=e.torus(0,.09,0,.48,.045,e.material('#eff0a9',{emissive:'#80943b',emissiveIntensity:.2}));halo.visible=false;
      const key=`horse-${player}-${token}`;
      const enabled=()=>{const button=ui.area.querySelector(`[data-owner="${player}"][data-token="${token}"]`);return Boolean(button&&!button.disabled);};
      e.hit(g,key,()=>ui.area.querySelector(`[data-owner="${player}"][data-token="${token}"]`)?.click(),{enabled});
      horses.push(g);halos.push(halo);
    }
    const dice=e.group();dice.position.set(0,.9,9.05);
    M.rounded(e,0,-.2,9.05,2.25,.25,2.1,'#5e7a5d',.18);
    const cube=e.box(0,0,0,1.1,1.1,1.1,'#f1eace',dice);cube.material=e.material('#f1eace',{roughness:.28});
    const patterns={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
    const faces=[{n:1,axis:'y',sign:1},{n:6,axis:'y',sign:-1},{n:2,axis:'z',sign:1},{n:5,axis:'z',sign:-1},{n:3,axis:'x',sign:1},{n:4,axis:'x',sign:-1}];
    for(const f of faces)for(const[a,b]of patterns[f.n]){
      const p=f.axis==='y'?[a*.26,f.sign*.558,b*.26]:f.axis==='z'?[a*.26,b*.26,f.sign*.558]:[f.sign*.558,a*.26,b*.26];
      e.ball(...p,.069,'#3d5b45',dice,10);
    }
    e.hit(dice,'dice',()=>ui.controls.querySelector('[data-roll]').click(),{enabled:()=>!ui.controls.querySelector('[data-roll]').disabled});
    const rotations={1:[0,0,0],2:[-Math.PI/2,0,0],3:[0,0,Math.PI/2],4:[0,0,-Math.PI/2],5:[Math.PI/2,0,0],6:[Math.PI,0,0]};
    let lastDie=1,diceTime=1,diceFrom=[0,0,0],diceTo=[0,0,0];
    function sync(state,meta={}){
      stateRef=state;const stacks=new Map();goals=[];
      for(let player=0;player<4;player++)for(let token=0;token<4;token++){
        const index=player*4+token,progress=state.tokens[player][token],pos=L.ludoCoordinates(player,token,progress);
        const key=pos.join(','),stack=stacks.get(key)||0;stacks.set(key,stack+1);
        if(progress>=0){pos[0]+=(stack%2-.5)*.22;pos[1]+=(Math.floor(stack/2)-.5)*.22;}
        goals[index]=[pos[0],progress<0?.25:.28,pos[1]];
        horses[index].visible=state.players.includes(player);
        if(meta.reset||!horses[index].userData.placed){horses[index].position.set(...goals[index]);horses[index].userData.placed=true;}
        halos[index].position.set(pos[0],.25,pos[1]);
        halos[index].visible=Boolean(ui.area.querySelector(`[data-owner="${player}"][data-token="${token}"]`)?.classList.contains('can-move'));
      }
      const die=meta.lastDie||1;
      if(die!==lastDie||state.die&&diceTime>=1){diceFrom=[dice.rotation.x,dice.rotation.y,dice.rotation.z];diceTo=rotations[die];diceTime=e.reduced?1:0;lastDie=die;}
      animate=true;e.invalidate();
    }
    scope.loop(dt=>{
      if(animate){animate=false;
        horses.forEach((horse,i)=>{if(!goals[i])return;const target=new e.T.Vector3(...goals[i]);const distance=horse.position.distanceTo(target);if(distance>.008){horse.position.lerp(target,e.reduced?1:Math.min(1,dt*12));animate=true;}});
        if(diceTime<1){diceTime=Math.min(1,diceTime+dt*2.6);const t=1-Math.pow(1-diceTime,3);dice.rotation.set(...diceTo.map((end,i)=>diceFrom[i]+(end-diceFrom[i])*t+Math.sin(Math.PI*t)*(i===1?Math.PI*2:Math.PI)));dice.position.y=.9+Math.sin(Math.PI*diceTime)*.65;animate=true;}
        else {dice.rotation.set(...diceTo);dice.position.y=.9;}
        e.invalidate();
      }
      e.render(dt);
    });
    return {sync,engine:e};
  };

  A.views.quan=function(ui,scope){
    const e=boardScene('quan',ui,scope,{width:17.8,depth:9,height:1.1,label:'Ô ăn quan 3D. Chạm một hốc dân ở phía mình, rồi chọn hướng rải.',yaw:.05,elevation:.9},ui.area.querySelector('.quan-scene'));
    M.table(e,16.3,6.7,'#937653').top.visible=false;
    const shape=new e.T.Shape();shape.moveTo(-7,-3.15);shape.lineTo(7,-3.15);shape.quadraticCurveTo(8.25,-3.15,8.25,-1.7);shape.lineTo(8.25,1.7);shape.quadraticCurveTo(8.25,3.15,7,3.15);shape.lineTo(-7,3.15);shape.quadraticCurveTo(-8.25,3.15,-8.25,1.7);shape.lineTo(-8.25,-1.7);shape.quadraticCurveTo(-8.25,-3.15,-7,-3.15);
    const stones=[],labels=[],rings=[],quans=[];
    for(let pit=0;pit<12;pit++){
      const[x,z]=L.quanCoordinates(pit),royal=pit===0||pit===6;
      const hole=new e.T.Shape();hole.absellipse(x,-z,royal?.95:.83,royal?2.12:.86,0,Math.PI*2,false,0);shape.holes.push(hole);
      const bowl=e.cylinder(x,.042,z,royal?.95:.83,royal?.95:.83,.025,'#7e694b');bowl.scale.z=royal?2.23:1.04;bowl.castShadow=false;
      const rim=e.torus(x,.21,z,royal?.98:.87,.045,'#d5b47e');rim.scale.y=royal?2.14:1.02;
      const ring=e.torus(x,.24,z,royal?1.01:.9,.047,'#e0eb9f');ring.scale.y=royal?2.14:1.02;ring.visible=false;rings[pit]=ring;
      stones[pit]=[];
      for(let n=0;n<28;n++){
        const a=n*2.399,r=.18+Math.sqrt(n)*.095;
        const pebble=e.ball(x+Math.cos(a)*r,.07,z+Math.sin(a)*r*(royal?1.8:1),.11,n%3?'#e9dbb3':'#c9c6a4',e.root,8);
        pebble.scale.set(.145,.085,.11);pebble.rotation.y=n*.7;stones[pit].push(pebble);
      }
      if(royal){const quan=e.ball(x,.2,z,.29,'#f0e5be',e.root,12);quan.scale.set(.24,.4,.27);quan.rotation.z=.19;quans[pit]=quan;}
      labels[pit]=e.putLabel('5',x,.26,z+(royal?2.5:1.11),{width:1,height:.42,font:140,color:'#f2e4bf'});
      if(!royal)e.hitPlane(`pit-${pit}`,x,.24,z,1.7,1.78,()=>ui.area.querySelector(`[data-pit="${pit}"]`)?.click(),()=>!ui.area.querySelector(`[data-pit="${pit}"]`)?.disabled);
    }
    const woodGeo=e.trackGeometry(new e.T.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelThickness:.06,bevelSize:.03,bevelSegments:2,curveSegments:20,steps:1}));woodGeo.rotateX(-Math.PI/2);woodGeo.translate(0,-.13,0);
    e.mesh(woodGeo,'#b99665');
    e.putLabel('NGƯỜI 2',0,.01,-3.75,{width:3,height:.5,color:'#dce7ba',font:72});e.putLabel('BẠN / NGƯỜI 1',0,.01,3.75,{width:3.4,height:.5,color:'#dce7ba',font:64});
    let previous=[],previousRoyals=[],bounce=0;
    function sync(state,meta={}){
      for(let pit=0;pit<12;pit++){
        const count=state.pits[pit],royal=pit===0&&state.royals[0]||pit===6&&state.royals[1],changed=previous[pit]!==count||previousRoyals[pit]!==Boolean(royal);
        previousRoyals[pit]=Boolean(royal);
        if(changed){labels[pit].removeFromParent();const[x,z]=L.quanCoordinates(pit);labels[pit]=e.putLabel(`${count}${royal?' + Q':''}`,x,.26,z+(pit===0||pit===6?2.5:1.11),{width:1.1,height:.42,font:royal?95:190,color:'#473f2a'});}
        stones[pit].forEach((stone,n)=>{stone.visible=n<Math.min(count,28);if(changed&&stone.visible){stone.userData.fall=e.reduced?0:.1+n*.008;}});
        if(quans[pit])quans[pit].visible=royal;
        rings[pit].visible=meta.selected===pit;
      }
      previous=[...state.pits];bounce=.65;e.invalidate();
    }
    scope.loop(dt=>{
      if(bounce>0){bounce-=dt;for(const list of stones)for(const stone of list)if(stone.userData.fall>0){stone.userData.fall=Math.max(0,stone.userData.fall-dt);stone.position.y=.07+Math.sin(stone.userData.fall*5)*.24;}e.invalidate();}
      e.render(dt);
    });
    return {sync,engine:e};
  };

  A.views['2048']=function(ui,scope){
    const e=boardScene('2048',ui,scope,{width:10.4,depth:10.4,height:2,label:'2048 3D. Dùng mũi tên hoặc vuốt để gộp các khối số.',yaw:0,orbit:false,elevation:.84},ui.area.querySelector('.board-2048'));
    M.table(e,9.8,9.8,'#8a8176');
    const colors=['#dddcc3','#d7d8ad','#c8cf91','#acc389','#87b794','#71aaa1','#6c9ba9','#838fad','#ac8dab','#c99e91','#dfbf79'];
    const blocks=[],values=Array(16).fill(0);let animate=false;
    for(let i=0;i<16;i++){const[x,z]=grid(i,4,2.25);M.rounded(e,x,.055,z,2.1,.07,2.1,'#a1a58d',.13);blocks[i]=null;}
    function sync(state){
      for(let i=0;i<16;i++){
        const value=state[i];if(value===values[i])continue;
        blocks[i]?.removeFromParent();blocks[i]=null;
        if(value){
          const[x,z]=grid(i,4,2.25),level=Math.log2(value),height=.23+Math.min(level,15)*.07,g=e.group();g.position.set(x,.14,z);
          M.rounded(e,0,0,0,2,height,2,colors[Math.min(level-1,colors.length-1)],.12,g);
          e.putLabel(value,0,height+.016,0,{width:1.67,height:1.12,font:value>=1024?156:235,color:level<=3?'#57634d':'#f8f2d4'},g);
          g.scale.y=e.reduced?1:.28;blocks[i]=g;
        }
        values[i]=value;
      }
      animate=true;e.invalidate();
    }
    scope.loop(dt=>{if(animate){animate=false;for(const g of blocks)if(g&&g.scale.y<1){g.scale.y=Math.min(1,g.scale.y+dt*5);animate ||= g.scale.y<1;e.invalidate();}}e.render(dt);});
    return {sync,canvas:e.canvas,engine:e};
  };

  A.views.memory=function(ui,scope){
    const e=boardScene('memory',ui,scope,{width:11.1,depth:11.6,height:2,label:'Lật thẻ 3D. Chạm thẻ hoặc dùng mũi tên và Enter.',yaw:.08,elevation:.9},ui.area.querySelector('.memory-board'));
    M.table(e,10.65,11.2,'#a58b75');
    const cards=[],faces=[],backs=[],fruitGroups=[],targets=[],cardTypes=[];let animate=false;
    const select=i=>ui.area.querySelector(`[data-card="${i}"]`)?.click();
    keyboardGrid(e,4,select);e.gridSpacing=2.5;
    for(let i=0;i<16;i++){
      const[x,z]=grid(i,4,2.5),g=e.group();g.position.set(x,.24,z);cards[i]=g;
      M.rounded(e,0,-.07,0,2.05,.14,2.16,'#c5c7a4',.15,g);
      const back=e.group(g);backs[i]=back;
      M.rounded(e,0,.075,0,1.94,.03,2.05,'#648975',.09,back);
      e.putLabel('✦',0,.115,0,{width:1.4,height:1.4,font:185,color:'#dce8af'},back);
      const front=e.group(g);front.rotation.x=Math.PI;front.position.y=-.08;front.visible=false;faces[i]=front;
      M.rounded(e,0,0,0,1.94,.04,2.05,'#efe1bd',.09,front);
      e.hit(g,`card-${i}`,()=>select(i),{enabled:()=>!ui.area.querySelector(`[data-card="${i}"]`)?.disabled});
      targets[i]=0;cardTypes[i]=-1;
    }
    function sync(state){
      for(let i=0;i<16;i++){
        if(cardTypes[i]!==state.cards[i]){fruitGroups[i]?.removeFromParent();fruitGroups[i]=M.fruit(e,state.cards[i],faces[i]);fruitGroups[i].scale.setScalar(1.65);fruitGroups[i].position.y=.05;cardTypes[i]=state.cards[i];}
        targets[i]=state.matched[i]||state.open.includes(i)?Math.PI:0;
        cards[i].userData.matched=state.matched[i];
      }
      animate=true;e.invalidate();
    }
    scope.loop(dt=>{
      if(animate){animate=false;cards.forEach((card,i)=>{
        const difference=targets[i]-card.rotation.x;
        if(Math.abs(difference)>.006){card.rotation.x+=difference*(e.reduced?1:Math.min(1,dt*13));animate=true;}else card.rotation.x=targets[i];
        card.position.y=.24+Math.sin(card.rotation.x)*.75;
        faces[i].visible=card.rotation.x>Math.PI/2;backs[i].visible=card.rotation.x<=Math.PI/2;
      });e.invalidate();}e.render(dt);
    });
    return {sync,engine:e};
  };
})();
