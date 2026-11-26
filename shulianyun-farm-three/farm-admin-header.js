(() => {
  const header = document.querySelector('.farm-admin-header');
  const context = window.FarmSceneContext;
  if (!header || !context) return;

  header.innerHTML = `
    <div class="admin-identity">
      <button class="admin-nav-toggle" type="button" aria-label="系统导航" aria-controls="admin-sidebar" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
      <img src="farm-brand.png" alt=""><b>数联耘农场版</b>
    </div>
    <div class="admin-context">
      <label>农场<span class="admin-picker"><select id="admin-farm" aria-label="当前农场" data-themed-select="native"></select></span></label>
      <label>种植季<span class="admin-picker"><select id="admin-season" aria-label="当前种植季" data-themed-select="native"></select></span></label>
    </div>
    <div class="admin-user"><span class="admin-messages">我的消息!</span><span class="admin-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 23v-3a8 8 0 0 1 16 0v3"/></svg></span><span>农场管理员</span></div>`;

  const farms = context.listFarms();
  const farmSelect = header.querySelector('#admin-farm');
  const seasonSelect = header.querySelector('#admin-season');
  const option = item => new Option(item.name,item.id);
  farmSelect.replaceChildren(...farms.map(option));

  function sync() {
    const state = context.read();
    const farm = farms.find(item => item.id === state.farmId);
    farmSelect.value = farm.id;
    seasonSelect.replaceChildren(...farm.seasons.map(option));
    seasonSelect.value = state.seasonId;
  }
  sync();
  document.addEventListener('farm:shared-context-change', sync);
  farmSelect.addEventListener('change', () => context.select(farmSelect.value));
  seasonSelect.addEventListener('change', () => context.select(farmSelect.value,seasonSelect.value));

  const trigger = header.querySelector('.admin-nav-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const close = () => {
    sidebar.classList.remove('admin-nav-open');
    trigger.setAttribute('aria-expanded','false');
  };
  trigger.addEventListener('click', () => {
    trigger.setAttribute('aria-expanded',String(sidebar.classList.toggle('admin-nav-open')));
  });
  document.addEventListener('pointerdown', event => {
    if (!sidebar.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('admin-nav-open')) {
      close();
      trigger.focus();
    }
  });
  window.matchMedia('(max-width:760px)').addEventListener('change',close);
})();
