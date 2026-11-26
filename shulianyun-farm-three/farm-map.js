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
  const latitude = 44.5023;
  const metreFactor = 1 / Math.cos(latitude * Math.PI / 180);
  function project(lon,lat) {
    return [R * lon * Math.PI / 180, -R * Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
  }
  // Demonstration footprint within the common imagery extent, bounded by two farm roads.
  const footprint = [[85.56334,44.50547],[85.57779,44.50420],
                     [85.57719,44.49797],[85.56291,44.49997]].map(pair => project(...pair));
  const layout = window.FarmMapPlots;
  const home = layout.project([0.5,0.5],footprint);
  const context = window.FarmSceneContext.read();
  const hasMapGeometry = context.hasScene !== false;
  const sourcePlots = new Map(context.plots.map(plot => [plot.id,plot]));
  const plots = hasMapGeometry ? layout.plots.map(shape => {
    const plot = {...shape,...sourcePlots.get(shape.id)};
    const zone = context.zones.find(zone => zone.plotIds.includes(plot.id));
    return {...plot,zoneName:zone?.name || shape.zoneName,
      boundary:shape.polygon.map(point => layout.project(point,footprint)),
      anchor:layout.project(shape.center,footprint)};
  }) : context.plots;
  const plotsById = new Map(plots.map(plot => [String(plot.id),plot]));
  const devices = hasMapGeometry ? [
    {type:'jiangrun',label:'疆润水肥机',name:'龙岗葡萄园测试水肥机',online:true},
    {type:'venturi',label:'文丘里施肥机',name:'河南xxx水肥机',online:true},
    {type:'injection',label:'注入式施肥机',name:'新疆xxx水肥机',online:false},
    {type:'valve',label:'阀控器',name:'5-2',online:true}
  ].map(device => {
    const {plotId,point} = layout.devices.find(item => item.type === device.type);
    return {...device,plot:plotsById.get(String(plotId)),anchor:layout.project(point,footprint)};
  }) : [];
  document.addEventListener('farm:shared-context-change', () => {
    const next = new URL(location.href);
    next.searchParams.delete('plot');
    location.replace(next.href);
  });
  const mapShell = view.closest('.map-shell');
  const labelLayer = document.getElementById('plot-label-layer');
  const plotFilter = document.getElementById('plot-filter');
  const inventoryToggle = document.getElementById('fm-inventory-toggle');
  function setInventoryOpen(open) {
    inventoryToggle.setAttribute('aria-expanded',String(open));
    mapShell.closest('.map-layout').classList.toggle('inventory-open',open);
  }
  inventoryToggle.addEventListener('click',()=>{
    const open = inventoryToggle.getAttribute('aria-expanded') !== 'true';
    setInventoryOpen(open);
    if (open) plotFilter.focus({preventScroll:true});
  });
  document.getElementById('fm-inventory').addEventListener('keydown', event=>{
    if (event.key === 'Escape' && inventoryToggle.getAttribute('aria-expanded') === 'true') {
      setInventoryOpen(false);
      inventoryToggle.focus();
    }
  });
  mapShell.addEventListener('pointerdown',()=>setInventoryOpen(false));
  const locationStatus = document.getElementById('fm-location-empty');
  mapShell.classList.toggle('no-located-plots',!hasMapGeometry);
  locationStatus.hidden = hasMapGeometry;
  document.querySelector('.map-layer-controls').hidden = !hasMapGeometry;
  let selectedPlot = null;
  let center=[...home],zoom=16,homeZoom=16,interactive=false;
  let key='', tileFailure=false;
  try { key=localStorage.getItem(storeKey)||''; } catch {}
  const sourceSelect = document.getElementById('map-source-select');
  const googleFrame = document.getElementById('google-viewport');
  const settingsButton = document.getElementById('layer-settings');
  let source = key ? 'tianditu' : 'google';
  try {
    const saved = localStorage.getItem('farm-map-layer');
    if (saved === 'snapshot' || saved === 'google') source = saved;
  } catch {}
  sourceSelect.value = source;

  const googleEmbed = 'https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d6669.43933126326!2d85.569!3d44.5023!3m2!1i1024!2i768!4f13.1!5e1!3m2!1szh-CN!2sus!4v1795680039685!5m2!1szh-CN!2sus';
  const googleSize = [1440,900];
  function loadGoogleView() {
    if (googleFrame.childElementCount) return;
    function embed() {
      const frame = document.createElement('iframe');
      frame.src = googleEmbed; frame.title = 'Google 连片农田卫星图';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      // This fixed camera keeps the farm annotations registered. The original link opens an interactive map.
      frame.inert = true;
      mountMedia(frame);
      schedule();
    }
    function mountMedia(media) {
      const link = document.createElement('a');
      link.className = 'google-source-hotspot';
      link.href = document.getElementById('google-original').href;
      link.target = '_blank'; link.rel = 'noopener';
      link.setAttribute('aria-label','在 Google 地图中打开卫星原图');
      googleFrame.replaceChildren(media,link);
    }
    if (location.protocol !== 'file:') { embed(); return; }
    const capture = new Image();
    capture.alt = 'Google Maps 连片农田卫星截图';
    capture.onerror = embed;
    capture.src = '../Google地图-连片农田-嵌入参考.png';
    mountMedia(capture);
  }

  function renderGoogle() {
    loadGoogleView();
    const scale = googleResolution / resolution();
    const [left,top] = screenPoint(googleBounds.nw);
    googleFrame.style.transform = 'translate('+left+'px,'+top+'px) scale('+scale+')';
    sourceLabel.textContent=googleFrame.firstElementChild?.tagName === 'IMG' ? 'Google 卫星快照' : 'Google 卫星图';
    const copyright='Google Maps · 图像 © 2026 Airbus、CNES / Airbus、Maxar Technologies';
    credit.textContent=copyright;
    credit.href=document.getElementById('google-original').href;
    credit.hidden=false;
  }
  let preview=null;
  const googleResolution = circumference/(256*2**16);
  const googleMiddle = project(85.569,latitude);
  const googleBounds = {
    nw:googleMiddle.map((v,i)=>v-googleSize[i]*googleResolution/2),
    se:googleMiddle.map((v,i)=>v+googleSize[i]*googleResolution/2)
  };
  const previewSpec=window.farmMapPreview;
  // The bounds correspond to the complete north-up Web Mercator export.
  const previewBounds = previewSpec && {
    nw: project(previewSpec.west, previewSpec.north),
    se: project(previewSpec.east, previewSpec.south)
  };
  if (hasMapGeometry && previewBounds) {
    const image = new Image();
    image.onload = () => {
      preview = image;
      document.getElementById('schematic').textContent = '使用影像快照';
      schedule();
    };
    image.src = previewSpec.image;
  }
  function resolution(){return circumference/(256*2**zoom);}
  function screenPoint([x,y]) {
    return [(x-center[0])/resolution()+view.clientWidth/2,(y-center[1])/resolution()+view.clientHeight/2];
  }
  function zoomToFit(){
    const width=Math.max(160,view.clientWidth - Math.min(120,view.clientWidth*.12));
    const height=Math.max(120,view.clientHeight-150);
    const span = [0,1].map(axis => {
      const values = footprint.map(point=>point[axis]);
      return Math.max(...values)-Math.min(...values);
    });
    const res=Math.max(span[0]/width,span[1]/height);
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
  function drawPreview(ctx) {
    // Outside the imagery footprint, keep an untextured no-data background.
    ctx.fillStyle = '#dde3df';
    ctx.fillRect(0, 0, view.clientWidth, view.clientHeight);
    if (!preview) return;
    const [left, top] = screenPoint(previewBounds.nw);
    const [right, bottom] = screenPoint(previewBounds.se);
    ctx.drawImage(preview, left, top, right-left, bottom-top);
  }
  function drawPlots() {
    const ctx = canvasContext(overlay);
    const rowHeight = Math.abs(plots[1].anchor[1]-plots[0].anchor[1]) / resolution();
    const compact = rowHeight < 29 || view.clientWidth < 570;
    const labelStep = Math.max(1,Math.ceil((compact ? 16 : 25)/rowHeight));
    mapShell.classList.toggle('compact-plots',compact);
    mapShell.classList.toggle('sparse-plots',labelStep > 1);
    for (const plot of plots) {
      const points = plot.boundary.map(screenPoint);
      const path = new Path2D();
      path.moveTo(...points[0]);
      for (const point of points.slice(1)) path.lineTo(...point);
      path.closePath();
      plot.hitArea = path;
      const active = selectedPlot === plot;
      const fallow = plot.state === 'unplanted';
      ctx.fillStyle = fallow ? 'rgba(230,174,91,.52)' : active ? 'rgba(135,229,131,.53)' : 'rgba(123,192,124,.24)';
      ctx.strokeStyle = active ? '#fffbc4' : fallow ? '#f0c680' : '#badcaa';
      ctx.lineWidth = active ? 2.8 : 1;
      ctx.fill(path);
      ctx.stroke(path);
      const [x,y] = screenPoint(plot.anchor);
      plot.label.style.left = x+'px';
      plot.label.style.top = y+'px';
      plot.label.hidden = (!active && (plot.id-1)%12%labelStep !== 0) ||
        x<0 || x>view.clientWidth || y<0 || y>view.clientHeight;
      const text = compact && !active ? String(plot.id).padStart(2,'0') : plot.name;
      if (plot.label.textContent !== text) plot.label.textContent = text;
    }
    for (const device of devices) {
      const [x,y] = screenPoint(device.anchor);
      device.pin.style.left = x+'px';
      device.pin.style.top = y+'px';
      device.pin.hidden = !!selectedPlot && selectedPlot !== device.plot;
    }
  }
  const activeTiles=new Map();
  let drawQueued=false;
  function schedule(){if(!drawQueued){drawQueued=true;requestAnimationFrame(()=>{drawQueued=false;render();});}}
  function drawTiles(){
    const needed=new Set();
    if(source==='tianditu'&&key&&!tileFailure){
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
    // Show a single attributed source during loading and panning.
    const imagery = [...activeTiles.entries()].filter(([id]) => id.startsWith('img/'));
    const ready = imagery.length > 0 && imagery.every(([,img]) => img.complete && img.naturalWidth > 0);
    tiles.style.visibility = ready ? 'visible' : 'hidden';
    return ready;
  }
  function render(){
    if (!hasMapGeometry || !view.clientWidth || !view.clientHeight) return;
    const google = source === 'google';
    view.closest('.map-shell').classList.toggle('google-view',google);
    googleFrame.hidden = !google;
    document.getElementById('google-original').hidden = !google;
    settingsButton.hidden = source !== 'tianditu';
    constrain();
    if (google) {
      drawTiles();
      renderGoogle();
    } else {
      drawPreview(canvasContext(terrain));
      const live = drawTiles();
      sourceLabel.textContent = live ? '天地图影像' : preview ? previewSpec.label || '卫星影像快照' : '地块示意图';
      credit.hidden = !live && !(preview && previewSpec.credit);
      if (!credit.hidden) {
        credit.textContent = live ? '天地图 · 国家地理信息公共服务平台' : previewSpec.credit;
        const url = live ? 'https://www.tianditu.gov.cn/' : previewSpec.creditUrl;
        if (url) credit.href = url;
        else credit.removeAttribute('href');
      }
    }
    drawPlots();
    const max=Math.max(1,90*resolution()/metreFactor);
    const power=10**Math.floor(Math.log10(max));
    const scale=[5,2,1].find(q=>q*power<=max)*power;
    const bar=document.getElementById('scale');bar.textContent=scale>=1000?scale/1000+' km':scale+' m';bar.style.width=scale*metreFactor/resolution()+'px';
  }
  function selectPlot(plot,{reveal=false,save=true}={}) {
    selectedPlot = plot;
    plotFilter.value = plot ? String(plot.id) : '';
    for (const entry of plots) {
      entry.label?.setAttribute('aria-pressed',String(entry === plot));
    }
    const visible = devices.filter(d => !plot || d.plot === plot);
    document.getElementById('device-heading').textContent = plot ? plot.name+' · 设备' : '地块设备';
    document.getElementById('device-count').textContent = visible.length+' 台';
    for (const device of devices) device.row.style.display = visible.includes(device) ? '' : 'none';
    emptyState.hidden = visible.length > 0;
    emptyState.textContent = plot ? '该地块暂无设备' : '该农场暂无设备';
    if (!hasMapGeometry) {
      locationStatus.textContent = plot ? plot.name+'尚未录入位置' : '当前农场尚未录入地块位置';
    }
    if (plot?.anchor && reveal) {
      const [x,y] = screenPoint(plot.anchor);
      if (x < 60 || x > view.clientWidth-60 || y < 65 || y > view.clientHeight-65) {
        center = [...plot.anchor];
        interactive = true;
      }
    }
    if (save) {
      const url = new URL(location.href);
      if (plot) url.searchParams.set('plot',plot.id);
      else url.searchParams.delete('plot');
      try {history.replaceState(history.state,'',url.href);} catch {}
    }
    schedule();
  }
  function openDevice(d) {
    selectPlot(d.plot,{reveal:true});
    window.openFarmDevice(d.type,d.plot.name);
  }
  for (const plot of plots) {
    const state = plot.state === 'unplanted' ? '未耕种' : '已耕种';
    plotFilter.add(new Option(plot.name,String(plot.id)));
    if (!hasMapGeometry) continue;
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'fm-plot-label';
    label.classList.toggle('is-fallow',plot.state === 'unplanted');
    label.dataset.plotId = plot.id;
    label.title = [plot.name,plot.zoneName,state,plot.crop].filter(Boolean).join('，');
    label.setAttribute('aria-label',label.title);
    label.addEventListener('click',()=>selectPlot(plot));
    labelLayer.append(label);
    plot.label = label;
  }
  for(const d of devices){
    const pin=document.createElement('button');pin.className='device-pin';pin.type='button';
    pin.setAttribute('aria-label','查看'+d.name+'，'+d.label+'，'+d.plot.name);
    pin.dataset.plotId=d.plot.id;
    const icon=new Image();icon.src='device-icons/'+d.type+'-map.webp';icon.alt='';icon.draggable=false;
    const label=document.createElement('span');label.textContent=d.label;pin.append(icon,label);
    pin.addEventListener('click',()=>openDevice(d));markers.append(pin);d.pin=pin;
    const row=document.createElement('button');row.type='button';row.className='device-row';
    const info=document.createElement('span'),name=document.createElement('b'),state=document.createElement('small'),action=document.createElement('em');
    name.textContent=d.label;state.textContent=d.plot.name+' · '+(d.online?'在线':'离线');action.textContent='查看';
    info.append(name,state);row.append(icon.cloneNode(),info,action);row.setAttribute('aria-label','查看'+d.name+'，'+d.plot.name);row.addEventListener('click',()=>openDevice(d));inventory.append(row);
    d.row=row;
  }
  const emptyState = document.createElement('p');
  emptyState.className = 'fm-device-empty';
  emptyState.textContent = '该地块暂无设备';
  inventory.append(emptyState);
  function reset(){interactive=false;zoomToFit();render();}
  function changeZoom(delta,x=view.clientWidth/2,y=view.clientHeight/2){
    interactive=true;const old=resolution();zoom=Math.max(homeZoom-1.25,Math.min(homeZoom+2.5,zoom+delta));
    center[0]+=(old-resolution())*(x-view.clientWidth/2);center[1]+=(old-resolution())*(y-view.clientHeight/2);constrain();schedule();
  }
  function constrain() {
    const range = 1500 * metreFactor;
    const bounds = source === 'google' ? googleBounds : previewBounds;
    if (!bounds || (source === 'tianditu' && key && !tileFailure)) {
      center = center.map((value,i) => Math.max(home[i]-range, Math.min(home[i]+range, value)));
      return;
    }
    // Never pan past the snapshot. If the viewport is larger, center the image
    // on that axis and leave the uncovered edges visibly outside the map.
    const size = [view.clientWidth, view.clientHeight];
    center = center.map((value, i) => {
      const halfViewport = size[i] * resolution() / 2;
      const min = bounds.nw[i] + halfViewport;
      const max = bounds.se[i] - halfViewport;
      return min <= max ? Math.max(min, Math.min(max, value)) : (min + max) / 2;
    });
  }
  view.addEventListener('wheel',e=>{e.preventDefault();const r=view.getBoundingClientRect();changeZoom(e.deltaY>0?-.25:.25,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  let drag;
  view.addEventListener('pointerdown',e=>{
    if (!e.isPrimary || e.button!==0 || e.target.closest('button,a')) return;
    view.setPointerCapture(e.pointerId);
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,c:[...center],moved:false};
  });
  view.addEventListener('pointermove',e=>{
    if (!drag || drag.id!==e.pointerId) return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if (!drag.moved && Math.hypot(dx,dy)<5) return;
    drag.moved=true;interactive=true;
    center=[drag.c[0]-dx*resolution(),drag.c[1]-dy*resolution()];
    constrain();schedule();
  });
  view.addEventListener('pointerup',e=>{
    if (!drag || drag.id !== e.pointerId || drag.moved) return;
    const rect = view.getBoundingClientRect();
    const ctx = overlay.getContext('2d');
    ctx.save();
    ctx.resetTransform();
    const hit = plots.find(p=>p.hitArea && ctx.isPointInPath(p.hitArea,e.clientX-rect.left,e.clientY-rect.top));
    ctx.restore();
    if (hit) selectPlot(hit);
  });
  view.addEventListener('lostpointercapture',()=>{drag=null;});
  view.addEventListener('keydown',e=>{const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(steps[e.key]){e.preventDefault();interactive=true;center=center.map((v,i)=>v+steps[e.key][i]*60*resolution());constrain();schedule();}else if(e.key==='+'||e.key==='=')changeZoom(.5);else if(e.key==='-')changeZoom(-.5);});
  document.getElementById('zoom-in').onclick=()=>changeZoom(.5);
  document.getElementById('zoom-out').onclick=()=>changeZoom(-.5);
  document.getElementById('reset-view').onclick=reset;
  plotFilter.addEventListener('change',()=>{
    const plot = plotsById.get(plotFilter.value) || null;
    selectPlot(plot,{reveal:true});
    if (!plot && hasMapGeometry) reset();
  });
  document.getElementById('layer-settings').onclick=()=>{keyInput.value=key;keyInput.setCustomValidity('');config.showModal();};
  document.getElementById('close-config').onclick=()=>config.close();
  keyInput.addEventListener('input',()=>keyInput.setCustomValidity(''));
  function selectSource(next) {
    source = next; sourceSelect.value = next;
    try { localStorage.setItem('farm-map-layer',next); } catch {}
    status.hidden=true; reset();
  }
  sourceSelect.addEventListener('change',()=>{
    const next=sourceSelect.value;
    if(next==='tianditu' && !key){sourceSelect.value=source;settingsButton.click();return;}
    tileFailure=false;selectSource(next);
  });
  function applyKey(next){
    key=next;tileFailure=false;status.hidden=true;
    for(const tile of activeTiles.values()){tile.onload=null;tile.onerror=null;tile.remove();}activeTiles.clear();
    try {if(key)localStorage.setItem(storeKey,key);else localStorage.removeItem(storeKey);} catch {}
    config.close();selectSource(next?'tianditu':'snapshot');
  }
  document.getElementById('schematic').onclick=()=>applyKey('');
  document.getElementById('config-form').onsubmit=e=>{
    e.preventDefault();const next=keyInput.value.trim();
    if(!/^[a-z\d]{32}$/i.test(next)){keyInput.setCustomValidity('请输入 32 位天地图浏览器端 Key');keyInput.reportValidity();return;}applyKey(next);
  };
  if (hasMapGeometry) {
    new ResizeObserver(()=>{if(!interactive)zoomToFit();schedule();}).observe(view);
    reset();
  }
  const linkedPlotId = new URL(location.href).searchParams.get('plot');
  const linkedPlot = plotsById.get(linkedPlotId) || null;
  selectPlot(linkedPlot,{reveal:true,save:Boolean(linkedPlotId && !linkedPlot)});
})();
