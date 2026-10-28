(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./riddles-data.js'):root.ArcadeRiddlesData);if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeRiddles=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D){
  'use strict';
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
  function createGame(options={},random=Math.random){
    const category=Object.hasOwn(D.CATEGORIES,options.category)?options.category:'all',seen=new Set(options.solved||[]);
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const value=Number(random()),j=Math.floor((Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    const pool=D.QUESTIONS.filter(q=>category==='all'||q.category===category),order=[...shuffle(pool.filter(q=>!seen.has(q.id))),...shuffle(pool.filter(q=>seen.has(q.id)))].slice(0,10).map(q=>q.id);
    return {category,order,index:0,phase:'question',score:0,correct:0,skipped:0,mistakes:0,hints:0,solved:[],last:null};
  }
  const current=s=>D.QUESTIONS.find(q=>q.id===s.order[s.index]);
  function submit(s,text){if(s.phase!=='question'||!normalize(text))return {ok:false,empty:true};const q=current(s);if(normalize(text)!==normalize(q.answer)){s.mistakes++;return {ok:false};}const points=Math.max(10,100-s.hints*20-s.mistakes*10);s.score+=points;s.correct++;s.solved.push(q.id);s.phase='answer';s.last={correct:true,points};return {ok:true,points};}
  function hint(s){if(s.phase!=='question'||s.hints>=2)return null;s.hints++;return s.hints===1?current(s).hint:`Bắt đầu bằng “${current(s).answer.split(' ')[0]}”.`;}
  function skip(s){if(s.phase!=='question')return false;s.skipped++;s.phase='answer';s.last={correct:false,points:0};return true;}
  function next(s){if(s.phase!=='answer')return false;if(s.index===s.order.length-1)s.phase='finished';else{s.index++;s.phase='question';s.mistakes=0;s.hints=0;s.last=null;}return true;}
  return {QUESTIONS:D.QUESTIONS,CATEGORIES:D.CATEGORIES,normalize,createGame,current,submit,hint,skip,next};
});
