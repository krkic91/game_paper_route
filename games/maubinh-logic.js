(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./vn-cards.js'):root.ArcadeVNCards);if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeMaubinh=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const records=new WeakMap(),SIZES=[3,5,5],NAMES=['Mậu thầu','Một đôi','Thú','Sám cô','Sảnh','Thùng','Cù lũ','Tứ quý','Thùng phá sảnh'];
  function evaluate(cards){
    if(!Array.isArray(cards)||![3,5].includes(cards.length)||cards.some(c=>!C.valid(c))||new Set(cards).size!==cards.length)return null;
    const ranks=cards.map(C.rank).sort((a,b)=>b-a),counts=new Map();ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
    const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),five=cards.length===5;
    const flush=five&&cards.every(c=>C.suit(c)===C.suit(cards[0]));
    const straight=five&&counts.size===5?(ranks[0]-ranks[4]===4?ranks[0]:ranks.join(',')==='14,5,4,3,2'?5:0):0;
    if(flush&&straight)return [8,straight];
    if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];
    if(five&&groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];
    if(flush)return [5,...ranks];if(straight)return [4,straight];
    if(groups[0][1]===3)return [3,groups[0][0],...groups.slice(1).map(g=>g[0])];
    if(groups[0][1]===2&&groups[1][1]===2)return [2,...groups.map(g=>g[0])];
    if(groups[0][1]===2)return [1,...groups.map(g=>g[0])];return [0,...ranks];
  }
  function validate(hand,groups){
    if(!Array.isArray(groups)||groups.length!==3||groups.some((g,i)=>!Array.isArray(g)||g.length!==SIZES[i]))return {ok:false,error:'Xếp đủ 3 lá ở chi trên, 5 ở chi giữa và 5 ở chi dưới.'};
    const cards=groups.flat();if(new Set(cards).size!==13||cards.some(c=>!hand.includes(c))||hand.length!==13)return {ok:false,error:'Mỗi lá trên tay phải xuất hiện đúng một lần.'};
    const values=groups.map(evaluate);if(values.some(v=>!v))return {ok:false,error:'Bộ bài không hợp lệ.'};
    if(C.compare(values[2],values[1])<0||C.compare(values[1],values[0])<0)return {ok:false,error:'Binh lủng: chi dưới phải mạnh bằng hoặc hơn chi giữa, chi giữa mạnh bằng hoặc hơn chi trên.',values};
    return {ok:true,values};
  }
  function suggest(hand){
    if(!Array.isArray(hand)||hand.length!==13||hand.some(c=>!C.valid(c))||new Set(hand).size!==13)return null;
    const cards=hand.slice().sort((a,b)=>a-b),full=(1<<13)-1,sets=new Map(),fives=[];
    const utility=value=>value[0]*100+value.slice(1).reduce((sum,v,i)=>sum+v/Math.pow(15,i),0);
    for(let mask=1;mask<=full;mask++){
      let n=0;for(let m=mask;m;m&=m-1)n++;
      if(n!==3&&n!==5)continue;const group=cards.filter((_,i)=>mask&(1<<i)),value=evaluate(group),entry={mask,group,value,score:utility(value)};sets.set(mask,entry);if(n===5)fives.push(entry);
    }
    let best=null,score=-Infinity;
    // 1,287 back hands × 56 middle hands; all 72,072 partitions are considered.
    for(const back of fives){
      const remaining=full^back.mask;
      for(let middle=remaining;middle;middle=(middle-1)&remaining){
        const mid=sets.get(middle);if(!mid||mid.group.length!==5||C.compare(back.value,mid.value)<0)continue;
        const front=sets.get(remaining^middle);if(!front||C.compare(mid.value,front.value)<0)continue;
        const value=back.score+mid.score*1.15+front.score*1.35;
        if(value>score){score=value;best=[front.group,mid.group,back.group];}
      }
    }
    return best?.map(g=>g.slice())||null;
  }
  function createGame(options={}){
    const deck=C.deck(options.random),hands=Array.from({length:4},(_,p)=>deck.slice(p*13,p*13+13));
    const state={hand:hands[0].slice().sort((a,b)=>a-b),groups:[[],[],[]],phase:'arrange',result:null,seconds:0,hints:0};records.set(state,{hands});return state;
  }
  function assign(s,card,target){
    if(s.phase!=='arrange'||!s.hand.includes(card)||!Number.isInteger(target)||target< -1||target>2)return false;
    const from=s.groups.findIndex(g=>g.includes(card));if(from===target)return false;
    if(target>=0&&s.groups[target].length>=SIZES[target])return false;
    if(from>=0)s.groups[from]=s.groups[from].filter(c=>c!==card);if(target>=0)s.groups[target].push(card);return true;
  }
  function swap(s,a,b){
    if(s.phase!=='arrange'||a===b||!s.hand.includes(a)||!s.hand.includes(b))return false;
    const groups=s.groups.map(g=>g.map(c=>c===a?b:c===b?a:c));if(JSON.stringify(groups)===JSON.stringify(s.groups))return false;s.groups=groups;return true;
  }
  function hint(s){if(s.phase!=='arrange')return false;const groups=suggest(s.hand);if(!groups)return false;s.groups=groups;s.hints++;return true;}
  function clear(s){if(s.phase!=='arrange')return false;s.groups=[[],[],[]];return true;}
  function settle(layouts){
    const values=layouts.map(groups=>groups.map(evaluate)),points=[0,0,0,0],pairs=[];
    for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
      const rows=values[a].map((v,i)=>C.compare(v,values[b][i]));let total=rows.reduce((n,v)=>n+v,0);const sweep=Math.abs(total)===3;if(sweep)total*=2;
      points[a]+=total;points[b]-=total;pairs.push({a,b,rows,total,sweep});
    }
    return {layouts:layouts.map(gs=>gs.map(g=>g.slice())),values,points,pairs,winners:points.flatMap((p,i)=>p===Math.max(...points)?[i]:[])};
  }
  function submit(s){
    if(s.phase!=='arrange')return {ok:false,error:'Ván đã kết thúc.'};
    const valid=validate(s.hand,s.groups);if(!valid.ok)return valid;
    const record=records.get(s);if(!record)return {ok:false,error:'Ván không còn hợp lệ. Hãy chia lại.'};
    const layouts=[s.groups.map(g=>g.slice()),...record.hands.slice(1).map(suggest)];s.result=settle(layouts);s.phase='finished';return {ok:true};
  }
  function tick(s,dt){if(s.phase==='arrange'&&Number.isFinite(dt)&&dt>0)s.seconds+=dt;}
  return {SIZES,NAMES,evaluate,validate,suggest,createGame,assign,swap,hint,clear,settle,submit,tick,compare:C.compare};
});
