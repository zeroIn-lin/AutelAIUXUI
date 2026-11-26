const viewer = document.createElement('dialog');
viewer.className = 'machine-viewer';
viewer.setAttribute('aria-label','水肥机操控');
viewer.innerHTML = `<header><strong>水肥机操控</strong><button type="button">返回灌区</button></header>
<div class="machine-layout"><div class="machine-stage" aria-label="智慧水肥一体机三维模型" role="img">
<div class="cabinet"><div class="cabinet-side"></div><div class="cabinet-top"></div><div class="cabinet-face">
<div class="cabinet-window"><i></i></div><div class="cabinet-door"><b>智慧水肥一体机</b><strong>数联耘</strong></div></div></div></div>
<section class="machine-display"><iframe title="水肥机本地操控屏"></iframe></section></div>`;
document.body.append(viewer);
function enterMachine() {
  if (viewer.open) return;
  const panel = viewer.querySelector('iframe');
  if (!panel.hasAttribute('src')) panel.src = './machine-demo/index.html';
  viewer.showModal();
}

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
labelMarker();