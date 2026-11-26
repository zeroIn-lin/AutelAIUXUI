(() => {
  const screen = document.querySelector('#screen');
  const names = ['注水阀', '搅拌机', '施肥阀'];
  const switches = new Set();
  let layer, panel, timer, ticker, total = 0, stopped = false;

  function close() {
    clearInterval(ticker);
    switches.clear();
    if (layer?.open) layer.close();
    layer?.remove();
  }

  function open() {
    if (layer?.isConnected || state.lockedScreen || state.locked || state.modal) return;
    if (activeJob() || state.purge || state.barrels.some(b => b.water || b.mix || b.fert)) {
      toast('请先停止当前设备操作');
      return;
    }
    layer = document.createElement('dialog');
    layer.className = 'debug-layer';
    layer.addEventListener('cancel', e => { e.preventDefault(); if (panel === 'access') close(); else if (panel === 'exit') draw('debug'); else draw('exit'); });
    layer.addEventListener('click', e => {
      const button = e.target.closest('[data-debug]');
      if (!button) return;
      const action = button.dataset.debug;
      if (action === 'close') return close();
      if (action === 'exit') return draw('exit');
      if (action === 'back') return draw('debug');
      if (action === 'stop') { switches.clear(); stopped = true; }
      if (action === 'toggle' && !stopped) {
        const key = button.dataset.key;
        if (switches.has(key)) switches.delete(key); else switches.add(key);
      }
      if (action === 'release') stopped = false;
      draw('debug');
      layer.querySelector('[data-debug="'+action+'"]'+(action === 'toggle' ? '[data-key="'+button.dataset.key+'"]' : ''))?.focus();
    });
    layer.addEventListener('submit', e => {
      e.preventDefault();
      if (layer.querySelector('input').value !== 'Clife.2026') {
        layer.querySelector('[role="alert"]').textContent = '安全口令不正确';
        return;
      }
      total = 0;
      stopped = false;
      draw('debug');
      ticker = setInterval(() => {
        if (!switches.has('pump')) return;
        total += 30 / 3600;
        const readout = layer.querySelector('[data-total]');
        if (readout) readout.textContent = total.toFixed(2)+' L';
      }, 1000);
    });
    screen.append(layer);
    draw('access');
    layer.showModal();
  }

  function control(key, name) {
    const on = switches.has(key);
    return `<button data-debug="toggle" data-key="${key}" aria-pressed="${on}" ${stopped?'disabled':''}><span>${name}</span><strong>${on?'已开启':'已关闭'}</strong></button>`;
  }

  function draw(next) {
    panel = next;
    layer.dataset.view = next;
    layer.setAttribute('aria-labelledby','debug-title');
    if (next === 'access') {
      layer.innerHTML = '<form><h2 id="debug-title">安全口令</h2><input type="password" aria-label="安全口令" placeholder="输入安全口令" required autofocus><p role="alert"></p><footer><button type="button" data-debug="close">取消</button><button class="primary">确定</button></footer></form>';
      return;
    }
    if (next === 'exit') {
      layer.innerHTML = '<h2 id="debug-title">退出调试模式？</h2><p>退出后将关闭施肥泵、注水阀、搅拌机和施肥阀。</p><footer><button data-debug="back" autofocus>取消</button><button class="primary" data-debug="close">确定退出</button></footer>';
      layer.querySelector('[autofocus]').focus();
      return;
    }
    const pump = switches.has('pump');
    layer.innerHTML = `<header><button data-debug="exit">‹ 退出</button><h2 id="debug-title">调试模式</h2><button class="debug-stop" data-debug="${stopped?'release':'stop'}">${stopped?'解除急停':'急停'}</button></header>
      <h3>施肥部分</h3><section class="debug-row">${control('pump','施肥泵')}<div class="debug-readings"><span>施肥压力 <b>${pump?'2.60':'0.00'} MPa</b></span><span>瞬时流量 <b>${pump?30:0} L/h</b></span><span>累计流量 <b data-total>${total.toFixed(2)} L</b></span></div></section>
      ${state.barrels.map(b => `<section class="debug-row"><div class="debug-tank"><h3>肥料桶${b.id}</h3><span>液位 ${b.sensor && Number.isFinite(b.lv)?b.lv.toFixed(0)+'%':'--'}</span></div>${names.map((name,i)=>control(b.id+'-'+i,name)).join('')}</section>`).join('')}`;
  }

  const cancel = () => clearTimeout(timer);
  screen.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.target.closest('[data-debug-logo]')) return;
    cancel();
    timer = setTimeout(open, 3000);
  });
  screen.addEventListener('pointerout', e => {
    const logo = e.target.closest('[data-debug-logo]');
    if (logo && !logo.contains(e.relatedTarget)) cancel();
  });
  for (const event of ['pointerup','pointercancel','blur']) window.addEventListener(event, cancel);
  screen.addEventListener('contextmenu', e => { if (e.target.closest('[data-debug-logo]')) e.preventDefault(); });
})();

