const sceneHost = document.querySelector('#scene');
const card = document.createElement('details');
card.className = 'machine-entry';
card.innerHTML = '<summary>水肥机</summary><button type="button">进入水肥机</button>';
sceneHost.append(card);
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
card.querySelector('button').addEventListener('click', enterMachine);
viewer.querySelector('button').addEventListener('click', () => viewer.close());
document.addEventListener('click', event => {
  if (event.target.closest('[data-action="enter-machine"]')) enterMachine();
});
