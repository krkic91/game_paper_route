'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const X = require('../games/xiangqi-logic.js');
const C = require('../games/coganh-logic.js');
const P = require('../games/piano-logic.js');
const J = require('../games/jigsaw-logic.js');
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const hidden = seed => X.create({ variant: 'hidden', random: rng(seed) });

test('hidden xiangqi: 30 covered pieces, public positions and AI independent of secrets', () => {
  const a = hidden(4), b = hidden(999);
  assert.equal(a.covered.filter(Boolean).length, 30);
  assert.deepEqual(a, b); assert.equal(X.legalMoves(a).length, 44);
  for (const level of ['easy', 'normal']) {
    const before = JSON.stringify(a), move = X.chooseMove(a, level);
    assert.deepEqual(move, X.chooseMove(b, level)); assert.equal(JSON.stringify(a), before);
    assert.ok(X.legalMoves(a).some(m => m.from === move.from && m.to === move.to));
  }
  assert.equal('identities' in a, false); assert.equal('history' in a, false);
});

test('hidden xiangqi: first move uses starting role, reveal and undo keep same secret', () => {
  const revealed = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const s = hidden(seed), before = JSON.stringify(s);
    assert.equal(X.move(s, {from:54,to:55}), false); assert.equal(JSON.stringify(s), before);
    assert.equal(X.move(s, {from:54,to:45}), true);
    assert.equal(s.covered[45], false); assert.equal(s.covered.filter(Boolean).length,29);
    assert.equal(s.lastMove.revealed, s.board[45]); assert.equal(s.board[45][0], 'r');
    revealed.add(s.board[45]); const after = JSON.stringify(s);
    assert.equal(X.undo(s), true); assert.equal(JSON.stringify(s), before);
    X.move(s,{from:54,to:45}); assert.equal(JSON.stringify(s), after);
  }
  assert.ok(revealed.size > 3);
});

test('hidden xiangqi: cannon captures covered piece, both identities become public', () => {
  const s=hidden(42), before=JSON.stringify(s);
  assert.equal(X.move(s,{from:64,to:1}),true);
  assert.equal(s.lastMove.capturedCovered,true); assert.equal(s.lastMove.capture[0],'b');
  assert.equal(s.revealed.length,2); assert.ok(s.revealed.includes(s.lastMove.capture));
  assert.equal(s.covered.filter(Boolean).length,28); assert.equal(s.board.filter(Boolean).length,31);
  const after=JSON.stringify(s); X.undo(s); assert.equal(JSON.stringify(s),before);
  X.move(s,{from:64,to:1}); assert.equal(JSON.stringify(s),after);
});

test('hidden xiangqi: revealed advisors leave palace; elephants cross river but eye blocks', () => {
  const s=hidden(1); s.board.fill(null); s.covered.fill(false);
  s.board[4]='bK'; s.board[85]='rK'; s.board[49]='rP'; s.board[39]='rA';
  assert.ok(X.legalMoves(s,39).some(m=>m.to===29));
  s.covered[39]=true; assert.equal(X.legalMoves(s,39).length,0);
  s.board[39]=null;s.covered[39]=false;s.board[47]='rB';
  assert.ok(X.legalMoves(s,47).some(m=>m.to===31));
  s.board[39]='rP'; assert.ok(!X.legalMoves(s,47).some(m=>m.to===31));
  s.board[39]=null;s.covered[47]=true;assert.ok(!X.legalMoves(s,47).some(m=>m.to===31));
  s.board[49]=null;assert.equal(X.inCheck(s),true);
});

test('hidden xiangqi: random games conserve each side piece inventory and own king safety', () => {
  for(let seed=1;seed<=5;seed++) {
    const s=hidden(seed), random=rng(seed*31), captures=[];
    for(let turn=0;turn<180 && s.status==='playing';turn++) {
      const moves=X.legalMoves(s), move=moves[Math.floor(random()*moves.length)], side=s.turn;
      assert.ok(move);assert.ok(X.move(s,move));assert.equal(X.inCheck(s,side),false);
      if(s.lastMove.capture)captures.push(s.lastMove.capture);
      assert.equal(s.board.filter(Boolean).length+captures.length,32);
      assert.equal(s.covered.filter(Boolean).length+s.revealed.length,30);
      for(const color of ['r','b']) for(const [type,limit] of [['R',2],['N',2],['B',2],['A',2],['C',2],['P',5]]) assert.ok(s.revealed.filter(p=>p===color+type).length<=limit);
    }
  }
});

test('coganh: connected graph, diagonals only on alternate nodes, eight pieces each', () => {
  const s=C.createGame();assert.equal(s.board.filter(p=>p===1).length,8);assert.equal(s.board.filter(p=>p===-1).length,8);
  assert.deepEqual(C.neighbors(0),[5,1,6]);assert.deepEqual(C.neighbors(1),[6,2,0]);
  assert.equal(C.neighbors(12).length,8);assert.equal(C.neighbors(4).includes(5),false);
  for(let i=0;i<25;i++)for(const j of C.neighbors(i))assert.ok(C.neighbors(j).includes(i));
  for(const i of [-1,25,1.2])assert.deepEqual(C.neighbors(i),[]);
});

test('coganh: multiple gánh axes flip simultaneously; vây requires no group liberties', () => {
  const board=Array(25).fill(0);for(const i of [6,7,8,11,13,16,17,18])board[i]=-1;
  assert.deepEqual(C.ganh(board,12,1).sort((a,b)=>a-b),[6,7,8,11,13,16,17,18]);
  const b=Array(25).fill(1);b[0]=b[1]=-1;b[2]=0;assert.deepEqual(C.trapped(b,-1),[]);
  b[2]=1;assert.deepEqual(C.trapped(b,-1).sort((a,b)=>a-b),[0,1]);
});

test('coganh: mở forces entry and gánh, can be disabled, undo restores forced position', () => {
  const s=C.createGame();s.board.fill(0);for(const i of [11,12,13])s.board[i]=1;for(const i of [0,7])s.board[i]=-1;
  assert.ok(C.play(s,12,17));assert.equal(s.trap,12);assert.deepEqual(C.legalMoves(s),[{from:7,to:12}]);
  const before=JSON.stringify(s);assert.ok(!C.play(s,0,1));assert.equal(JSON.stringify(s),before);
  assert.ok(C.play(s,7,12));assert.equal(s.board[11],-1);assert.equal(s.board[13],-1);
  C.undo(s);assert.equal(JSON.stringify(s),before);s.opening=false;assert.ok(C.legalMoves(s).some(m=>m.to!==12));
});

test('coganh: invalid moves and minimax do not mutate; undo exact and draws bounded', () => {
  const s=C.createGame(), before=JSON.stringify(s);
  for(const move of [[0,6],[14,0],[14,14],[-1,0],['14',13]])assert.equal(C.play(s,...move),false);
  assert.equal(JSON.stringify(s),before);
  const m=C.chooseMove(s);assert.equal(JSON.stringify(s),before);assert.ok(C.play(s,m.from,m.to));C.undo(s);assert.equal(JSON.stringify(s),before);
  s.turn=299;assert.ok(C.play(s,m.from,m.to));assert.equal(s.phase,'finished');assert.equal(s.winner,0);
});

test('coganh: random full games conserve all 16 pieces and finish within 300 moves', () => {
  for(let seed=1;seed<=30;seed++) {
    const s=C.createGame({opening:seed%2===0}), random=rng(seed);
    while(s.phase==='play') {
      const moves=C.legalMoves(s),m=moves[Math.floor(random()*moves.length)]; assert.ok(m);assert.ok(C.play(s,m.from,m.to));
      assert.equal(s.board.filter(Boolean).length,16);assert.ok(s.turn<=300);
      if(s.trap!=null)assert.ok(C.legalMoves(s).every(m=>m.to===s.trap));
    }
    assert.ok([0,1,-1].includes(s.winner));assert.deepEqual(C.legalMoves(s),[]);
  }
});

test('piano: each chart and tempo has ordered playable notes and valid lanes', () => {
  for(const song of P.SONGS)for(const bpm of [60,90,120]) {
    const s=P.createGame({song:song.id,bpm});assert.ok(s.notes.length>=30);assert.equal(s.notes[0].at,2);
    s.notes.forEach((n,i)=>{assert.ok(n.pitch>=48&&n.pitch<=84);assert.ok(n.lane>=0&&n.lane<4);if(i){assert.ok(n.at>s.notes[i-1].at);assert.notEqual(n.lane,s.notes[i-1].lane);}});
  }
});

test('piano: preparatory taps ignored, precise and good hits score once, combo increases', () => {
  const s=P.createGame();assert.equal(P.hit(s,0).ignored,true);assert.equal(s.hearts,3);
  for(let i=0;i<11;i++) { const n=s.notes[i];P.tick(s,n.at-s.time);const result=P.hit(s,n.lane);assert.ok(result.ok);assert.equal(result.points,i===10?200:100); }
  assert.equal(s.score,1200);assert.equal(s.combo,11);
  const n=s.notes[11];P.tick(s,n.at-s.time+.16);assert.equal(P.hit(s,n.lane).points,120);
  const hits=s.hits;assert.equal(P.hit(s,n.lane).ok,false);assert.equal(s.hits,hits);assert.equal(s.combo,0);assert.equal(s.hearts,2);
});

test('piano: miss consumes one life only; third error ends and terminal state freezes', () => {
  const s=P.createGame();P.tick(s,2.23);assert.equal(s.hearts,2);P.tick(s,.02);assert.equal(s.hearts,2);
  const wrong=(s.notes[1].lane+1)%4;P.hit(s,wrong);P.hit(s,wrong);assert.equal(s.phase,'finished');assert.equal(s.won,false);
  const before=JSON.stringify(s);P.tick(s,100);P.hit(s,0);assert.equal(JSON.stringify(s),before);
  const t=P.createGame();P.tick(t,100);assert.equal(t.hearts,0);assert.equal(t.misses,3);
});

test('piano: all three complete melodies finish once and cap combo multiplier', () => {
  for(const song of P.SONGS){const s=P.createGame({song:song.id});for(const n of s.notes){P.tick(s,n.at-s.time);assert.ok(P.hit(s,n.lane).ok);}assert.equal(s.won,true);assert.equal(s.hits,s.notes.length);assert.equal(s.hearts,3);assert.ok(s.score<=s.hits*400);}
});

test('jigsaw: shuffled permutations and complementary tabs for every supported size', () => {
  for(const size of [3,4,5])for(const random of [rng(3),()=>0,()=>.99999]) {
    const s=J.createGame({size},random);assert.equal(new Set(s.order).size,size*size);assert.ok(s.order.some((v,i)=>v!==i));
    for(let i=0;i<size*size;i++){const e=J.edges(size,i);assert.equal(e.length,4);if(i<size)assert.equal(e[0],0);if(i%size===0)assert.equal(e[3],0);if(i>=size*(size-1))assert.equal(e[2],0);if(i%size===size-1)assert.equal(e[1],0);else assert.equal(e[1],-J.edges(size,i+1)[3]);if(i<size*(size-1))assert.equal(e[2],-J.edges(size,i+size)[0]);assert.ok(J.path(size,i).endsWith(' Z'));}
  }
});

test('jigsaw: wrong slots, locked pieces, hints, score and terminal freeze on all nine boards', () => {
  for(const scene of J.SCENES)for(const size of [3,4,5]) {
    const s=J.createGame({scene:scene.id,size},rng(1));J.tick(s,42);
    assert.equal(J.place(s,0,1).mismatch,true);assert.equal(s.count,0);assert.equal(J.hint(s),0);
    for(const id of s.order)assert.equal(J.place(s,id,id).ok,true);
    assert.equal(s.phase,'finished');assert.equal(s.score,940);const before=JSON.stringify(s);
    assert.equal(J.place(s,0,0).ok,false);assert.equal(J.hint(s),null);J.tick(s,10);assert.equal(JSON.stringify(s),before);
  }
});

test('jigsaw: invalid placements leave state alone, repeated hints never reduce score below 100', () => {
  const s=J.createGame(),before=JSON.stringify(s);for(const pair of [[-1,0],[0,9],[.5,.5],['0',0]])assert.equal(J.place(s,...pair).ok,false);assert.equal(JSON.stringify(s),before);
  for(let i=0;i<40;i++)J.hint(s);for(const id of s.order)J.place(s,id,id);assert.equal(s.score,100);
});
