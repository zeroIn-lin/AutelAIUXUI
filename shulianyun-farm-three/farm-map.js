(() => {
  'use strict';
  const view = document.getElementById('map-view');
  const terrain = document.getElementById('map-drawing');
  const overlay = document.getElementById('parcel-overlay');
  const tiles = document.getElementById('tile-layer');
  const markers = document.getElementById('device-layer');
  const inventory = document.getElementById('device-list');
  const sourceLabel = document.getElementById('base-label');
  const credit = document.getElementById('tdt-credit');
  const status = document.getElementById('map-status');
  const config = document.getElementById('config-dialog');
  const keyInput = document.getElementById('tdt-key');
  const storeKey = 'farm-map-browser-key';
  const R = 6378137;
  const circumference = 2 * Math.PI * R;
  const latitude = 44.50;
  const longitude = 85.58;
  const metreFactor = 1 / Math.cos(latitude * Math.PI / 180);
  const devices = [
    {type:'jiangrun',label:'疆润水肥机',name:'龙岗葡萄园测试水肥机',online:true,point:[-220,-62]},
    {type:'venturi',label:'文丘里施肥机',name:'河南xxx水肥机',online:true,point:[113,-109]},
    {type:'injection',label:'注入式施肥机',name:'新疆xxx水肥机',online:false,point:[-118,152]},
    {type:'valve',label:'阀控器',name:'5-2',online:true,point:[225,106]}
  ];
  const outline = [[-350,-105],[-305,-111],[205,-260],[259,-259],[365,-56],[367,-34],[225,254],[-380,240]];
  const rawArea = Math.abs(outline.reduce((sum, [x,y], i) => {
    const [nx,ny]=outline[(i+1)%outline.length];
    return sum+x*ny-nx*y;
  },0))/2;
  const scaleMetres = Math.sqrt(500.77 * (2000/3) / rawArea);
  function project(lon,lat) {
    return [R * lon * Math.PI / 180, -R * Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
  }
  const home = project(longitude, latitude);
  function localToWorld(x,y) {
    return [home[0]+x*scaleMetres*metreFactor,home[1]+y*scaleMetres*metreFactor];
  }
  let center=[...home],zoom=16,homeZoom=16,interactive=false;
  let key='', tileFailure=false;
  try { key=localStorage.getItem(storeKey)||''; } catch {}
  let preview=null;
  const previewSpec=window.farmMapPreview;
  if (previewSpec) {
    const image=new Image();
    image.onload=()=>{preview=image;render();};
    image.src=previewSpec.image;
  }
  function resolution(){return circumference/(256*2**zoom);}
  function screenPoint([x,y]) {
    return [(x-center[0])/resolution()+view.clientWidth/2,(y-center[1])/resolution()+view.clientHeight/2];
  }
  function screenLocal(point){return screenPoint(localToWorld(...point));}
  function zoomToFit(){
    const width=Math.max(200,view.clientWidth-76),height=Math.max(120,view.clientHeight-130);
    const res=Math.max(760*scaleMetres*metreFactor/width,540*scaleMetres*metreFactor/height);
    homeZoom=Math.max(11,Math.min(19,Math.log2(circumference/(256*res))));
    center=[...home]; zoom=homeZoom;
  }
  function canvasContext(canvas){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.round(view.clientWidth*dpr),h=Math.round(view.clientHeight*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,view.clientWidth,view.clientHeight);
    return ctx;
  }
  // Schematic land cover is explicitly labelled whenever service imagery is unavailable.
  function drawLand(ctx) {
    const w=view.clientWidth,h=view.clientHeight;
    ctx.fillStyle='#dfe3cb';ctx.fillRect(0,0,w,h);
    ctx.save();
    const origin=screenLocal([0,0]);
    const px=scaleMetres*metreFactor/resolution();
    ctx.translate(...origin);ctx.scale(px,px);ctx.rotate(-0.17);
    const radius=Math.min(12000,(Math.hypot(w,h)+Math.hypot(origin[0]-w/2,origin[1]-h/2))/px);
    const shades=['#cbd5b6','#d0d5b6','#c3cdac','#d6d8bc','#bdcbaa','#d8d6b6','#c1ceb2'];
    const xCount=Math.ceil(radius/215)+1,yCount=Math.ceil(radius/105)+1;
    for (let row=-yCount;row<=yCount;row++) {
      const offset=((row%3)+3)%3*51;
      for(let col=-xCount;col<=xCount;col++){
        const x=col*215+offset,y=row*105;
        const select=((row*5+col*3)%shades.length+shades.length)%shades.length;
        ctx.fillStyle=shades[select];ctx.fillRect(x+2,y+2,211,101);
        if(px>.16){
          ctx.fillStyle='#73895e17';
          for(let line=6;line<100;line+=5)ctx.fillRect(x+3,y+line,209,1.3);
        }
      }
    }
    ctx.strokeStyle='#c4bca0';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-radius,-185);ctx.lineTo(radius,-185);ctx.stroke();
    ctx.strokeStyle='#ede7ce';ctx.lineWidth=8;ctx.stroke();
    ctx.strokeStyle='#b1c5bd';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(420,-radius);ctx.lineTo(410,-210);ctx.lineTo(350,100);ctx.lineTo(370,radius);ctx.stroke();
    ctx.restore();
  }
  const landBands=['#668659','#adac50','#8e9876','#7fa24e','#a39452','#91a65b'];
  function drawParcel(ctx,imagery) {
    ctx.save();
    const origin=screenLocal([0,0]),px=scaleMetres*metreFactor/resolution();
    ctx.translate(...origin);ctx.scale(px,px);
    ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.save();ctx.clip();
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const x=-384+col*258,y=-269+row*139;
      ctx.fillStyle=landBands[(row*2+col)%landBands.length];
      ctx.globalAlpha=imagery?.23:.70;ctx.fillRect(x,y,260,140);
      ctx.globalAlpha=imagery?.38:.70;ctx.strokeStyle='#ebeed0';ctx.lineWidth=1/px;ctx.strokeRect(x,y,258,139);
      if(!imagery){ctx.globalAlpha=.12;ctx.strokeStyle='#49624c';for(let r=6;r<139;r+=5){ctx.beginPath();ctx.moveTo(x,y+r);ctx.lineTo(x+258,y+r);ctx.stroke();}}
    }
    ctx.restore();
    ctx.beginPath();outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.lineWidth=4/px;ctx.strokeStyle='#2748329c';ctx.stroke();ctx.lineWidth=2/px;ctx.strokeStyle='#e8f4b1';ctx.stroke();
    ctx.restore();
    const [cx,cy]=screenLocal([0,8]);
    ctx.font='600 13px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#fffff5';ctx.strokeText('144基地块',cx,cy);ctx.fillStyle='#2c4f39';ctx.fillText('144基地块',cx,cy);
  }
  const activeTiles=new Map();
  let drawQueued=false;
  function schedule(){if(!drawQueued){drawQueued=true;requestAnimationFrame(()=>{drawQueued=false;render();});}}
  function drawTiles(){
    const needed=new Set();
    if(key&&!tileFailure){
      const z=Math.max(1,Math.min(18,Math.round(zoom)));
      const tileSize=256*2**(zoom-z);
      const left=(center[0]+circumference/2)/resolution()-view.clientWidth/2;
      const top=(center[1]+circumference/2)/resolution()-view.clientHeight/2;
      const minX=Math.floor(left/tileSize),minY=Math.floor(top/tileSize);
      const maxX=Math.floor((left+view.clientWidth)/tileSize),maxY=Math.floor((top+view.clientHeight)/tileSize);
      for(const layer of ['img','cia'])for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
        const id=[layer,z,x,y].join('/');
        needed.add(id);
        let tile=activeTiles.get(id);
        if(!tile){
          tile=new Image();
          const tk=key;tile.alt='';tile.draggable=false;
          tile.style.zIndex=layer==='img'?0:1;
          if(layer==='img'){
            tile.onload=()=>{if(key===tk&&activeTiles.has(id))schedule();};
            tile.onerror=()=>{if(key!==tk||!activeTiles.has(id)||tileFailure)return;tileFailure=true;status.textContent='影像加载失败，请检查网络、Key 和域名授权。';status.hidden=false;schedule();};
          }
          activeTiles.set(id,tile);tiles.append(tile);
          const params=new URLSearchParams({SERVICE:'WMTS',REQUEST:'GetTile',VERSION:'1.0.0',LAYER:layer,STYLE:'default',TILEMATRIXSET:'w',FORMAT:'tiles',TILEMATRIX:z,TILEROW:y,TILECOL:x,tk});
          tile.src='https://t'+((x+y)%8)+'.tianditu.gov.cn/'+layer+'_w/wmts?'+params;
        }
        Object.assign(tile.style,{left:(x*tileSize-left)+'px',top:(y*tileSize-top)+'px',width:(tileSize+.3)+'px',height:(tileSize+.3)+'px'});
      }
    }
    for(const [id,tile] of activeTiles)if(!needed.has(id)){tile.onload=null;tile.onerror=null;tile.remove();activeTiles.delete(id);}
    return [...activeTiles.entries()].some(([id,t])=>id.startsWith('img/')&&t.complete&&t.naturalWidth>0);
  }
  function render(){
    if (!view.clientWidth||!view.clientHeight)return;
    const ctx=canvasContext(terrain);drawLand(ctx);
    if(preview){const [l,t]=screenPoint(project(previewSpec.west,previewSpec.north));const [r,b]=screenPoint(project(previewSpec.east,previewSpec.south));ctx.drawImage(preview,l,t,r-l,b-t);}
    const live=drawTiles();
    sourceLabel.textContent=live?'天地图影像':preview?'天地图影像快照':key&&!tileFailure?'影像加载中':'地块示意图';
    credit.hidden=!live&&!preview;
    if(preview&&!live)credit.textContent=previewSpec.credit||'天地图';
    if(live)credit.textContent='天地图 · 国家地理信息公共服务平台';
    drawParcel(canvasContext(overlay),live||!!preview);
    devices.forEach(d=>{const [x,y]=screenLocal(d.point);d.pin.style.left=x+'px';d.pin.style.top=y+'px';});
    const max=Math.max(1,90*resolution()/metreFactor);
    const power=10**Math.floor(Math.log10(max));
    const scale=[5,2,1].find(q=>q*power<=max)*power;
    const bar=document.getElementById('scale');bar.textContent=scale>=1000?scale/1000+' km':scale+' m';bar.style.width=scale*metreFactor/resolution()+'px';
  }
  function openDevice(d){window.openFarmDevice(d.type);}
  for(const d of devices){
    const pin=document.createElement('button');pin.className='device-pin';pin.type='button';
    pin.setAttribute('aria-label','查看'+d.name+'，'+d.label);
    const icon=new Image();icon.src='device-icons/'+d.type+'.png';icon.alt='';icon.draggable=false;
    const label=document.createElement('span');label.textContent=d.label;pin.append(icon,label);
    pin.addEventListener('click',()=>openDevice(d));markers.append(pin);d.pin=pin;
    const row=document.createElement('button');row.type='button';row.className='device-row';
    const info=document.createElement('span'),name=document.createElement('b'),state=document.createElement('small'),action=document.createElement('em');
    name.textContent=d.label;state.textContent=d.online?'在线':'离线';action.textContent='查看';
    info.append(name,state);row.append(icon.cloneNode(),info,action);row.setAttribute('aria-label','查看'+d.name);row.addEventListener('click',()=>openDevice(d));inventory.append(row);
  }
  function reset(){interactive=false;zoomToFit();render();}
  function changeZoom(delta,x=view.clientWidth/2,y=view.clientHeight/2){
    interactive=true;const old=resolution();zoom=Math.max(homeZoom-1.25,Math.min(homeZoom+2.5,zoom+delta));
    center[0]+=(old-resolution())*(x-view.clientWidth/2);center[1]+=(old-resolution())*(y-view.clientHeight/2);constrain();schedule();
  }
  function constrain(){const range=1500*metreFactor;center=center.map((c,i)=>Math.max(home[i]-range,Math.min(home[i]+range,c)));}
  view.addEventListener('wheel',e=>{e.preventDefault();const r=view.getBoundingClientRect();changeZoom(e.deltaY>0?-.25:.25,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  let drag;
  view.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;view.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,c:[...center]};});
  view.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;interactive=true;center=[drag.c[0]-(e.clientX-drag.x)*resolution(),drag.c[1]-(e.clientY-drag.y)*resolution()];constrain();schedule();});
  view.addEventListener('lostpointercapture',()=>{drag=null;});
  view.addEventListener('keydown',e=>{const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(steps[e.key]){e.preventDefault();interactive=true;center=center.map((v,i)=>v+steps[e.key][i]*60*resolution());constrain();schedule();}else if(e.key==='+'||e.key==='=')changeZoom(.5);else if(e.key==='-')changeZoom(-.5);});
  document.getElementById('zoom-in').onclick=()=>changeZoom(.5);
  document.getElementById('zoom-out').onclick=()=>changeZoom(-.5);
  document.getElementById('reset-view').onclick=reset;
  document.getElementById('fit-field').onclick=reset;
  const nav=document.querySelector('.app-sidebar');
  document.getElementById('toggle-nav').onclick=e=>e.currentTarget.setAttribute('aria-expanded',String(nav.classList.toggle('mobile-open')));
  document.getElementById('layer-settings').onclick=()=>{keyInput.value=key;keyInput.setCustomValidity('');config.showModal();};
  document.getElementById('close-config').onclick=()=>config.close();
  keyInput.addEventListener('input',()=>keyInput.setCustomValidity(''));
  function applyKey(next){
    key=next;tileFailure=false;status.hidden=true;
    for(const tile of activeTiles.values()){tile.onload=null;tile.onerror=null;tile.remove();}activeTiles.clear();
    try {if(key)localStorage.setItem(storeKey,key);else localStorage.removeItem(storeKey);} catch {}
    config.close();render();
  }
  document.getElementById('schematic').onclick=()=>applyKey('');
  document.getElementById('config-form').onsubmit=e=>{
    e.preventDefault();const next=keyInput.value.trim();
    if(!/^[a-z\d]{32}$/i.test(next)){keyInput.setCustomValidity('请输入 32 位天地图浏览器端 Key');keyInput.reportValidity();return;}applyKey(next);
  };
  new ResizeObserver(()=>{if(!interactive)zoomToFit();schedule();}).observe(view);
  reset();
})();
