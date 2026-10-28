(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeVNCards=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SUITS=['♠','♣','♦','♥'],NAMES=['bích','tép','rô','cơ'];
  const valid=c=>Number.isInteger(c)&&c>=0&&c<52;
  const rank=c=>Math.floor(c/4)+2,suit=c=>c%4;
  const label=c=>({11:'J',12:'Q',13:'K',14:'A'}[rank(c)]||String(rank(c)));
  const name=c=>`${label(c)} ${NAMES[suit(c)]}`;
  function deck(random=Math.random){const cards=Array.from({length:52},(_,i)=>i);for(let i=51;i>0;i--){const v=Number(random()),j=Math.floor((Number.isFinite(v)?Math.max(0,Math.min(.999999999999,v)):0)*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
  const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d);}return 0;};
  return {SUITS,NAMES,valid,rank,suit,label,name,deck,compare};
});
