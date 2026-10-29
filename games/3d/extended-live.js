(function(){
  'use strict';const A=window.Arcade3D,H=A.editionHelpers;
  A.editions.blocks=(workspace,snapshot)=>({source:'.blocks-well',live:true,camera:{width:13,depth:23,height:1.5,elevation:1.25,orbit:false},
    setup(w){w.table(11,21,'#283d4b');for(let x=0;x<11;x++)w.e.box(x-5,.09,0,.025,.02,20,'#465a63');for(let y=0;y<21;y++)w.e.box(0,.09,y-10,10,.02,.025,'#465a63');},
    read(){const {state}=snapshot();if(!state)return[];const L=window.ArcadeBlocks,out=[],colors={I:'#65d4dc',J:'#7799f0',L:'#f1a268',O:'#eed379',S:'#9ad3a0',T:'#b79bdf',Z:'#ed8997'};
      const tile=(x,y,kind,key,ghost=false)=>{if(y<0)return;out.push({key,x:x-4.5,z:y-9.5,y:ghost?.15:.37,w:.92,d:.92,h:ghost?.05:.5,color:ghost?'#5e7078':colors[kind]});};
      state.board.forEach((row,y)=>row.forEach((kind,x)=>{if(kind)tile(x,y,kind,`fixed-${x}-${y}`);}));
      if(state.phase==='play'){L.cells({...state.active,y:L.ghostY(state)}).forEach((c,i)=>tile(c.x,c.y,state.active.kind,`ghost-${i}`,true));L.cells(state.active).forEach((c,i)=>tile(c.x,c.y,state.active.kind,`active-${i}`));}
      return out;},
  });
  A.editions.tower=(workspace,snapshot)=>({source:'.tower-map',live:true,camera:{width:21,depth:13,height:2,elevation:1.02},
    setup(w){w.table(19,11,'#a6bf93');},
    read(w){const {state,meta}=snapshot();if(!state)return[];const L=window.ArcadeTower,map=L.MAPS[state.map],out=[];
      const point=(x,y)=>({x:(x-450)/50,z:(y-250)/50});
      map.path.slice(1).forEach((p,i)=>{const a=map.path[i],dx=p[0]-a[0],dy=p[1]-a[1];out.push({key:`road-${i}`,...point((p[0]+a[0])/2,(p[1]+a[1])/2),y:.12,w:1.05,d:Math.hypot(dx,dy)/50,h:.08,color:'#e5d5ac',rotate:Math.atan2(dx,dy)});});
      map.pads.forEach(([x,y],i)=>{out.push({key:`pad-${i}`,...point(x,y),model:'disc',y:.18,w:1.12,h:.15,color:i===meta?.selected?'#edce79':'#cbd4b3',text:String(i+1),element:w.$(`[data-tower-pad="${i}"]`)});});
      for(const t of state.towers){const p=point(t.x,t.y),color=L.TYPES[t.type].color;
        out.push({key:`tower-${t.pad}`,...p,model:'disc',w:.8,h:.6+t.level*.12,y:.55,color});
        out.push({key:`turret-${t.pad}`,...p,w:.28,d:.9,h:.23,y:1+t.level*.12,color:'#374b41',rotate:Math.PI/2-t.angle});
      }
      for(const foe of state.enemies){const p=point(foe.x,foe.y),size=foe.kind==='boss'?.95:foe.kind==='tank'?.7:.48;
        out.push({key:`enemy-${foe.id}`,...p,model:'ball',w:size,y:.3+size/2,color:foe.slow>0?'#67bcd2':foe.kind==='boss'?'#834983':'#be7152'});
        out.push({key:`health-${foe.id}`,...p,z:p.z-.4,y:1,w:size*Math.max(.01,foe.hp/foe.maxHp),d:.09,h:.04,color:'#75c461'});
      }
      state.projectiles.forEach((p,i)=>out.push({key:`shot-${i}`,...point(p.x,p.y),model:'ball',w:.16,y:.8,color:L.TYPES[p.type].color}));
      state.effects.forEach((p,i)=>out.push({key:`effect-${i}`,...point(p.x,p.y),model:'ring',w:(p.radius||30)/25,d:(p.radius||30)/25,y:.25,color:'#e7bb63'}));
      const end=point(...map.path.at(-1));out.push({key:'gate',...end,y:.65,w:.8,d:1.4,h:1.2,color:'#7d897a'});return out;},
  });
  A.editions.piano=()=>({source:'.piano-keyboard',live:true,camera:{width:12,depth:20,height:1,elevation:1.02,orbit:false},
    setup(w){w.table(9.2,18,'#394651');w.e.box(0,.35,5.76,9,.06,.1,'#edcf70');},
    read(w){const out=[];w.all('[data-piano-lane]').forEach((el,i)=>{
      out.push({key:`lane-${i}`,x:(i-1.5)*2.2,z:0,y:.16,w:2.07,d:17,h:.15,color:el.matches('.is-pressed')?'#a6b7af':i%2?'#53646c':'#71837e',element:el});
      out.push({key:`key-${i}`,x:(i-1.5)*2.2,z:7.3,y:.36,w:1.6,d:1,model:'label',text:['D','F','J','K'][i],ink:'#fff0c9'});
      [...el.querySelectorAll('.piano-tile')].forEach((note,n)=>{if(note.hidden)return;const top=parseFloat(note.style.top);if(top<0||top>100)return;out.push({key:`note-${i}-${n}`,x:(i-1.5)*2.2,z:top/100*18-9,y:.39,w:1.7,d:.9,h:.3,color:'#d8be80'});});
    });return out;},
  });
  A.editions.penalty=()=>{
    let shotKey='',elapsed=0;
    return{source:'.penalty-pitch',live:true,camera:{width:14,depth:17,height:5,elevation:.58,orbit:false,background:'#79a69c'},
      setup(w){const e=w.e;w.table(13,16,'#54855c');for(let i=0;i<8;i++)e.box(0,.08,i*2-7,12,.015,.045,'#a4bc8d');
        e.rod([-4.4,.2,-4.6],[-4.4,4.6,-4.6],.09,'#f5eed5');e.rod([4.4,.2,-4.6],[4.4,4.6,-4.6],.09,'#f5eed5');e.rod([-4.4,4.6,-4.6],[4.4,4.6,-4.6],.09,'#f5eed5');
        for(let i=0;i<13;i++)e.rod([-4.3+i*.72,.2,-4.8],[-4.3+i*.72,4.5,-4.8],.015,'#c8d8c1');for(let i=0;i<7;i++)e.rod([-4.3,.3+i*.65,-4.8],[4.3,.3+i*.65,-4.8],.015,'#c8d8c1');
        for(const sign of[-1,1])for(let i=0;i<3;i++)e.box(sign*(6.5+i*.4),.4+i*.4,-1,1,.5,12,i%2?'#adbaa2':'#859e88');
      },
      read(w,dt){const ball=w.$('.penalty-ball'),key=ball.getAttribute('style')||'';if(key!==shotKey){shotKey=key;elapsed=0;}else elapsed+=dt;
        const shot=ball.classList.contains('is-shot'),t=shot?Math.min(1,elapsed/.7):0,col=(parseFloat(ball.style.getPropertyValue('--shot-x'))-50)/30||0,high=parseFloat(ball.style.getPropertyValue('--shot-y'))===22;
        const keeper=w.$('.penalty-keeper').style.transform.match(/translate\(([-\d.]+)%, ([-\d.]+)%/),save=keeper?Number(keeper[1])/90:0;
        const out=[{key:'ball',model:'ball',x:col*2.8*t,z:5.8-10*t,y:.35+(high?3.1:.8)*t+Math.sin(Math.PI*t),w:.48,color:'#faf1d6'},
          {key:'keeper',model:'person',x:save*2.7*t,z:-3.6,y:.8+(keeper&&Number(keeper[2])<0?.9*t:0),w:1.6,color:'#e1b455',tilt:-save*t*.9}];
        w.all('[data-penalty-zone]').forEach((el,i)=>out.push({key:`zone-${i}`,x:(i%3-1)*2.85,z:-4.95,y:i<3?3.4:1.2,w:2.75,d:.12,h:2,color:i%2?'#6b9ca1':'#709a8c',element:el}));return out;
      },
    };
  };
  A.editions.fishing=()=>({source:'.fishing-pond',live:true,camera:{width:19,depth:14,height:3,elevation:.88,background:'#a7c4b7'},
    setup(w){const e=w.e;w.table(18,12,'#77afb4');e.box(-6,.2,0,5,.3,12,'#97b489');for(let i=0;i<8;i++)e.box(-3.5+i*.45,.45,2.8,.4,.2,2.4,'#a4845f');
      for(const [x,z]of[[-7,-4],[-6,3],[6,-5],[8,-4]]){e.cylinder(x,.9,z,.14,.2,1.6,'#876b4c');e.cylinder(x,2,z,0,.9,2.1,'#5d8e69');}
      e.rod([-2.7,.5,3],[-.7,3,0],.045,'#745f42');e.rod([-.7,3,0],[2,.3,1],.012,'#f2e6c5');
    },
    read(w){const phase=w.workspace.dataset.phase,t=w.e.time,bite=phase==='bite'||phase==='reeling';
      const out=[{key:'float',model:'ball',x:2,z:1,y:.35+Math.sin(t*(bite?18:2))*(bite?.18:.06),w:.3,color:'#bc5743'},
        {key:'ripple',model:'ring',x:2,z:1,y:.17,w:bite?1.5:.9,d:bite?1.5:.9,color:'#c6e1d6'}];
      if(phase==='caught')out.push({key:'fish',model:'fish',x:-1,z:2.9,y:1.1,color:w.$('.fishing-catch [fill]')?.getAttribute('fill')||'#dba962'});
      return out;},
  });
})();
