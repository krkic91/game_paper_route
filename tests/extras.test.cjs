'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../games/vn-cards.js'),S=require('../games/samloc-logic.js'),M=require('../games/maubinh-logic.js'),R=require('../games/riddles-logic.js'),P=require('../games/coloring-logic.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const c=(r,s=0)=>(r-2)*4+s;
const hand=ranks=>ranks.map((r,i)=>c(r,i%4));
function sam(hands,caller=null){return {hands,stock:[],played:[],current:0,first:0,phase:'play',declarations:[false,false,false,false],caller,trick:null,passed:[false,false,false,false],turn:0,round:1,winner:null,loser:null,reason:null,last:null};}

test('cards: 52 distinct cards, valid labels and bounded shuffle for hostile RNGs',()=>{
  for(const random of [rng(1),()=>0,()=>1,()=>-1,()=>NaN,()=>Infinity]){const deck=C.deck(random);assert.equal(new Set(deck).size,52);assert.ok(deck.every(C.valid));assert.equal(deck.filter(i=>C.rank(i)===14).length,4);}
  assert.equal(C.name(c(14,3)),'A cơ');assert.equal(C.compare([1,12,14],[1,13,2]),-1);
});

test('sam: four ten-card hands and twelve unused cards, declaration and starter order',()=>{
  const s=S.createGame({random:rng(21)});assert.equal(s.phase,'declare');assert.deepEqual(s.hands.map(h=>h.length),[10,10,10,10]);assert.equal(s.stock.length,12);
  assert.equal(new Set([...s.hands.flat(),...s.stock]).size,52);const before=JSON.stringify(s);assert.equal(S.declare(s,1,true),false);assert.equal(JSON.stringify(s),before);
  for(let p=0;p<4;p++)assert.ok(S.declare(s,p,p===2));assert.equal(s.caller,2);assert.equal(s.current,2);assert.equal(s.phase,'play');
  const t=S.createGame({random:rng(21),first:3});for(let p=0;p<4;p++)S.declare(t,p,false);assert.equal(t.current,3);
});

test('sam: rank-only comparisons, valid combinations, low ace and no wrapping straights',()=>{
  assert.equal(S.beats(S.classify([c(8,3)]),S.classify([c(8,0)])),false);
  const a=S.classify(hand([14,2,3])),b=S.classify(hand([2,3,4]));assert.equal(a.top,3);assert.equal(b.top,4);assert.ok(S.beats(b,a));
  assert.equal(S.classify(hand([13,14,2])),null);assert.equal(S.classify([c(3),c(3)]),null);assert.equal(S.classify(hand([3,3,4,4,5,5])),null);
  assert.equal(S.classify([c(5,0),c(5,1),c(5,2)]).type,'triple');
  assert.ok(S.beats(S.classify([c(7,0),c(7,1),c(7,2),c(7,3)]),S.classify([c(2)])));
  assert.equal(S.beats(S.classify([c(7,0),c(7,1),c(7,2),c(7,3)]),S.classify([c(2,0),c(2,1)])),false);
});

test('sam: automatic white hands have documented precedence',()=>{
  assert.equal(S.instant(Array.from({length:10},(_,i)=>c(i+3,i%4))),5);
  assert.equal(S.instant([0,1,2,3,...hand([5,6,7,9,11,13])]),4);
  assert.equal(S.instant([2,6,10,18,22,26,34,38,42,50]),3);
  assert.equal(S.instant([c(4,0),c(4,1),c(4,2),c(7,0),c(7,1),c(7,2),c(10,0),c(10,1),c(10,2),c(14,3)]),2);
  assert.equal(S.instant([4,5,16,17,28,29,40,41,48,50]),1);
});

test('sam: passing locks a seat until the next trick and owner leads again',()=>{
  const s=sam([[c(3),c(5)],[c(6),c(7)],[c(4),c(8)],[c(9),c(10)]]);
  assert.ok(S.play(s,0,[c(3)]));assert.ok(S.pass(s,1));assert.ok(S.play(s,2,[c(4)]));assert.ok(S.pass(s,3));
  assert.equal(s.current,0);assert.deepEqual(S.legalMoves(s,1),[]);assert.ok(S.play(s,0,[c(5)]));assert.equal(s.phase,'finished');
  const t=sam([[c(3),c(5)],[c(6),c(7)],[c(4),c(8)],[c(9),c(10)]]);S.play(t,0,[c(3)]);for(const p of [1,2,3])assert.ok(S.pass(t,p));
  assert.equal(t.current,0);assert.equal(t.trick,null);assert.deepEqual(t.passed,[false,false,false,false]);assert.equal(S.pass(t,0),false);
});

test('sam: báo sâm must wait for all opponents even after its final card',()=>{
  const s=sam([[c(9)],[c(8)],[c(7)],[c(6)]],0);assert.ok(S.play(s,0,[c(9)]));assert.equal(s.phase,'play');assert.equal(s.hands[0].length,0);
  S.pass(s,1);S.pass(s,2);assert.equal(s.phase,'play');S.pass(s,3);assert.equal(s.reason,'sam');assert.equal(s.winner,0);
  const t=sam([[c(9)],[c(10)],[c(7)],[c(6)]],0);S.play(t,0,[c(9)]);S.play(t,1,[c(10)]);assert.equal(t.reason,'sam-blocked');assert.equal(t.loser,0);assert.equal(t.winner,1);
});

test('sam: last two loses; one-card warning forces the preceding highest single',()=>{
  const s=sam([[c(2)],[c(8),c(9)],[c(7)],[c(6)]]);S.play(s,0,[c(2)]);assert.equal(s.reason,'last-two');assert.equal(s.loser,0);assert.equal(s.winner,null);
  const t=sam([[c(3),c(8)],[c(4)],[c(7),c(9)],[c(6),c(10)]]);assert.deepEqual(S.legalMoves(t).map(m=>m.cards),[[c(8)]]);assert.equal(S.play(t,0,[c(3)]),false);
  const u=sam([hand([14,2,3]),[c(8),c(9)],[c(7)],[c(6)]]);S.play(u,0,hand([14,2,3]));assert.equal(u.reason,'out');assert.equal(u.winner,0);
});

test('sam: invalid actions do not mutate; bot ignores identities of opponents and stock',()=>{
  const s=S.createGame({random:rng(21)});for(let i=0;i<4;i++)S.declare(s,i,false);
  const before=JSON.stringify(s);assert.equal(S.play(s,s.current,[-1]),false);assert.equal(S.play(s,(s.current+1)%4,s.hands[0].slice(0,1)),false);assert.equal(JSON.stringify(s),before);
  const move=S.chooseMove(s),t=structuredClone(s),other=[0,1,2,3].filter(p=>p!==t.current);[t.hands[other[0]],t.hands[other[1]]]=[t.hands[other[1]],t.hands[other[0]]];t.stock.reverse();assert.deepEqual(S.chooseMove(t),move);assert.equal(JSON.stringify(s),before);
  const view=S.view(s);assert.equal('hands' in view,false);assert.equal('stock' in view,false);assert.equal(view.hand.length,10);
});

test('sam: 120 seeded complete matches preserve the deck and have bounded legal turns',()=>{
  for(let seed=1;seed<=120;seed++){
    const s=S.createGame({random:rng(seed)});
    while(s.phase==='declare'){const m=S.chooseMove(s);assert.ok(S.declare(s,s.current,seed%3===0?m.call:false));}
    while(s.phase==='play'){
      const before=JSON.stringify(s),m=S.chooseMove(s);assert.equal(JSON.stringify(s),before);assert.ok(m.type==='pass'?S.pass(s,s.current):S.play(s,s.current,m.cards));
      const all=[...s.hands.flat(),...s.stock,...s.played];assert.equal(all.length,52);assert.equal(new Set(all).size,52);assert.ok(s.turn<240);
    }
    const before=JSON.stringify(s);assert.equal(S.pass(s,0),false);assert.equal(S.play(s,0,[]),false);assert.equal(JSON.stringify(s),before);
  }
});

test('maubinh: all poker categories, three-card restrictions and wheel ordering',()=>{
  const fixtures=[hand([14,11,9,7,3]),hand([8,8,14,10,3]),hand([8,8,3,3,14]),hand([8,8,8,14,3]),hand([5,6,7,8,9]),[2,10,22,34,46],hand([8,8,8,3,3]),[c(8,0),c(8,1),c(8,2),c(8,3),c(3)], [c(10,2),c(11,2),c(12,2),c(13,2),c(14,2)]];
  fixtures.forEach((cards,i)=>assert.equal(M.evaluate(cards)[0],i));
  assert.equal(M.evaluate([c(2,1),c(3,1),c(4,1)])[0],0);assert.equal(M.evaluate(hand([8,8,8]))[0],3);
  assert.deepEqual(M.evaluate(hand([14,2,3,4,5])),[4,5]);assert.ok(M.compare(M.evaluate(hand([2,3,4,5,6])),M.evaluate(hand([14,2,3,4,5])))>0);
  assert.equal(M.evaluate(hand([12,13,14,2,3]))[0],0);assert.equal(M.evaluate([0,0,1]),null);
});

test('maubinh: compare group rank before kickers; suits never break a tie',()=>{
  assert.ok(M.compare(M.evaluate(hand([5,5,12,10,9])),M.evaluate(hand([4,4,14,13,12])))>0);
  assert.ok(M.compare(M.evaluate(hand([6,6,6,2,2])),M.evaluate(hand([5,5,5,14,14])))>0);
  assert.equal(M.compare(M.evaluate([c(14,0),c(9,1),c(7,2)]),M.evaluate([c(14,3),c(9,2),c(7,1)])),0);
});

test('maubinh: manual assignment, exchange, return and binh lủng validation',()=>{
  const s=M.createGame({random:rng(1)}),a=s.hand[0],b=s.hand[1];assert.ok(M.assign(s,a,0));assert.ok(M.swap(s,a,b));assert.deepEqual(s.groups[0],[b]);assert.ok(M.assign(s,b,-1));assert.deepEqual(s.groups[0],[]);
  assert.ok(M.hint(s));assert.equal(M.validate(s.hand,s.groups).ok,true);const before=JSON.stringify(s);assert.equal(M.assign(s,s.hand[0],9),false);assert.equal(JSON.stringify(s),before);
  const swapped=[s.groups[0],s.groups[2],s.groups[1]];if(M.compare(M.evaluate(s.groups[2]),M.evaluate(s.groups[1]))>0)assert.equal(M.validate(s.hand,swapped).ok,false);
  const duplicate=s.groups.map(g=>g.slice());duplicate[1][0]=duplicate[0][0];assert.equal(M.validate(s.hand,duplicate).ok,false);
});

test('maubinh: suggestions for 24 hands are legal, deterministic and do not mutate input',()=>{
  for(let seed=0;seed<24;seed++){const hand=C.deck(rng(seed)).slice(0,13),before=hand.slice(),groups=M.suggest(hand);assert.ok(M.validate(hand,groups).ok);assert.deepEqual(hand,before);if(seed<3)assert.deepEqual(M.suggest(hand),groups);assert.equal(new Set(groups.flat()).size,13);}
  assert.equal(M.suggest([0,1,2]),null);
});

test('maubinh: exact per-row scoring, sweeps, ties and zero-sum totals',()=>{
  const weak=[hand([4,5,7]),hand([2,3,4,6,8]),hand([9,9,2,4,6])],strong=[hand([14,14,14]),hand([11,11,11,3,3]),[c(10,0),c(11,0),c(12,0),c(13,0),c(14,0)]];
  const r=M.settle([strong,weak,weak,weak]);assert.deepEqual(r.points,[18,-6,-6,-6]);assert.ok(r.pairs.filter(p=>p.a===0).every(p=>p.sweep));assert.equal(r.points.reduce((a,b)=>a+b,0),0);
  const tied=M.settle([weak,weak,weak,weak]);assert.deepEqual(tied.points,[0,0,0,0]);assert.deepEqual(tied.winners,[0,1,2,3]);
});

test('maubinh: opponent cards remain private until reveal and all 52 cards survive settlement',()=>{
  const s=M.createGame({random:rng(9)});assert.equal('hands' in s,false);assert.equal(JSON.stringify(s).includes('layouts'),false);assert.equal(M.submit(s).ok,false);
  M.hint(s);assert.equal(M.submit(s).ok,true);assert.equal(s.phase,'finished');assert.equal(new Set(s.result.layouts.flat(2)).size,52);assert.equal(s.result.points.reduce((a,b)=>a+b,0),0);
  const before=JSON.stringify(s);assert.equal(M.submit(s).ok,false);assert.equal(M.hint(s),false);assert.equal(M.assign(s,s.hand[0],0),false);M.tick(s,10);assert.equal(JSON.stringify(s),before);
});

test('riddles: 150 unique curated prompts, complete hints and three balanced categories',()=>{
  assert.equal(R.QUESTIONS.length,150);assert.equal(new Set(R.QUESTIONS.map(q=>q.id)).size,150);assert.equal(new Set(R.QUESTIONS.map(q=>R.normalize(q.answer))).size,150);
  for(const cat of ['nature','life','idiom'])assert.equal(R.QUESTIONS.filter(q=>q.category===cat).length,50);
  for(const q of R.QUESTIONS){assert.ok(q.pictures.length>=2&&q.pictures.length<=5);assert.ok(q.hint.length>15);assert.ok(q.explanation.length>5,q.id);assert.ok(q.answer===q.answer.normalize('NFC'));}
});

test('riddles: shuffled sessions prioritize unseen questions and respect category',()=>{
  const a=R.createGame({category:'nature'},rng(3)),b=R.createGame({category:'nature',solved:a.order},rng(3));assert.equal(new Set(a.order).size,10);assert.ok(b.order.every(id=>!a.order.includes(id)));assert.ok(a.order.every(id=>id.startsWith('nature-')));
  assert.equal(R.createGame({category:'bogus'},()=>1).category,'all');
});

test('riddles: normalized answers, hints, mistakes and score floor cannot be replayed',()=>{
  const s=R.createGame({},rng(2));assert.equal(R.submit(s,'').empty,true);assert.equal(s.mistakes,0);
  assert.equal(R.submit(s,'zzzz').ok,false);assert.ok(R.hint(s));assert.ok(R.hint(s));assert.equal(R.hint(s),null);
  assert.equal(R.submit(s,'  '+R.normalize(R.current(s).answer).toUpperCase()+'!').points,50);const before=JSON.stringify(s);assert.equal(R.submit(s,R.current(s).answer).ok,false);assert.equal(JSON.stringify(s),before);
  R.next(s);for(let n=0;n<30;n++)R.submit(s,'zzzz');assert.equal(R.submit(s,R.current(s).answer).points,10);
});

test('riddles: every prompt accepts its answer and sessions finish after ten decisions',()=>{
  for(const q of R.QUESTIONS){const s=R.createGame();s.order[0]=q.id;assert.equal(R.submit(s,q.answer).ok,true);}
  const s=R.createGame({},rng(8));for(let i=0;i<10;i++){if(i%2)R.skip(s);else R.submit(s,R.current(s).answer);assert.ok(R.next(s));}assert.equal(s.phase,'finished');assert.equal(s.correct,5);assert.equal(s.skipped,5);assert.equal(s.score,500);const before=JSON.stringify(s);R.skip(s);R.next(s);R.hint(s);assert.equal(JSON.stringify(s),before);
});

test('coloring: six original scenes and stable unique regions with closed SVG shapes',()=>{
  assert.equal(P.SCENES.length,6);for(const s of P.SCENES){assert.ok(s.regions.length>=18);assert.equal(new Set(s.regions.map(r=>r.id)).size,s.regions.length);assert.ok(s.regions.every(r=>r.label&&r.shape&&!/script|foreignObject|https?:/i.test(r.shape)));}
});

test('coloring: paint, erase, undo/redo, branch edits and clear remain reversible',()=>{
  const s=P.createGame('garden');assert.ok(P.paint(s,'r0','#ABCDEF'));assert.equal(s.colors.r0,'#abcdef');assert.equal(P.paint(s,'r0','#abcdef'),false);
  P.paint(s,'r1','#123456');P.undo(s);assert.equal(s.colors.r1,undefined);P.redo(s);assert.equal(s.colors.r1,'#123456');P.paint(s,'r0',null);assert.equal(s.colors.r0,undefined);P.undo(s);assert.equal(s.colors.r0,'#abcdef');
  P.clear(s);assert.deepEqual(s.colors,{});P.undo(s);assert.equal(Object.keys(s.colors).length,2);P.paint(s,'r2','#334455');assert.equal(P.redo(s),false);
});

test('coloring: saved colors validate IDs and values, storage snapshots own their data',()=>{
  const s=P.createGame('ocean',{version:1,scene:'ocean',colors:{r0:'#123456',r1:'url(javascript:bad)',bogus:'#ffffff'}});assert.deepEqual(s.colors,{r0:'#123456'});
  const saved=P.snapshot(s);saved.colors.r0='#000000';assert.equal(s.colors.r0,'#123456');assert.deepEqual(P.createGame('home',saved).colors,{});
  const before=JSON.stringify(s);assert.equal(P.paint(s,'bogus','#111111'),false);assert.equal(P.paint(s,'r1','red'),false);assert.equal(JSON.stringify(s),before);
  for(let n=0;n<120;n++)P.paint(s,'r0',n%2?'#000000':'#ffffff');assert.equal(s.history.length,100);
});
