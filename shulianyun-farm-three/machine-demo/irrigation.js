const irrigationKey = 'farm-irrigation-summary-v1';
let irrigationTotals = {litres:0,tasks:0,lastTask:null};
try { Object.assign(irrigationTotals, JSON.parse(localStorage.getItem(irrigationKey))); } catch {}
function recordInjection(task, litres) {
  if (!(litres > 0)) return;
  if (irrigationTotals.lastTask !== task) {
    irrigationTotals.lastTask = task;
    irrigationTotals.tasks++;
  }
  irrigationTotals.litres += litres;
  try { localStorage.setItem(irrigationKey, JSON.stringify(irrigationTotals)); } catch {}
}
function publishIrrigation() {
  const job = activeJob() ? state.job : null;
  const valves = state.barrels.filter(b => b.fert);
  const running = !state.locked && (job ? job.stage === 'fert' : valves.length > 0);
  const phase = {fill:'注水中',mix:'搅拌中',fert:'施肥中',wash:'清洗中'};
  parent.postMessage({type:'machine-irrigation',running,
    status:state.locked?'急停':job?phase[job.stage]:running?'施肥中':state.barrels.some(b=>b.prePurge)?'施肥前排气':'待机',
    mode:job?'一键水肥':running?'手动水肥':'—',
    barrels:(job?job.items:valves).map(b=>b.id).join('、') || '—',
    actual:job?job.items.reduce((sum,i)=>sum+i.actual,0):state.manualSession?.actual||0,
    ...irrigationTotals},'*');
}
