(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./coloring-art.js'):root.ArcadeColoringArt);if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeColoring=api;})(typeof globalThis!=='undefined'?globalThis:this,function(A){
  'use strict';
  const PALETTE=['#c95e62','#ed986b','#edc96b','#adc578','#58967e','#71b8b9','#6897bd','#847aaf','#b28caf','#e7b8c3','#b68e67','#6d635e','#394e4b','#efe4c8','#becfd2','#ceddba'];
  const scene=id=>A.SCENES.find(s=>s.id===id)||A.SCENES[0];
  function createGame(id,saved){const art=scene(id),colors={};if(saved?.version===1&&saved.scene===art.id&&saved.colors&&typeof saved.colors==='object')for(const r of art.regions){const c=saved.colors[r.id];if(typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c))colors[r.id]=c.toLowerCase();}return {scene:art.id,colors,history:[],future:[],completed:false};}
  function remember(s){s.history.push({...s.colors});if(s.history.length>100)s.history.shift();s.future=[];s.completed=false;}
  function paint(s,id,color){if(!scene(s.scene).regions.some(r=>r.id===id)||(color!==null&&(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))))return false;const value=color?.toLowerCase();if((s.colors[id]||undefined)===value)return false;remember(s);if(color===null)delete s.colors[id];else s.colors[id]=value;return true;}
  function undo(s){if(!s.history.length)return false;s.future.push({...s.colors});s.colors=s.history.pop();s.completed=false;return true;}
  function redo(s){if(!s.future.length)return false;s.history.push({...s.colors});s.colors=s.future.pop();s.completed=false;return true;}
  function clear(s){if(!Object.keys(s.colors).length)return false;remember(s);s.colors={};return true;}
  const snapshot=s=>({version:1,scene:s.scene,colors:{...s.colors}});
  const progress=s=>({painted:Object.keys(s.colors).length,total:scene(s.scene).regions.length});
  return {SCENES:A.SCENES,PALETTE,scene,createGame,paint,undo,redo,clear,snapshot,progress};
});
