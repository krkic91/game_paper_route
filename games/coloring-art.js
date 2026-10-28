(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ArcadeColoringArt=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const region=(label,shape)=>({label,shape});
  const circle=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`;
  const path=d=>`<path d="${d}"/>`;
  const rect=(x,y,w,h,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const paper=()=>region('Nền tranh',rect(3,3,594,594,22));
  const scenes=[
    {id:'garden',title:'Vườn hoa nhỏ',regions:[paper(),region('Bãi cỏ',path('M3 465Q140 400 280 465T597 448V575Q597 597 575 597H25Q3 597 3 575Z')),
      region('Mặt trời',circle(495,90,46)),region('Mây',path('M70 110Q48 70 90 63Q112 25 144 62Q190 52 194 93Q207 124 172 128H86Q65 128 70 110Z')),
      ...[170,330,460].flatMap((x,i)=>[region(`Thân hoa ${i+1}`,rect(x-6,250+i*40,12,285-i*40,6)),region(`Lá trái ${i+1}`,path(`M${x} 440q-85 0-82-68 65-3 82 68Z`)),region(`Lá phải ${i+1}`,path(`M${x} 480q80-10 78-72-66 0-78 72Z`)),...Array.from({length:6},(_,n)=>region(`Cánh hoa ${i+1}.${n+1}`,`<ellipse cx="${x}" cy="${202+i*40}" rx="25" ry="48" transform="rotate(${n*60} ${x} ${260+i*40})"/>`)),region(`Nhụy hoa ${i+1}`,circle(x,260+i*40,32))])]},
    {id:'ocean',title:'Bạn của biển',regions:[paper(),region('Đáy cát',path('M3 510Q150 467 300 514T597 510V575Q597 597 575 597H25Q3 597 3 575Z')),
      ...[[155,180],[410,315],[160,420]].flatMap(([x,y],i)=>[region(`Đuôi cá ${i+1}`,path(`M${x+65} ${y}l65-58v116Z`)),region(`Thân cá ${i+1}`,`<ellipse cx="${x}" cy="${y}" rx="90" ry="59"/>`),region(`Vây cá ${i+1}`,path(`M${x-5} ${y}l42-28v56Z`)),region(`Mắt cá ${i+1}`,circle(x-48,y-12,10))]),
      ...[[72,78],[325,115],[470,95],[505,435]].map(([x,y],i)=>region(`Bong bóng ${i+1}`,circle(x,y,18+i*4))),region('Sao biển',path('M350 490l17 33 36 2-28 25 10 35-35-18-31 18 5-36-27-24 37-3Z')),region('Rong biển',path('M40 555q-40-100 14-169-12 80 30 114 20-35 14-60 45 63-10 115Z'))]},
    {id:'home',title:'Nhà bên đồi',regions:[paper(),region('Đồi xa',path('M3 380Q155 190 300 380Q470 205 597 380V575Q597 597 575 597H25Q3 597 3 575Z')),region('Lối đi',path('M285 445h80l95 152H160Z')),
      region('Tường nhà',rect(145,260,300,230)),region('Mái nhà',path('M100 280 295 100 490 280Z')),region('Ống khói',path('M383 167V97h49v116Z')),region('Cửa chính',rect(260,350,74,140,30)),
      ...[176,356].flatMap((x,i)=>[region(`Khung cửa sổ ${i+1}`,rect(x,315,60,70,8)),...[[0,0],[1,0],[0,1],[1,1]].map(([a,b],j)=>region(`Kính cửa ${i+1}.${j+1}`,rect(x+7+a*26,322+b*30,20,24,2)))]),region('Nắm cửa',circle(318,420,6)),region('Mặt trời',circle(505,87,37)),region('Thân cây',rect(58,348,22,169)),region('Tán cây',path('M17 350 69 215 121 350Z')),region('Hàng rào',path('M450 458h26v-38l17-17 17 17v38h25v-38l17-17 17 17v38h28v30H450Z'))]},
    {id:'butterfly',title:'Cánh bướm mùa xuân',regions:[paper(),
      region('Cánh trên trái',path('M289 293Q60 15 40 181Q24 315 286 343Z')),region('Cánh trên phải',path('M311 293Q540 15 560 181Q576 315 314 343Z')),
      region('Cánh dưới trái',path('M285 331Q78 301 99 481Q159 570 290 375Z')),region('Cánh dưới phải',path('M315 331Q522 301 501 481Q441 570 310 375Z')),
      ...[[140,194,42],[210,267,27],[168,418,37],[460,194,42],[390,267,27],[432,418,37]].map(([x,y,r],i)=>region(`Đốm cánh ${i+1}`,circle(x,y,r))),
      ...[0,1,2,3,4].map((n)=>region(`Đốt thân ${n+1}`,`<ellipse cx="300" cy="${275+n*27}" rx="20" ry="22"/>`)),region('Đầu bướm',circle(300,235,27)),region('Mắt trái',circle(289,232,5)),region('Mắt phải',circle(311,232,5)),
      region('Râu trái',path('M287 213q-55-65-28-67 29 3 39 66Z')),region('Râu phải',path('M313 213q55-65 28-67-29 3-39 66Z'))]},
    {id:'mandala',title:'Hoa tròn bình yên',regions:[paper(),...Array.from({length:12},(_,i)=>region(`Cánh ngoài ${i+1}`,`<ellipse cx="300" cy="144" rx="42" ry="119" transform="rotate(${i*30} 300 300)"/>`)),...Array.from({length:8},(_,i)=>region(`Cánh trong ${i+1}`,`<ellipse cx="300" cy="222" rx="32" ry="74" transform="rotate(${i*45} 300 300)"/>`)),region('Tâm hoa',circle(300,300,52)),region('Nhụy',circle(300,300,23))]},
    {id:'space',title:'Chuyến bay tới sao',regions:[paper(),region('Mặt trăng',path('M490 54a65 65 0 1 0 54 107A65 65 0 0 1 490 54Z')),
      ...[[87,91],[152,202],[493,297],[81,389],[418,480]].map(([x,y],i)=>region(`Ngôi sao ${i+1}`,path(`M${x} ${y-26}l8 18 20 2-15 14 5 20-18-10-18 10 5-20-15-14 20-2Z`))),
      region('Lửa ngoài',path('M249 401q-5 90 51 150 56-60 51-150Z')),region('Lửa trong',path('M278 401q-8 70 22 102 30-32 22-102Z')),
      region('Cánh trái',path('M247 287q-72 39-68 151l73-34Z')),region('Cánh phải',path('M353 287q72 39 68 151l-73-34Z')),
      region('Thân tàu',path('M244 394V238q0-94 56-146 56 52 56 146v156Z')),region('Mũi tàu',path('M258 166q16-42 42-74 26 32 42 74Z')),region('Vòng cửa sổ',circle(300,256,42)),region('Kính cửa sổ',circle(300,256,29)),region('Đế tàu',rect(238,380,124,28,8)),region('Hành tinh',`<ellipse cx="130" cy="514" rx="65" ry="32" transform="rotate(-25 130 514)"/>`),region('Lõi hành tinh',circle(130,514,34))]},
  ];
  scenes.forEach(scene=>scene.regions.forEach((r,i)=>{r.id='r'+i;}));
  return {SCENES:scenes};
});
