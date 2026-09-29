/* Procedural, locally generated 3D models. All geometry belongs to its scene. */
(function () {
  'use strict';
  const A=window.Arcade3D;
  function rounded(e,x,y,z,w,h,d,color,r=.12,parent=e.root) {
    const g=e.geometry(`rounded:${w}:${h}:${d}:${r}`,()=>{
      const s=new e.T.Shape(),left=-w/2,right=w/2,top=d/2,bottom=-d/2,cr=Math.min(r,w/3,d/3,h/2);
      s.moveTo(left+cr,bottom);s.lineTo(right-cr,bottom);s.quadraticCurveTo(right,bottom,right,bottom+cr);
      s.lineTo(right,top-cr);s.quadraticCurveTo(right,top,right-cr,top);s.lineTo(left+cr,top);s.quadraticCurveTo(left,top,left,top-cr);
      s.lineTo(left,bottom+cr);s.quadraticCurveTo(left,bottom,left+cr,bottom);
      const geo=new e.T.ExtrudeGeometry(s,{depth:Math.max(.01,h-2*cr),bevelEnabled:true,bevelSize:cr*.3,bevelThickness:cr,bevelSegments:2,steps:1,curveSegments:3});
      geo.rotateX(-Math.PI/2);geo.translate(0,cr,0);return geo;
    });
    return e.mesh(g,color,x,y,z,parent);
  }
  function floor(e,w=60,d=60,color='#273f37',y=-2.8) {
    const m=e.box(0,y-.1,0,w,.2,d,color);m.castShadow=false;return m;
  }
  function table(e,w,d,color='#987957') {
    floor(e,60,60,e.floorColor);
    const base=rounded(e,0,-.65,0,w+.45,.65,d+.45,color,.22);
    const top=rounded(e,0,-.07,0,w,.12,d,'#e6dfbf',.12);
    for(const x of [-w*.39,w*.39])for(const z of [-d*.38,d*.38]){
      e.cylinder(x,-1.8,z,.2,.3,2.4,'#6b6047');e.cylinder(x,-2.75,z,.31,.31,.1,'#b4a67c');
    }
    return {base,top};
  }
  function plant(e,x,y,z,scale=1) {
    const g=e.group();g.position.set(x,y,z);g.scale.setScalar(scale);
    e.cylinder(0,.3,0,.36,.28,.6,'#be9472',g);
    e.cylinder(0,.59,0,.31,.31,.035,'#495843',g);
    for(let i=0;i<5;i++){
      const a=i*2.4;
      e.rod([0,.5,0],[Math.cos(a)*.3,1.1+i%2*.2,Math.sin(a)*.3],.028,'#6d8a58',g);
      const leaf=e.ball(Math.cos(a)*.28,1.05+i%2*.2,Math.sin(a)*.28,.22,i%2?'#8fa875':'#669076',g,10);leaf.scale.set(.15,.42,.15);leaf.rotation.z=Math.sin(a)*.4;
    }
    return g;
  }
  function tree(e,x,z,scale=1,color='#789b65',parent=e.root) {
    const g=e.group(parent);g.position.set(x,0,z);g.scale.setScalar(scale);
    e.cylinder(0,1.3,0,.18,.26,2.6,'#947151',g,8);
    const leaves=e.ball(0,3.1,0,1.45,color,g,8);leaves.scale.y=1.55;
    e.ball(-.65,2.7,.25,.85,'#8eaa74',g,8);e.ball(.65,3.5,-.12,.95,color,g,8);return g;
  }
  function house(e,color='#ead2a2',roof='#b8795c') {
    const g=e.group();
    e.box(0,1.5,0,4.5,3,3.5,color,g);
    const cap=e.mesh(e.geometry('roof',()=>new e.T.ConeGeometry(3.6,2.2,4)),roof,0,4,0,g);cap.rotation.y=Math.PI/4;cap.scale.z=.84;
    e.box(.7,4.65,-.5,.55,1.4,.55,'#bd9575',g);
    for(const x of [-1.35,1.35]){
      e.box(x,1.9,1.78,.88,1,.06,'#eff1d0',g);e.box(x,1.9,1.82,.67,.8,.04,'#6c9d9d',g);
      e.box(x,1.9,1.85,.04,.8,.02,'#eff1d0',g);e.box(x,1.9,1.85,.67,.04,.02,'#eff1d0',g);
    }
    e.box(0,1,1.79,.8,2,.08,'#8b9475',g);e.ball(.23,1,1.86,.055,'#d9c287',g,8);
    rounded(e,0,.02,2.1,1.5,.15,.8,'#c0bf9e',.08,g);return g;
  }
  function mailbox(e) {
    const g=e.group();
    e.cylinder(0,.65,0,.07,.09,1.3,'#8e7050',g,10);
    rounded(e,0,1.25,0,.65,.45,.85,'#eff0d5',.12,g);
    e.box(0,1.32,.44,.65,.12,.04,'#da8467',g);
    e.rod([.35,1.4,0],[.35,1.96,0],.025,'#af6d56',g);
    const flag=e.box(.48,1.9,0,.3,.19,.055,'#dd7858',g);
    const halo=e.torus(0,.07,0,.68,.06,'#f0d480',g);halo.visible=false;
    return {group:g,flag,halo};
  }
  function obstacle(e,type) {
    const g=e.group();
    if(type==='cone'){
      rounded(e,0,.01,0,.9,.12,.9,'#ae6550',.1,g);
      e.cylinder(0,.66,0,.04,.37,1.12,'#e3915f',g,12);
      e.cylinder(0,.63,0,.16,.22,.25,'#f3ebc9',g,12);
    } else if(type==='water'){
      e.cylinder(0,.46,0,.22,.22,.8,'#aad9d3',g,12);
      e.cylinder(0,.94,0,.14,.14,.14,'#d8e9c3',g,12);
      e.cylinder(0,.42,0,.226,.226,.3,'#619ab0',g,12);
    } else if(type==='puddle'||type==='pothole'){
      const puddle=e.cylinder(0,.013,0,.74,.74,.025,type==='pothole'?'#31463c':'#5b9395',g,20);puddle.scale.z=.7;
      if(type==='puddle'){const ring=e.torus(0,.027,0,.43,.016,'#b2cfbe',g);ring.scale.y=.7;}
    } else if(type==='trash'){
      e.cylinder(0,.6,0,.46,.39,1.16,'#729588',g,12);e.cylinder(0,1.23,0,.51,.51,.13,'#5a786d',g,12);
      e.box(0,1.34,0,.24,.1,.13,'#425f54',g);
      for(const x of [-.22,0,.22])e.box(x,.62,.43,.03,.75,.025,'#aec3a4',g);
    } else if(type==='barrier'){
      for(const x of [-.8,.8]){e.box(x,.45,0,.12,.9,.15,'#a38d67',g);e.box(x,.07,0,.25,.14,.72,'#a38d67',g);}
      e.box(0,.85,0,2.05,.5,.16,'#dd8870',g);
      for(const x of [-.78,-.26,.26,.78]){const stripe=e.box(x,.85,.09,.18,.55,.025,'#f2e7bc',g);stripe.rotation.z=.35;}
    } else if(type==='dog'){
      const body=e.ball(0,.5,0,.44,'#ad845d',g,10);body.scale.set(.64,.39,.32);
      e.ball(.54,.77,0,.26,'#c59c6c',g,10);e.ball(.76,.73,0,.13,'#775944',g,8);
      for(const z of [-.18,.18])for(const x of [-.35,.34])e.cylinder(x,.2,z,.055,.075,.4,'#765d48',g,6);
      for(const z of [-.17,.17]){const ear=e.mesh(e.geometry('dogear',()=>new e.T.ConeGeometry(.1,.3,4)),'#785d48',.48,1.01,z,g);ear.rotation.z=.3;e.ball(.68,.85,z*.9,.035,'#21372d',g,8);}
      e.rod([-.58,.57,0],[-.85,.94,0],.055,'#a27b57',g);
    }
    return g;
  }
  function bike(e,color='#b8da83',delivery=false) {
    const g=e.group(),wheels=[];
    for(const z of [-.9,.9]){
      const wheel=e.group(g);wheel.position.set(0,.52,z);
      const tire=e.mesh(e.geometry('bike-wheel',()=>new e.T.TorusGeometry(.48,.055,8,24)),'#29433c',0,0,0,wheel);tire.rotation.y=Math.PI/2;
      const rim=e.mesh(e.geometry('bike-rim',()=>new e.T.TorusGeometry(.415,.017,6,24)),'#cad4bc',0,0,0,wheel);rim.rotation.y=Math.PI/2;
      for(let i=0;i<6;i++){const a=i*Math.PI/3;e.rod([0,0,0],[0,Math.cos(a)*.4,Math.sin(a)*.4],.011,'#a6b8ab',wheel);}
      wheels.push(wheel);
    }
    for(const [a,b] of [
      [[0,.52,.9],[0,1.22,.35]],[[0,1.22,.35],[0,.65,0]],[[0,.65,0],[0,.52,.9]],
      [[0,.65,0],[0,1.3,-.65]],[[0,1.22,.35],[0,1.3,-.65]],[[0,1.3,-.65],[0,.52,-.9]],
    ])e.rod(a,b,.042,color,g);
    e.box(0,1.38,.38,.3,.08,.34,'#354c41',g);
    e.rod([0,1.3,-.65],[0,1.57,-.57],.035,'#d1cbb1',g);
    e.rod([-.37,1.59,-.63],[.37,1.59,-.63],.035,'#293f3a',g);
    const torso=e.group(g);torso.position.set(0,1.5,.13);torso.rotation.x=-.37;
    rounded(e,0,0,0,.46,.6,.28,color,.11,torso);
    e.box(0,.31,.16,.09,.45,.015,'#eff0bf',torso);
    e.ball(0,2.08,-.2,.23,'#e3ba8c',g,12);
    const helmet=e.ball(0,2.23,-.21,.25,delivery?'#df9361':color,g,12);helmet.scale.y*=.7;
    e.box(0,2.36,-.2,.055,.018,.35,'#f4ecbd',g);
    e.box(0,2.1,-.415,.3,.07,.015,'#30493d',g);
    for(const side of [-1,1]){
      e.rod([side*.24,1.91,-.09],[side*.33,1.62,-.62],.065,'#e4bd8d',g);
    }
    const legs=[];
    for(const side of [-1,1]){
      const leg=e.group(g);leg.position.set(side*.15,1.35,.27);
      e.rod([0,0,0],[side*.09,-.32,-.2],.08,'#395c67',leg);
      e.rod([side*.09,-.32,-.2],[0,-.65,-.1],.068,'#d8ad83',leg);
      e.box(0,-.65,-.17,.15,.1,.26,'#e7dfb9',leg);legs.push(leg);
    }
    if(delivery){rounded(e,.45,.88,.58,.4,.5,.6,'#e5d7a7',.06,g);for(let i=0;i<3;i++)e.box(.45,1.42+i*.035,.58,.35,.025,.47,'#f0efda',g);}
    return {group:g,update(time,lean=0){g.rotation.z=lean;wheels.forEach(w=>{w.rotation.x=-time*8;});legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(time*9+i*Math.PI)*.28;});}};
  }
  function horse(e,color,parent=e.root) {
    const g=e.group(parent);
    e.cylinder(0,.11,0,.32,.39,.22,color,g);
    e.cylinder(0,.33,0,.17,.3,.3,color,g);
    const shape=new e.T.Shape();
    shape.moveTo(-.21,0);shape.lineTo(.2,0);shape.lineTo(.18,.37);shape.lineTo(.38,.53);shape.lineTo(.33,.67);shape.lineTo(.1,.84);shape.lineTo(.06,1.06);shape.lineTo(-.08,.88);shape.lineTo(-.23,.87);shape.quadraticCurveTo(-.45,.45,-.21,0);
    const geo=e.geometry('horse-head',()=>{const geo=new e.T.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1});geo.translate(0,.41,-.1);return geo;});
    e.mesh(geo,color,0,0,0,g);
    for(const z of [-.14,.14])e.ball(.16,1.14,z,.04,'#294438',g,8);
    return g;
  }
  function fruit(e,index,parent) {
    const g=e.group(parent);const leaf=()=>{const l=e.ball(.15,.46,0,.18,'#79a165',g,10);l.scale.set(.28,.07,.13);l.rotation.z=.35;};
    if(index===0){const b=e.ball(0,.27,0,.32,'#e5d062',g,12);b.scale.x*=1.4;leaf();}
    if(index===1){for(const x of [-.21,.21]){e.ball(x,.22,0,.23,'#cf7060',g,12);e.rod([x,.4,0],[0,.75,.02],.025,'#739159',g);}leaf();}
    if(index===2){e.cylinder(0,.2,0,.4,.4,.19,'#99856a',g,24);e.cylinder(0,.31,0,.36,.36,.04,'#a4be69',g,24);e.cylinder(0,.335,0,.11,.11,.015,'#e9e0b1',g,16);for(let n=0;n<10;n++){const a=n*Math.PI/5;e.ball(Math.cos(a)*.24,.35,Math.sin(a)*.24,.026,'#475d42',g,8);}}
    if(index===3){for(let i=0;i<7;i++)e.ball(Math.cos(i*2.4)*.19,.2+i%3*.13,Math.sin(i*2.4)*.17,.18,'#a48bb5',g,10);leaf();}
    if(index===4){const berry=e.mesh(e.geometry('berry',()=>new e.T.ConeGeometry(.34,.6,14)),'#d68171',0,.35,0,g);berry.rotation.x=Math.PI;leaf();for(let i=0;i<7;i++)e.ball(Math.cos(i*2.4)*.24,.35+i%3*.08,Math.sin(i*2.4)*.24,.023,'#ead493',g,8);}
    if(index===5){e.ball(0,.3,0,.35,'#e7a461',g,14);leaf();}
    if(index===6){const melon=e.ball(0,.3,0,.4,'#779a65',g,16);melon.scale.z*=.65;e.cylinder(0,.4,0,.32,.32,.055,'#e38c81',g,20);for(let i=0;i<5;i++){const a=i*2.4;e.ball(Math.cos(a)*.19,.44,Math.sin(a)*.19,.028,'#435847',g,8);}}
    if(index===7){e.ball(0,.26,0,.36,'#a08a6c',g,12);e.cylinder(0,.43,0,.32,.3,.09,'#e5e0be',g,20);e.cylinder(0,.481,0,.24,.24,.015,'#c9c7a5',g,20);}
    return g;
  }
  A.models={rounded,floor,table,plant,tree,house,mailbox,obstacle,bike,horse,fruit};
})();
