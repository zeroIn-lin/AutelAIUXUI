const viewer = document.createElement('dialog');
viewer.className = 'machine-viewer';
viewer.setAttribute('aria-label','水肥机操控');
viewer.innerHTML = `<header><strong>水肥机操控</strong><button type="button">返回灌区</button></header>
<div class="machine-layout"><div class="machine-stage" aria-label="疆润智慧水肥一体机，右前方半侧视图" role="img">
<div class="machine-product"><canvas class="machine-canvas" aria-hidden="true"></canvas>
<img class="machine-preview" src="./device-icons/jiangrun.png" loading="lazy" alt="">
<div class="machine-glass" inert aria-hidden="true" hidden><iframe title="机身屏幕显示" tabindex="-1" sandbox="allow-same-origin"></iframe></div></div></div>
<section class="machine-display"><iframe title="水肥机本地操控屏"></iframe></section></div>`;
document.body.append(viewer);
const cabinetCanvas = viewer.querySelector('.machine-canvas');
const machineScreen = viewer.querySelector('.machine-display iframe');
const cabinetScreen = window.FarmCabinetScreen.attach(viewer, machineScreen, cabinetCanvas);
let cabinetModel;
function enterMachine() {
  if (viewer.open) return;
  if (!machineScreen.hasAttribute('src')) machineScreen.src = './machine-demo/index.html';
  viewer.showModal();
  if (cabinetModel) cabinetModel.resize();
  else cabinetModel = window.farmScene?.mountMachineModel?.(cabinetCanvas);
  cabinetScreen.update();
}

viewer.addEventListener('close',cabinetScreen.update);
viewer.querySelector('button').addEventListener('click', () => viewer.close());
document.addEventListener('click', event => {
  if (event.target.closest('[data-action="enter-machine"]')) enterMachine();
});
const markerSelector = '#scene[data-pipe-view="true"] button.device-name-label[data-id="fertigation-1"]';
document.addEventListener('click', event => {
  if (!event.target.closest(markerSelector)) return;
  event.stopPropagation();
  enterMachine();
}, true);

function labelMarker() {
  const button = document.querySelector('.device-name-label[data-id="fertigation-1"]');
  if (!button) return;
  const active = document.querySelector('#scene').dataset.pipeView === 'true';
  button.setAttribute('aria-label', active ? '进入水肥机' : '查看水肥一体机');
  button.title = active ? '' : '查看水肥一体机';
}
new MutationObserver(labelMarker).observe(document.querySelector('#scene'), {attributes:true,attributeFilter:['data-pipe-view']});
labelMarker();const irrigationRail = document.createElement('section');
irrigationRail.className = 'irrigation-report';
irrigationRail.innerHTML = '<h2>水肥机灌溉数据</h2>';
const irrigationFields = {};
for (const [title, fields] of [
  ['当前任务', [['status','运行状态'],['mode','任务模式'],['barrels','肥料桶'],['actual','本次注肥量']]],
  ['累计灌溉数据', [['tasks','施肥任务'],['litres','累计注肥量'],['water','累计灌水量']]]
]) {
  const card = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = title;
  card.append(heading);
  for (const [key, label] of fields) {
    const row = document.createElement('div');
    const value = document.createElement('strong');
    row.append(label, value);
    card.append(row);
    irrigationFields[key] = value;
  }
  irrigationRail.append(card);
}
document.querySelector('.insight-rail').append(irrigationRail);
function showIrrigation(data) {
  for (const key of ['status','mode','barrels']) irrigationFields[key].textContent = data[key];
  for (const key of ['litres','actual']) irrigationFields[key].textContent = Number(data[key]).toLocaleString('zh-CN',{maximumFractionDigits:2})+' L';
  irrigationFields.tasks.textContent = data.tasks+' 次';
  irrigationFields.water.textContent = '暂无计量';
  document.documentElement.dataset.fertilizing = String(data.running);
}
let savedTotals = {};
try { savedTotals = JSON.parse(localStorage.getItem('farm-irrigation-summary-v1')) || {}; } catch {}
showIrrigation({status:'待机',mode:'—',barrels:'—',actual:0,litres:0,tasks:0,running:false,...savedTotals});
window.addEventListener('message', event => {
  if (event.source === machineScreen.contentWindow && event.data?.type === 'machine-irrigation') showIrrigation(event.data);
});
function activateMonitor() {
  if (document.querySelector('#scene').dataset.pipeView === 'true' && !machineScreen.hasAttribute('src')) machineScreen.src='./machine-demo/index.html';
}
new MutationObserver(activateMonitor).observe(document.querySelector('#scene'),{attributes:true,attributeFilter:['data-pipe-view']});
