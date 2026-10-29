(function () {
  'use strict';
  const A = window.Arcade3D, H = A.editionHelpers;
  const palette = ['#d8908e','#86b7d4','#aac98b','#c2a3d4','#e4bc77','#99cfc5','#e3a4bd','#bfc785','#8eadd1','#c8b6a2'];
  const specs = {
    chess: ['.royal-frame','.royal-cell',8,8], xiangqi: ['.royal-frame','.royal-cell',9,10],
    draughts: ['.draughts-board','[data-draughts-cell]',8,8], coganh: ['.coganh-board','[data-coganh-cell]',5,5],
    reversi: ['.reversi-board','[data-reversi-cell]',8,8], jungle: ['.jungle-board','[data-jungle-cell]',7,9],
    sudoku: ['.sudoku-frame','.sudoku-cell',9,9], puppies: ['.puppies-frame','.puppies-cell',0,0],
    minesweeper: ['.ms-scroll','[data-ms-cell]',0,0], onet: ['.onet-scroll','.onet-grid > *',0,0],
    match3: ['.match3-board','[data-match3-cell]',8,8],
  };
  for (const [id, [source, selector, columns, rows]] of Object.entries(specs)) A.editions[id] = () => ({
    source, keyboard: source,
    camera: { width: 15, depth: 15.5, height: 1.5, elevation: 1.08, yaw: .05 },
    setup(w) { w.table(13.9, 14.2, ['xiangqi','coganh'].includes(id) ? '#d6b77d' : '#586a5b'); },
    read(w) {
      const cells = w.all(selector), cols = columns || (id === 'onet' ? Number(w.$('.onet-board').style.getPropertyValue('--onet-cols')) : Math.sqrt(cells.length));
      const rowCount = rows || Math.ceil(cells.length / cols), step = Math.min(1.5, 13 / Math.max(cols, rowCount));
      const out = [], lineBoard = ['xiangqi','coganh'].includes(id);
      if (lineBoard) {
        for (let r = 0; r < rowCount; r++) out.push({ key: `line-r${r}`, ...H.grid(r * cols, cols, rowCount, step), x: 0, y: .08, w: (cols - 1) * step, d: .035, h: .02, color: '#7b5f3e' });
        for (let c = 0; c < cols; c++) {
          if (id === 'xiangqi' && c > 0 && c < 8) for (const sign of [-1,1]) out.push({ key: `line-c${c}-${sign}`, x: (c - 4) * step, z: sign * 2.5 * step, y: .08, w: .035, d: 4 * step, h: .02, color: '#7b5f3e' });
          else out.push({ key: `line-c${c}`, x: (c - (cols - 1) / 2) * step, z: 0, y: .08, w: .035, d: (rowCount - 1) * step, h: .02, color: '#7b5f3e' });
        }
        const diagonals = id === 'coganh' ? [[0,24],[4,20],[2,10],[2,14],[10,22],[14,22]] : [[3,23],[5,21],[66,86],[68,84]];
        for (const [a,b] of diagonals) { const p = H.grid(a,cols,rowCount,step), q = H.grid(b,cols,rowCount,step); out.push({ key:`diag-${a}`,x:(p.x+q.x)/2,z:(p.z+q.z)/2,y:.08,w:.035,d:Math.hypot(q.x-p.x,q.z-p.z),h:.02,color:'#7b5f3e',rotate:Math.atan2(q.x-p.x,q.z-p.z) }); }
      }
      cells.forEach((el, visual) => {
        if (id === 'onet' && !el.matches('button')) return;
        const index = el.dataset.cell ?? el.dataset[`${id}Cell`] ?? visual;
        const pos = H.grid(visual, cols, rowCount, step), selected = H.selected(el);
        let bg = lineBoard ? '#d6b77d' : '#e8d9b5';
        if (['chess','draughts'].includes(id)) bg = (Math.floor(visual / cols) + visual % cols) % 2 ? '#74907b' : '#eee2be';
        if (id === 'reversi') bg = '#396b50';
        if (id === 'jungle') bg = el.matches('.is-water') ? '#78b8c5' : el.matches('.is-trap') ? '#e3bf83' : el.matches('.is-den') ? '#af9471' : '#c6d3a4';
        if (id === 'puppies') bg = palette[Number(el.dataset.region) % palette.length];
        if (id === 'minesweeper') bg = el.matches('.is-open') ? '#dedbc0' : '#85a799';
        if (id === 'onet') bg = el.matches('.is-locked') ? '#a8d5e4' : '#fff1d2';
        if (id === 'sudoku' && (Math.floor(visual / 27) + Math.floor(visual % 9 / 3)) % 2) bg = '#cfdcc8';
        if (el.matches('.is-last,.bs-last')) bg = '#d8c48a';
        if (el.matches('.is-error,.is-hit,.is-wrong,.is-check')) bg = '#df8b83';
        if (el.matches('.is-target,.is-legal,[data-legal="true"]')) bg = '#98c895';
        if (selected) bg = '#f3cb65';
        const base = { key:`cell-${index}`, ...pos, w:step*.95, d:step*.95, h:lineBoard?.035:.14, y:lineBoard?.085:.14, color:bg, element:el };
        // Intersection boards have smaller pads so their connecting lines remain visible.
        if (lineBoard) { base.w = base.d = step * .64; base.model = 'disc'; }
        out.push(base);
        const piece = { key:`piece-${index}`, ...pos, y:.39, w:step*.74,d:step*.74,h:.24,model:'disc',color:'#e9dab7' };
        if (id === 'chess' && el.dataset.piece) out.push({ ...piece, model:'chess',role:el.dataset.piece[1],color:el.dataset.piece[0]==='w'?'#f4e7c8':'#303f43' });
        if (id === 'xiangqi' && el.dataset.piece) {
          const p=el.dataset.piece, names={K:'將',A:'士',B:'象',N:'馬',R:'車',C:'炮',P:'卒',U:'?'};
          out.push({...piece,text:names[p[1]],ink:p[0]==='r'?'#a23e35':'#273d43',color:p[1]==='U'?'#b58b54':'#f3dfac'});
        }
        if (id === 'draughts' && el.querySelector('.draughts-piece')) out.push({...piece,color:el.querySelector('.red')?'#b94f43':'#344549',text:el.textContent.trim(),ink:'#fff0bf',h:el.textContent.trim()?.4:.24});
        if (id === 'coganh' && el.querySelector('.coganh-piece')) out.push({...piece,color:el.querySelector('.red')?'#c45745':'#527da0',text:el.querySelector('.red')?'●':'○',ink:'#fff1d0'});
        if (id === 'reversi' && el.querySelector('.reversi-disc')) out.push({...piece,color:el.querySelector('.black')?'#27373b':'#f1e9d4'});
        if (id === 'jungle') {
          const name=H.text(el.querySelector('.jungle-animal > span')), rank=H.text(el.querySelector('.jungle-animal b'));
          if (name) out.push({...piece,color:el.matches('.piece-0')?'#b95448':'#5480a5',text:`${name}\n${rank}`,ink:'#fff6dc'});
          else if(el.matches('.is-trap,.is-den')) out.push({...piece,model:'label',text:el.matches('.is-den')?'⌂':'◇',ink:'#6a5942'});
        }
        if (id === 'sudoku') {
          const value=Number(el.dataset.value), notes=Number(el.dataset.notes);
          if(value) out.push({...piece,model:'label',text:value,ink:el.matches('.is-given')?'#304338':'#3a7695'});
          else if(notes) for(let n=0;n<9;n++) if(notes&(1<<n)) out.push({...piece,key:`note-${index}-${n}`,model:'label',x:pos.x+(n%3-1)*step*.25,z:pos.z+(Math.floor(n/3)-1)*step*.25,w:step*.28,d:step*.28,text:n+1,ink:'#59745d'});
        }
        if (id === 'puppies') {
          if(el.dataset.state==='dog') out.push({...piece,model:'dog',color:'#edc28a'});
          else out.push({...piece,model:'label',text:el.dataset.state==='empty'?String.fromCharCode(65+Number(el.dataset.region)):'×',ink:'#485a53'});
        }
        if (id === 'minesweeper' && el.textContent) out.push({...piece,model:el.matches('.is-mine')?'ball':'label',text:el.matches('.is-mine')?undefined:el.textContent,color:'#414c46',ink:el.matches('.is-flagged')?'#b44b3b':'#336785'});
        if (id === 'onet') out.push({...piece,model:'label',text:el.textContent.trim(),w:step*.83,d:step*.83});
        if (id === 'match3') {
          const colors=['#d35f83','#5a98d0','#66b486','#ad79c6','#e3b04a','#e6e6d9'];
          const gem=Number(el.dataset.gem); if(gem>=0) out.push({...piece,model:'gem',color:colors[gem],rotate:gem*.4});
        }
      });
      return out;
    },
  });

  A.editions.battleship = () => ({
    source:'.bs-boards',camera:{width:25,depth:13,height:1.8,elevation:1.15},
    setup(w){w.table(24,12,'#528591');},
    read(w){
      const out=[];
      for(const [name,attribute,offset] of [['own','bs-place',-6],['target','bs-target',6]]) {
        out.push({key:`title-${name}`,model:'label',x:offset,z:-5.7,y:.2,w:9,d:.8,text:name==='own'?'ĐỘI TÀU CỦA BẠN':'RADAR MỤC TIÊU',ink:'#fff3ce'});
        w.all(`[data-${attribute}]`).forEach((el,i)=>{
          const p=H.grid(i,10,10,1.02);p.x+=offset;
          out.push({key:`${name}-${i}`,...p,w:.97,d:.97,h:.1,color:el.matches('.bs-hit,.bs-sunk')?'#b9614c':el.matches('.bs-miss')?'#b3d2d1':'#6195a1',element:el});
          if(el.matches('.bs-ship'))out.push({key:`ship-${name}-${i}`,...p,y:.4,w:.85,d:.9,model:'ship',color:'#6c7b76'});
          if(el.matches('.bs-hit,.bs-sunk,.bs-miss'))out.push({key:`mark-${name}-${i}`,...p,y:.4,model:'label',w:.7,d:.7,text:el.textContent,ink:'#fff7d7'});
        });
      }
      return out;
    },
  });
  A.editions.monopoly = () => ({
    source:'.monopoly-board',camera:{width:18,depth:18,height:2,elevation:1.05},
    setup(w){w.table(15.5,15.5,'#b2c7a0');w.e.putLabel('PHỐ NHỎ',0,.12,0,{width:6,height:2,font:100,color:'#456e51'});},
    read(w){const out=[];w.all('[data-monopoly-tile]').forEach((el,i)=>{
      const x=(Number(el.style.gridColumn)-4)*2.15,z=(Number(el.style.gridRow)-4)*2.15;
      out.push({key:`property-${i}`,x,z,w:2.02,d:2.02,h:.2,color:H.selected(el)?'#f2ce78':'#efdfb8',text:H.text(el.querySelector('.monopoly-tile-name')),font:56,element:el});
      out.push({key:`district-${i}`,x,z:z-.8,y:.39,w:1.9,d:.22,h:.12,color:el.style.getPropertyValue('--district')||'#77937b'});
      [...el.querySelectorAll('.monopoly-tokens i')].forEach((token,n)=>out.push({key:`person-${token.textContent}`,x:x+(n-1.5)*.35,z:z+.35,y:.4,w:.5,model:'pawn',color:token.style.getPropertyValue('--player')||'#bb624b'}));
      const level=(H.text(el.querySelector('.monopoly-tile-value')).match(/▰/g)||[]).length;
      for(let n=0;n<level;n++)out.push({key:`house-${i}-${n}`,x:x-.5+n*.7,z:z-.5,y:.58,w:.5,d:.5,h:.45,color:el.style.getPropertyValue('--owner')||'#688d58'});
    });return out;},
  });
})();
