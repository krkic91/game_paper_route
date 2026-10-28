(function(){
  'use strict';const C=window.ArcadeVNCards;
  window.ArcadeVNCardUI={card(id,attribute){
    const el=document.createElement(attribute?'button':'span');el.className='vn-card'+(C.suit(id)>1?' is-red':'');
    el.innerHTML=`<b aria-hidden="true">${C.label(id)}</b><span aria-hidden="true">${C.SUITS[C.suit(id)]}</span><small aria-hidden="true">${C.label(id)}</small>`;
    el.setAttribute('aria-label',C.name(id));if(attribute){el.type='button';el.setAttribute(attribute,id);}else el.setAttribute('role','img');return el;
  }};
})();
