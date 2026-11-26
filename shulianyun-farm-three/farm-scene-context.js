(() => {
  'use strict';

  // A copy of the scene's initial inventory lets the map open directly without loading Three.js.
  const farms = [
    {id:'jiyang', name:'山东济阳小番茄', seasons:{'2025-tomato':'2025番茄','2026-cotton':'2026新疆棉花'}},
    {id:'guangqian', name:'广前基地', seasons:{'2025-cotton':'2025年棉花'}},
    {id:'yunling', name:'云岭金桔农场', seasons:{'2026':'2026金桔种植季','2025':'2025金桔种植季'}, defaultSeason:'2026'}
  ];
  const yunlingPlots = [
    {id:'p1',name:'地块1',crop:'金桔',variety:'脆蜜',age:4,mode:'露地',area100:6000,scheme:'脆蜜露地·4年'},
    {id:'p2',name:'地块2',crop:'金桔',variety:'脆蜜',age:4,mode:'避雨棚',area100:9000,scheme:'脆蜜避雨棚·4年'},
    {id:'p3',name:'地块3',crop:'金桔',variety:'脆蜜',age:3,mode:'露地',area100:9000,scheme:'脆蜜露地·3年'},
    {id:'p4',name:'地块4',crop:'金桔',variety:'油皮',age:3,mode:'露地',area100:6000,scheme:'油皮露地·3年'}
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
  const sceneHome = localPages[0];
  const sceneDefault = {v:1,f:'jiyang',s:'2025-tomato'};
  const pageDefault = location.pathname===localPages[1] ? {v:1,f:'yunling',s:'2026'} : sceneDefault;
  function decode(data) {
    if (!data || data.v !== 1) return null;
    const farm = farms.find(item => item.id === data.f);
    if (!farm || !Object.hasOwn(farm.seasons, data.s)) return null;
    const context = {version:1,farmId:farm.id,seasonId:data.s,farmName:farm.name,seasonName:farm.seasons[data.s],hasScene:farm.id!=='yunling'};
    if (!context.hasScene) return {...context,plots:yunlingPlots.map(p=>({...p,state:'planted'})),zones:[],devices:[]};
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
    return {...context,plots,zones,devices:devices.map(d=>({...d}))};
  }
  function pack(current) {
    const compact = {v:1,f:current.farmId,s:current.seasonId};
    if (!current.hasScene) return compact;
    const initial = decode(compact);
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
      if (!raw || raw.length>20000) return null;
      const incoming=JSON.parse(raw);
      return decode(incoming) ? incoming : null;
    } catch { return null; }
  }
  const isHistoryReturn = performance.getEntriesByType('navigation')[0]?.type==='back_forward';
  const incoming = readLink();
  const previousScene = readStore('/last-scene');
  let lastScene = decode(incoming?.r);
  if (!lastScene?.hasScene) lastScene = previousScene?.hasScene ? previousScene : decode(sceneDefault);
  let state = (isHistoryReturn && readStore('')) || decode(incoming) || decode(pageDefault);
  if (location.pathname===sceneHome && !state.hasScene) state=lastScene;
  if (state.hasScene) lastScene=state;
  let packed;
  const edited = new Map();
  for (const item of (Array.isArray(incoming?.m) ? incoming.m.slice(0,3) : [])) {
    const entry=decode(item);
    if (entry?.hasScene) edited.set(entry.farmId+'/'+entry.seasonId,pack(entry));
  }
  // Preserve edits in other seasons when opening sibling file:// documents with isolated storage.
  function serialize(current) {
    const portable = pack(current);
    if (!current.hasScene) portable.r=pack(lastScene);
    const others=Array.from(edited.values()).filter(item=>item.f!==current.farmId || item.s!==current.seasonId);
    if (others.length) portable.m=others;
    return JSON.stringify(portable);
  }
  packed=serialize(state);
  function addStateTo(link) {
    if (!link || !link.hasAttribute('href')) return;
    const url = new URL(link.href,location.href);
    if (url.origin !== location.origin || !localPages.includes(url.pathname) || url.pathname===location.pathname) return;
    url.searchParams.set(param,url.pathname===sceneHome && !state.hasScene ? serialize(lastScene) : packed);
    if (link.href !== url.href) link.href=url.href;
  }
  function remember(next) {
    const changed = state.farmId!==next.farmId || state.seasonId!==next.seasonId;
    state=next;
    const raw=pack(next), contextKey=next.farmId+'/'+next.seasonId;
    if (next.hasScene) {
      lastScene=next;
      if (raw.p || raw.z) edited.set(contextKey,raw);
      else edited.delete(contextKey);
    }
    packed=serialize(next);
    try {
      sessionStorage.setItem(storagePrefix,packed);
      sessionStorage.setItem(storagePrefix+'/'+contextKey,JSON.stringify(raw));
      sessionStorage.setItem(storagePrefix+'/last-scene',JSON.stringify(pack(lastScene)));
    } catch {}
    document.querySelectorAll('a[href]').forEach(addStateTo);
    // Replace rather than push, keeping normal page history intact when a filter changes.
    const url=new URL(location.href);
    if ((changed || raw.p || raw.z || url.searchParams.has(param)) && url.searchParams.get(param)!==packed) {
      url.searchParams.set(param,packed);
      try {history.replaceState(history.state,'',url.href);} catch {}
    }
    if (changed) document.dispatchEvent(new CustomEvent('farm:shared-context-change',{detail:structuredClone(state)}));
  }
  function savedContext(farmId,seasonId){
    const key=farmId+'/'+seasonId;
    return decode(edited.get(key)) || readStore('/'+key) || decode({v:1,f:farmId,s:seasonId});
  }
  window.FarmSceneContext = {
    read: (farmId,seasonId)=>structuredClone(farmId ? savedContext(farmId,seasonId) : state),
    listFarms: ()=>farms.map(farm => ({
      id:farm.id,name:farm.name,
      seasons:Object.entries(farm.seasons).map(([id,name])=>({id,name})).sort((a,b)=>Number(b.id===farm.defaultSeason)-Number(a.id===farm.defaultSeason))
    })),
    select(farmId,seasonId) {
      const farm=farms.find(item=>item.id===farmId);
      if (!farm) return false;
      const nextSeason=seasonId ?? (state.farmId===farmId ? state.seasonId : farm.defaultSeason || Object.keys(farm.seasons)[0]);
      if (!Object.hasOwn(farm.seasons,nextSeason)) return false;
      if (state.farmId===farmId && state.seasonId===nextSeason) return true;
      if (window.farmScene) {
        if (farmId==='yunling') return false;
        window.farmScene.setContext(farmId,nextSeason);
      } else remember(savedContext(farmId,nextSeason));
      return true;
    }
  };
  function captureScene(){
    const scene=window.farmScene;
    if (!scene?.getPlots) return;
    remember({version:1,hasScene:true,...scene.getContext(),plots:scene.getPlots(),zones:scene.getIrrigationZones(),devices:scene.getDevices()});
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
      try {applyPlots(scene,savedContext(context.farmId,context.seasonId));} finally {restoring=false;}
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
  window.addEventListener('pageshow',event=>{
    if (!event.persisted) return;
    let latest=readStore('');
    if (!latest) return;
    if (location.pathname===sceneHome && !latest.hasScene) latest=readStore('/last-scene') || decode(sceneDefault);
    const scene=window.farmScene;
    if (scene) {
      scene.setContext(latest.farmId,latest.seasonId);
      applyPlots(scene,latest);
      captureScene();
    } else remember(latest);
  });
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
