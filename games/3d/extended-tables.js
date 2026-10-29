(function () {
  'use strict';
  const A=window.Arcade3D,H=A.editionHelpers;
  const cardColors={red:'#c85a4e',yellow:'#e0bc4f',green:'#599e74',blue:'#558bb7',wild:'#51466c'};
  function face(el){
    const uno=el.querySelector('.uno-card-center'), corner=el.querySelector('.tl-card-corner,.xidach-corner');
    const back=el.matches('.uno-card-back,.xidach-card-back');
    const color=Object.keys(cardColors).find(c=>el.matches(`.uno-color-${c}`));
    const text=back?'✦':uno?uno.textContent:corner?`${corner.childNodes[0].textContent}\n${corner.querySelector('small').textContent}`:el.querySelector('b')?.textContent+'\n'+(el.querySelector(':scope > span')?.textContent||'');
    return {text:back?'✦':text,color:back?'#567c81':color?cardColors[color]:'#fff0d2',ink:back||color?'#fff3d2':el.matches('.is-red,.tl-card-red')?'#ae443a':'#344348'};
  }
  function cards(elements,key,z,{width=1.4,step=1.65,cols=8}={}){
    return elements.map((el,i)=>({key:`${key}-${i}`,x:(i%cols-(Math.min(elements.length,cols)-1)/2)*step,z:z+Math.floor(i/cols)*1.9,y:H.selected(el)?.62:.3,w:width,d:1.65,h:.12,...face(el),element:el.matches('button')?el:null}));
  }
  function caption(w,selector){
    const p=document.createElement('p');p.className='three-live-caption';p.setAttribute('aria-live','polite');w.e.viewport.after(p);
    return ()=>{const value=selector.map(s=>H.text(w.$(s))).filter(Boolean).join(' · ');if(p.textContent!==value)p.textContent=value;};
  }
  function pager(w){
    const nav=document.createElement('div');nav.className='three-hand-pages';
    nav.innerHTML='<button type="button" aria-label="Trang bài trước">←</button><span></span><button type="button" aria-label="Trang bài sau">→</button>';
    w.e.viewport.after(nav);let page=0;
    const buttons=nav.querySelectorAll('button'),label=nav.querySelector('span');
    buttons.forEach((b,i)=>w.scope.on(b,'click',()=>{page+=i?1:-1;w.workspace.dataset.handPage=page;}));
    return list=>{const pages=Math.max(1,Math.ceil(list.length/16));page=Math.max(0,Math.min(page,pages-1));nav.hidden=pages===1;buttons[0].disabled=page===0;buttons[1].disabled=page===pages-1;label.textContent=`Bài của bạn · ${page+1}/${pages}`;return list.slice(page*16,(page+1)*16);};
  }
  const configs={
    samloc:{table:'.vn-table',hand:'[data-sam-hand]',trick:'[data-sam-trick] .vn-card',opponents:'[data-sam-player]',count:'[data-count]',turn:'[data-sam-turn]',note:'[data-sam-note]'},
    phom:{table:'.phom-table',hand:'.phom-hand',trick:'[data-phom-last] .phom-card',opponents:'[data-phom-player]',count:'[data-count]',turn:'[data-phom-turn]',note:'[data-phom-note]'},
    tienlen:{table:'.tl-table',hand:'.tl-hand',trick:'.tl-trick .tl-card',opponents:'[data-tl-player]',count:'[data-tl-count]',turn:'[data-tl-turn]',note:'.tl-last-action'},
    uno:{table:'.uno-table',hand:'.uno-hand',trick:'[data-uno-discard]',opponents:'.uno-opponent',count:'.uno-opponent-count',turn:'[data-uno-turn]',note:'.uno-last-action'},
  };
  for(const [id,c] of Object.entries(configs))A.editions[id]=()=>{
    let report,page;
    return {source:c.table,hide:[c.table,c.hand],camera:{width:17,depth:15,height:2,elevation:1.1},
      setup(w){w.table(15,13);report=caption(w,[c.turn,c.note]);page=pager(w);},
      read(w){
        report();const out=cards(page(w.all(`${c.hand} > button`)),'hand',3.2);
        out.push(...cards(w.all(c.trick),'trick',-.4,{cols:8,step:1.3}));
        w.all(c.opponents).forEach((el,i)=>{
          const x=(i-1)*4.7,count=H.text(el.querySelector(c.count)),active=el.matches('.is-active');
          out.push({key:`seat-${i}`,x,z:-5,w:4,d:.85,y:.23,model:'label',text:`Máy ${i+1} · ${count}`,ink:active?'#ffe08d':'#eff0d4',font:64});
          const total=parseInt(count,10)||0;
          for(let n=0;n<Math.min(5,total);n++)out.push({key:`back-${i}-${n}`,x:x+(n-(Math.min(5,total)-1)/2)*.38,z:-3.8,y:.28+n*.015,w:.9,d:1.3,h:.1,text:'✦',color:active?'#ad8150':'#557e78',ink:'#e4e8c4'});
        });
        if(id==='uno'){
          const draw=w.$('[data-uno-draw]');out.push({key:'draw',x:-4,z:-.5,y:.4,w:1.3,d:1.8,h:.35,text:'RÚT\nUNO',color:'#9b4f4c',ink:'#fff2cf',element:draw});
          out.push({key:'color',x:4,z:-.4,y:.2,w:3,d:1,model:'label',text:H.text(w.$('[data-uno-current-color]')),ink:'#fff1ce'});
        }
        if(id==='phom')w.all('[data-public]').forEach((box,i)=>out.push(...cards([...box.querySelectorAll('.phom-card')],`meld-${i}`,-2,{width:.6,step:.7,cols:12}).map(d=>({...d,x:d.x+(i-1)*4.7,z:-2.3,d:.9,w:.6}))));
        return out;
      },
    };
  };
  A.editions.xidach=()=>{
    let report;return{source:'.xidach-table',camera:{width:16,depth:13,height:2},setup(w){w.table(14,11);report=caption(w,['[data-xidach-phase]','[data-xidach-value="player"]','[data-xidach-value="dealer"]']);},
      read(w){report();return [...cards(w.all('[data-xidach-hand="dealer"] > *'),'dealer',-2.5,{width:1.6,step:1.9}),...cards(w.all('[data-xidach-hand="player"] > *'),'player',2.5,{width:1.6,step:1.9}),{key:'label',x:0,z:0,model:'label',w:6,d:1,text:'XÌ DÁCH · 21',ink:'#dacd9e'}];},};
  };
  A.editions.maubinh=()=>({source:'.binh-rows',hide:['.binh-rows','[data-binh-bank]'],camera:{width:17,depth:16,height:2,elevation:1.18},
    setup(w){w.table(15,14);},
    read(w){
      const out=[];
      for(let row=0;row<3;row++){
        const slots=w.all(`[data-binh-row="${row}"] > *`);
        slots.forEach((el,i)=>out.push({key:`row-${row}-${i}`,x:(i-(slots.length-1)/2)*1.55,z:-4.7+row*2,y:H.selected(el)?.6:.28,w:1.3,d:1.7,h:.12,...(el.matches('[data-binh-card]')?face(el):{color:'#668e78',text:'+',ink:'#d9deae'}),element:el}));
        out.push({key:`label-${row}`,x:-5.9,z:-4.7+row*2,y:.3,w:2.3,d:1,model:'label',text:['TRÊN\n3 LÁ','GIỮA\n5 LÁ','DƯỚI\n5 LÁ'][row],ink:'#f4e7b9'});
      }
      return out.concat(cards(w.all('[data-binh-bank] > *'),'bank',2.8));
    },
  });
  A.editions.domino=()=>{
    let report;return{source:'.domino-table',hide:['.domino-table','.domino-hand'],camera:{width:18,depth:15,height:2,elevation:1.17},
      setup(w){w.table(16,13);report=caption(w,['[data-domino-turn]','[data-domino-last]']);},
      read(w){
        report();const out=[];
        for(const [selector,key,z,cols,step] of [['.domino-chain .domino-tile','chain',-3.8,7,2.1],['.domino-hand .domino-tile','hand',4,7,2.1]])w.all(selector).forEach((el,i)=>{
          const halves=[...el.querySelectorAll('.domino-half')].map(x=>x.children.length), x=(i%cols-3)*step, depth=z+Math.floor(i/cols)*1.7;
          out.push({key:`${key}-${i}`,x,z:depth,y:H.selected(el)?.55:.26,w:1.9,d:1.15,h:.24,color:H.selected(el)?'#f6d27c':'#f3e5c7',element:el.matches('button')?el:null});
          out.push({key:`divider-${key}-${i}`,x,z:depth,y:.4,w:.035,d:1,h:.02,color:'#907858'});
          const dots=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
          halves.forEach((n,half)=>(dots[n]||[]).forEach((dot,k)=>out.push({key:`dot-${key}-${i}-${half}-${k}`,x:x+(half?1:-1)*.47+(dot%3-1)*.21,z:depth+(Math.floor(dot/3)-1)*.25,y:H.selected(el)?.69:.4,model:'ball',w:.12,color:'#344839'})));
        });
        return out;
      },
    };
  };
  A.editions.werewolf=()=>({source:'.werewolf-seats',camera:{width:18,depth:16,height:3,elevation:.95},
    setup(w){w.table(16,14,'#43535c');const e=w.e;e.cylinder(0,.25,0,1.3,1.4,.4,'#65534a');for(let n=0;n<5;n++)e.ball(Math.cos(n)*.6,.6,Math.sin(n)*.6,.35,'#df965b');},
    read(w){const out=[];w.all('[data-ww-target]').forEach((el,i)=>{
      const angle=i*Math.PI/4,x=Math.sin(angle)*5.5,z=Math.cos(angle)*4.7,dead=el.matches('.is-dead');
      out.push({key:`villager-${i}`,x,z,y:.3,w:1.7,d:1.7,h:.16,color:H.selected(el)?'#f1cb74':'#6a7370',element:el});
      if(!dead)out.push({key:`person-${i}`,x,z,y:.4,model:'person',w:1.15,color:i?'#7c9da0':'#b78063'});
      out.push({key:`name-${i}`,x,z:z+1,y:.3,w:3.5,d:1.1,model:'label',text:`${i?'Máy '+i:'Bạn'}\n${H.text(el.querySelector('[data-ww-identity]'))||H.text(el.querySelector('small'))}`,ink:dead?'#acaaa0':'#f5e9c9',font:64});
    });return out;},
  });
})();
