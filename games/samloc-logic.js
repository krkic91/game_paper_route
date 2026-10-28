(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./vn-cards.js'):root.ArcadeVNCards);if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeSamloc=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const power=c=>C.rank(c)===2?15:C.rank(c),order=(a,b)=>power(a)-power(b)||a-b;
  function classify(cards){
    if(!Array.isArray(cards)||!cards.length||cards.length>10||cards.some(c=>!C.valid(c))||new Set(cards).size!==cards.length)return null;
    const ranks=cards.map(C.rank).sort((a,b)=>a-b),n=cards.length;
    if(n===1)return {type:'single',size:n,top:power(cards[0])};
    if(ranks.every(r=>r===ranks[0])&&n<=4)return {type:['','','pair','triple','quad'][n],size:n,top:power(cards[0])};
    if(n<3||new Set(ranks).size!==n)return null;
    if(ranks.at(-1)===14&&ranks[0]===2&&ranks.slice(0,-1).every((r,i)=>r===i+2))return {type:'straight',size:n,top:n};
    if(ranks.every((r,i)=>!i||r===ranks[i-1]+1))return {type:'straight',size:n,top:ranks.at(-1)};
    return null;
  }
  const comboName=m=>m?({single:'Lẻ',pair:'Đôi',triple:'Sám cô',quad:'Tứ quý',straight:`Sảnh ${m.size} lá`})[m.type]:'Chưa thành bộ';
  function beats(a,b){return Boolean(a&&(!b||(a.type===b.type&&a.size===b.size&&a.top>b.top)||(a.type==='quad'&&b.type==='single'&&b.top===15)));}
  function combinations(hand){const result=[];for(let mask=1;mask<(1<<hand.length);mask++){const cards=hand.filter((_,i)=>mask&(1<<i)),combo=classify(cards);if(combo)result.push({cards,combo});}return result;}
  function instant(hand){
    const counts=Array(15).fill(0);hand.forEach(c=>counts[C.rank(c)]++);
    if(classify(hand)?.type==='straight')return 5;
    if(counts[2]===4)return 4;
    if(hand.every(c=>(C.suit(c)>1)===(C.suit(hand[0])>1)))return 3;
    if(counts.filter(n=>n>=3).length>=3)return 2;
    if(counts.reduce((n,c)=>n+Math.floor(c/2),0)>=5)return 1;
    return 0;
  }
  function finish(s,winner,reason,loser=null){s.phase='finished';s.winner=winner;s.reason=reason;s.loser=loser;}
  function createGame(options={}){
    const deck=C.deck(options.random),hands=Array.from({length:4},(_,p)=>deck.slice(p*10,p*10+10).sort(order));
    let first=Number.isInteger(options.first)&&options.first>=0&&options.first<4?options.first:0;
    if(options.first==null){const low=Math.min(...hands.flat().map(power));first=hands.findIndex(h=>h.some(c=>power(c)===low));}
    const s={hands,stock:deck.slice(40),played:[],current:0,first,phase:'declare',declarations:[null,null,null,null],caller:null,trick:null,passed:[false,false,false,false],turn:0,round:1,winner:null,loser:null,reason:null,last:null};
    const white=hands.map(instant),best=Math.max(...white);if(best){const winner=white.indexOf(best);finish(s,winner,'white');s.white=best;}
    return s;
  }
  function declare(s,player,call){
    if(s.phase!=='declare'||player!==s.current||typeof call!=='boolean')return false;
    s.declarations[player]=call;
    if(player<3)s.current++;else{s.caller=s.declarations.indexOf(true);if(s.caller<0)s.caller=null;s.current=s.caller??s.first;s.phase='play';}return true;
  }
  function legalMoves(s,player=s.current){
    if(s.phase!=='play'||player!==s.current||s.passed[player])return [];
    let moves=combinations(s.hands[player]).filter(m=>beats(m.combo,s.trick?.combo));
    // Automatic one-card warning: the preceding player must use their highest
    // single if they choose a single. Multi-card combinations are still allowed.
    if(s.hands[(player+1)%4].length===1){const high=Math.max(...s.hands[player].map(power));moves=moves.filter(m=>m.combo.type!=='single'||m.combo.top===high);}
    return moves;
  }
  function advance(s,player){
    if(s.passed.every((v,p)=>p===s.trick.player||v)){
      if(s.caller!=null&&!s.hands[s.caller].length){finish(s,s.caller,'sam');return;}
      s.current=s.trick.player;s.trick=null;s.passed.fill(false);s.round++;return;
    }
    for(let n=1;n<=4;n++){const p=(player+n)%4;if(!s.passed[p]){s.current=p;return;}}
  }
  function play(s,player,cards){
    if(!Array.isArray(cards)||new Set(cards).size!==cards.length)return false;
    const key=cards.slice().sort((a,b)=>a-b).join(','),move=legalMoves(s,player).find(m=>m.cards.slice().sort((a,b)=>a-b).join(',')===key);if(!move)return false;
    const chosen=new Set(cards);s.hands[player]=s.hands[player].filter(c=>!chosen.has(c));s.played.push(...move.cards);s.turn++;s.last={type:'play',player,cards:move.cards.slice()};
    if(s.caller!=null&&player!==s.caller){s.trick={player,...move};finish(s,player,'sam-blocked',s.caller);return true;}
    s.trick={player,cards:move.cards.slice(),combo:move.combo};
    if(!s.hands[player].length){
      if(move.combo.type!=='straight'&&move.combo.top===15){finish(s,null,'last-two',player);return true;}
      if(s.caller==null){finish(s,player,'out');return true;}
    }
    advance(s,player);return true;
  }
  function pass(s,player){
    if(s.phase!=='play'||player!==s.current||s.passed[player]||!s.trick||s.trick.player===player)return false;
    s.passed[player]=true;s.turn++;s.last={type:'pass',player};advance(s,player);return true;
  }
  function shouldCall(hand){const moves=combinations(hand);return moves.some(m=>m.cards.length>=8&&m.combo.type==='straight'&&m.combo.top===14)&&!hand.some(c=>C.rank(c)===2);}
  function chooseMove(s,player=s.current){
    if(s.phase==='declare')return {type:'declare',call:shouldCall(s.hands[player])};
    const moves=legalMoves(s,player);if(!moves.length)return {type:'pass'};
    const hand=s.hands[player],groups=Array(16).fill(0);hand.forEach(c=>groups[power(c)]++);
    const cost=m=>{
      const out=m.cards.length===hand.length;
      if(out)return m.combo.top===15&&m.combo.type!=='straight'?10000:-10000;
      const remaining=hand.filter(c=>!m.cards.includes(c)),twos=remaining.filter(c=>power(c)===15).length;
      let split=0;for(const rank of new Set(m.cards.map(power))){const used=m.cards.filter(c=>power(c)===rank).length;if(groups[rank]>used)split+=8;}
      return -m.cards.length*(s.trick?3:16)+m.combo.top+split+(twos===remaining.length?180:0)+(m.combo.type==='quad'&&s.trick?.combo.type!=='quad'?30:0);
    };
    moves.sort((a,b)=>cost(a)-cost(b)||a.cards[0]-b.cards[0]);return {type:'play',cards:moves[0].cards.slice()};
  }
  function view(s,player=0){return {hand:s.hands[player].slice(),counts:s.hands.map(h=>h.length),current:s.current,phase:s.phase,caller:s.caller,declarations:s.declarations.slice(),passed:s.passed.slice(),trick:s.trick&&{...s.trick,cards:s.trick.cards.slice()},winner:s.winner,loser:s.loser,reason:s.reason,turn:s.turn,round:s.round,last:s.last&&{...s.last},white:s.white};}
  return {createGame,classify,beats,combinations,comboName,instant,declare,legalMoves,play,pass,chooseMove,view,power,order};
});
