(function(){
  'use strict';const A=window.Arcade3D,H=A.editionHelpers;
  // Sample the existing local vector paths into closed, extruded meshes. This also
  // preserves curved puzzle tabs and the rotated petals in the coloring artwork.
  function shape(e,element,key,scale,cx,cy,height=.06){
    return e.geometry(key,()=>{
      const length=element.getTotalLength(),n=Math.min(400,Math.max(48,Math.ceil(length/3))),points=[];
      const matrix=element.transform.baseVal.consolidate()?.matrix;
      for(let i=0;i<n;i++){
        let p=element.getPointAtLength(length*i/n);if(matrix)p=new DOMPoint(p.x,p.y).matrixTransform(matrix);
        points.push(new e.T.Vector2((p.x-cx)*scale,-(p.y-cy)*scale));
      }
      const g=new e.T.ExtrudeGeometry(new e.T.Shape(points),{depth:height,bevelEnabled:false,steps:1,curveSegments:12});g.rotateX(-Math.PI/2);
      g.userData.outline=e.geometry(`${key}-outline`,()=>new e.T.BufferGeometry().setFromPoints([...points,points[0]].map(p=>new e.T.Vector3(p.x,height+.008,-p.y))));return g;
    });
  }
  function svgText(el){const copy=el.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');return new XMLSerializer().serializeToString(copy);}
  A.editions.coloring=()=>({source:'.coloring-canvas',camera:{width:15,depth:15,height:1,elevation:1.2},
    setup(w){w.table(13,13,'#f4e9d2');},
    read(w){
      const scene=w.$('[data-color-scene]').value;
      return w.all('[data-color-region]').map((el,i)=>({key:`paint-${el.dataset.colorRegion}`,model:'shape',geometry:shape(w.e,el.firstElementChild,`paint-${scene}-${i}`,1/50,300,300),y:.13+i*.009,color:el.getAttribute('fill'),action:()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true}))}));
    },
  });
  A.editions.jigsaw=()=>({source:'.jigsaw-board',hide:['.jigsaw-board','.jigsaw-tray'],camera:{width:23,depth:16,height:1,elevation:1.2},
    setup(w){w.table(22,14,'#b0bea0');w.$('.family-caption').textContent='Chọn mảnh bên phải, rồi chạm đúng vị trí trong khung bên trái.';},
    read(w){
      const out=[],slots=w.all('[data-jigsaw-slot]'),size=Math.sqrt(slots.length),step=10/size,scene=w.$('[data-jigsaw-scene]').value;
      function piece(el,key,x,z,factor=1){
        const svg=el.querySelector('svg');if(!svg)return;
        const path=svg.querySelector('defs path'),geometry=shape(w.e,path,`puzzle-${size}-${factor}-${el.dataset.jigsawPiece??el.dataset.jigsawSlot}`,step*factor/100,50,50,.12);
        out.push({key,model:'shape',geometry,x,z,y:H.selected(el)?.65:.25,w:step*factor*1.48,d:step*factor*1.48,h:.24,color:H.selected(el)?'#f2c367':'#e1cdab',svg:svgText(svg),element:el});
      }
      slots.forEach((el,i)=>{
        const p=H.grid(i,size,size,step);p.x-=5.5;
        out.push({key:`slot-${i}`,...p,w:step*.97,d:step*.97,h:.06,color:H.selected(el)?'#f4d386':'#d5d6ba',element:el});
        if(el.firstChild)piece(el,`placed-${i}`,p.x,p.z);
      });
      const tray=w.all('[data-jigsaw-piece]').filter(el=>!el.hidden),cols=Math.min(5,size);
      const trayStep=9.4/cols;
      tray.forEach((el,i)=>{const p=H.grid(i,cols,Math.ceil(tray.length/cols),trayStep);piece(el,`loose-${el.dataset.jigsawPiece}`,p.x+5.7,p.z,trayStep/(step*1.48));});
      if(w.$('.jigsaw-board').classList.contains('is-preview'))out.push({key:'reference',x:-5.5,z:0,y:.65,w:10,d:10,h:.02,color:'#eee1c2',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">${window.ArcadeJigsawArt.scene(scene)}</svg>`});
      return out;
    },
  });
  A.editions.riddles=()=>({source:'.riddles-pictures',camera:{width:17,depth:10,height:2.5,elevation:1.05},
    setup(w){w.table(15,8,'#9ab6a1');},
    read(w){const list=w.all('.riddle-picture');return list.map((el,i)=>({key:`clue-${i}`,x:(i-(list.length-1)/2)*Math.min(3.8,13/list.length),z:0,y:.75,w:Math.min(3.3,12/list.length),d:3.3,h:1.1,color:palette[i%palette.length],text:el.textContent,font:150}));},
  });
  const palette=['#f1ddae','#c0d7cb','#edc3ae','#c8c9e4'];
  A.editions.wordchain=()=>({source:'[data-wordchain-word]',hide:['[data-wordchain-word]','.wordchain-history'],camera:{width:17,depth:12,height:1.5,elevation:1.17},
    setup(w){w.table(15,10,'#9caf90');},
    read(w){
      const current=H.text(w.$('[data-wordchain-word]')),items=w.all('.wordchain-history li').slice(-6),out=[];
      items.forEach((el,i)=>out.push({key:`word-${i}`,x:(i%3-1)*4.5,z:Math.floor(i/3)*2.5-3,y:.3,w:4.1,d:1.7,h:.25,color:el.matches('.is-human')?'#e4c494':'#c9d9b5',text:H.text(el.querySelector('span')),font:78}));
      out.push({key:'current',x:0,z:3,y:.5,w:9,d:2,h:.4,text:current,color:'#f2dc9c',font:100});return out;
    },
  });
})();
