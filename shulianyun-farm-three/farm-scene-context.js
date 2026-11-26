(() => {
  'use strict';

  // A copy of the scene's initial inventory lets the map open directly without loading Three.js.
  const farms = [
    {id:'jiyang', name:'山东济阳小番茄', seasons:{'2025-tomato':'2025番茄','2026-cotton':'2026新疆棉花'}},
    {id:'guangqian', name:'广前基地', seasons:{'2025-cotton':'2025年棉花'}}
  ];
  const devices = [
    {id:'weather-1',type:'sensor',name:'微型气象仪Pro2.0',model:'Pro2.0',number:'',placement:'田区中部'},
    {id:'station-1s-1',type:'weather-station',name:'多功能微型气象站1S（GPRS）',model:'1S（GPRS）',number:'01',placement:'田区对角点 A'},
    {id:'station-1s-2',type:'weather-station',name:'多功能微型气象站1S（GPRS）',model:'1S（GPRS）',number:'02',placement:'田区对角点 B'},
    {id:'fertigation-1',type:'fertigation',name:'水肥一体机',model:'示意模型',number:'',placement:'田区西侧 · 管路供液入口'}
  ];
  const statusColors = {suitable:'#f7f9f8',excess:'#ed9258',replenish:'#f3d553',missing:'#9caaa7'};
  const initialMoisture = ['suitable','excess','missing','suitable','suitable','suitable','suitable','suitable','excess','suitable','missing','suitable'];
  const storagePrefix = 'shulianyun-scene-context-v1';
  const param = 'farmState';
  const localPages = ['index.html','cost-analysis.html','farm-map.html'].map(name => new URL(name, location.href).pathname);
  function decode(data) {
    if (!data || data.v !== 1) return null;
    const farm = farms.find(item => item.id === data.f);
    if (!farm || !Object.hasOwn(farm.seasons, data.s)) return null;
    const plots = Array.from({length:24}, (_,i) => ({
      id:i+1,name:'地块'+String(i+1).padStart(2,'0'),state:i===18 || i===19?'unplanted':'planted',crop:''
    }));
    if (Array.isArray(data.p)) for (const change of data.p.slice(0,24)) {
      if (!Array.isArray(change)) continue;
      const [id, planted, crop] = change;
      if (!Number.isInteger(id) || !plots[id-1] || ![0,1].includes(planted)) continue;
      if (typeof crop !== 'string' || !/^[\p{L}\p{N} ·（）()_-]{0,80}$/u.test(crop)) continue;
      Object.assign(plots[id-1], {state:planted?'planted':'unplanted',crop});
    }
    const zones = initialMoisture.map((baseline,i) => {
      const id=String(i+1).padStart(2,'0'), plotIds=[i*2+1,i*2+2];
      let status = baseline;
      if (plotIds.some(plotId=>plots[plotId-1].state==='unplanted') || (data.f==='jiyang'&&data.s==='2025-tomato'&&i===2)) status='replenish';
      if (Array.isArray(data.z) && Object.hasOwn(statusColors,data.z[i])) status=data.z[i];
      return {id:'irrigation-'+id,name:'灌区 '+id,plotIds,status,color:statusColors[status]};
    });
    return {version:1,farmId:farm.id,seasonId:data.s,farmName:farm.name,seasonName:farm.seasons[data.s],plots,zones,devices:devices.map(d=>({...d}))};
  }
  function pack(current) {
    const initial = decode({v:1,f:current.farmId,s:current.seasonId});
    const compact = {v:1,f:current.farmId,s:current.seasonId};
    const changed = current.plots.filter((plot,i)=>plot.state!==initial.plots[i].state||plot.crop!==initial.plots[i].crop);
    if (changed.length) compact.p = changed.map(p=>[p.id,Number(p.state==='planted'),p.crop]);
    const predicted = decode(compact);
    if (current.zones.some((zone,i)=>zone.status!==predicted.zones[i].status)) compact.z=current.zones.map(z=>z.status);
    return compact;
  }
  function readStore(suffix) {
    try { return decode(JSON.parse(sessionStorage.getItem(storagePrefix+suffix))); } catch { return null; }
  }
  function readLink() {
    try {
      const raw = new URL(location.href).searchParams.get(param);
      return raw && raw.length < 10000 ? decode(JSON.parse(raw)) : null;
    } catch { return null; }
  }
  let state = readLink() || readStore('') || decode({v:1,f:'jiyang',s:'2025-tomato'});
  let packed = JSON.stringify(pack(state));
  function addStateTo(link) {
    if (!link || !link.hasAttribute('href')) return;
    const url = new URL(link.href,location.href);
    if (url.origin !== location.origin || !localPages.includes(url.pathname) || url.pathname===location.pathname) return;
    url.searchParams.set(param,packed);
    if (link.href !== url.href) link.href=url.href;
  }
  function remember(next) {
    state=next;
    packed=JSON.stringify(pack(next));
    try {
      sessionStorage.setItem(storagePrefix,packed);
      sessionStorage.setItem(storagePrefix+'/'+next.farmId+'/'+next.seasonId,packed);
    } catch {}
    document.querySelectorAll('a[href]').forEach(addStateTo);
  }
  window.FarmSceneContext = {read:()=>structuredClone(state)};
  function captureScene(){
    const scene=window.farmScene;
    if (!scene?.getPlots) return;
    remember({version:1,...scene.getContext(),plots:scene.getPlots(),zones:scene.getIrrigationZones(),devices:scene.getDevices()});
    const url = new URL(location.href);
    // Keep an incoming link current so reloading an edited scene restores the latest edits.
    if (url.searchParams.has(param) && url.searchParams.get(param)!==packed) {
      url.searchParams.set(param,packed);
      try {history.replaceState(history.state,'',url.href);} catch {}
    }
  }
  let restoring=false;
  function applyPlots(scene,saved){
    if (!saved) return;
    const current=scene.getPlots();
    for (const plot of saved.plots) {
      const previous=current.find(p=>p.id===plot.id);
      if (previous && (previous.state!==plot.state || previous.crop!==plot.crop)) scene.setPlotState(plot.id,plot.state,plot.crop);
    }
  }
  function setup(){
    const scene=window.farmScene;
    if (!scene) {remember(state);return;}
    const context=scene.getContext();
    if (context.farmId!==state.farmId || context.seasonId!==state.seasonId) scene.setContext(state.farmId,state.seasonId);
    applyPlots(scene,state);
    captureScene();
    document.addEventListener('farm:context-change',()=>{
      const context=scene.getContext();
      restoring=true;
      try {applyPlots(scene,readStore('/'+context.farmId+'/'+context.seasonId));} finally {restoring=false;}
      captureScene();
    });
    for (const eventName of ['farm:plant','farm:plot-state-change','farm:patrol-change']) {
      document.addEventListener(eventName,()=>{if (!restoring) captureScene();});
    }
  }
  // file:// pages need a portable same-project handoff: storage sharing there varies by browser.
  for(const eventName of ['click','auxclick','contextmenu']){
    document.addEventListener(eventName,event=>{
      const link=event.target.closest?.('a[href]');
      if (!link) return;
      const url=new URL(link.href);
      if (url.origin!==location.origin || !localPages.includes(url.pathname) || url.pathname===location.pathname) return;
      captureScene();
      addStateTo(link);
    },true);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
