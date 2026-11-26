(() => {
  'use strict';

  const machineIdentity = {
    imei: '50E478C9763C', hostId: '10001', comm: 'Wi-Fi', signal: 100, version: 'V00022'
  };
  const lastReport = '2026-11-17 15:11:24';

  function irrigation(pump, filter) {
    return [
      ['灌溉泵', pump], ['主管道过滤器', filter], ['水源液位', '15%'],
      ['主管道流速', '0 m³/h'], ['主管道流量', '0 m³'], ['主管道水压', '0 MPa']
    ];
  }

  const fertigation = [
    ['施肥泵', '关闭'], ['施肥管道流速', '0 m³/h'], ['施肥管道流量', '0 m³'], ['施肥管道水压', '0 MPa']
  ];

  const devices = {
    jiangrun: {
      ...machineIdentity, name: '龙岗葡萄园测试水肥机', model: '疆润-智慧水肥一体机', status: '在线',
      sections: [
        ['灌溉系统', irrigation('开启', '关闭')],
        ['施肥系统', [...fertigation, ['施肥清洗阀', '关闭'], ['EC', '10 μS/cm'], ['pH', '6.7']]]
      ],
      barrelFields: ['液位', '注肥阀'],
      barrels: [['25%', '关闭'], ['25%', '关闭'], ['25%', '关闭']]
    },
    venturi: {
      ...machineIdentity, name: '河南xxx水肥机', model: 'C-Life水肥机-高级版（水溶肥-文丘里-施肥机）', status: '在线',
      sections: [
        ['灌溉系统', irrigation('开启', '开启')],
        ['施肥系统', [['施肥泵', '开启'], ['施肥管道水压', '0 MPa']]]
      ],
      barrelFields: ['液位', '注水阀', '搅拌机', '注肥阀', '施肥流速', '施肥流量'],
      barrels: [
        ['25%', '关闭', '关闭', '开启', '0 m³/h', '0 m³'],
        ['25%', '关闭', '关闭', '关闭', '0 m³/h', '0 m³']
      ]
    },
    injection: {
      ...machineIdentity, name: '新疆xxx水肥机', model: '水溶肥-注入式-施肥机', status: '离线',
      sections: [['灌溉系统', irrigation('关闭', '关闭')], ['施肥系统', fertigation]],
      barrelFields: ['液位', '注水阀', '搅拌机', '注肥阀'],
      barrels: [['25%', '关闭', '关闭', '关闭'], ['25%', '关闭', '关闭', '关闭']]
    },
    valve: {
      name: '5-2', model: 'Clife阀控器', status: '在线',
      imei: '50E478C9761810013', comm: 'LoRa', signal: 80,
      sections: [
        ['阀门控制', [['阀控器ID', '10012'], ['水阀1状态', '开'], ['水阀2状态', '关']]],
        ['电源状态', [['电池电量', '14,745 mV'], ['太阳能充电电压', '21,225 mV'], ['充电状态', '是'], ['设备温度', '25.25 ℃']]]
      ]
    }
  };

  function reading(value) {
    if (['开启', '开', '在线'].includes(value)) return '<span class="fd-state fd-on">' + value + '</span>';
    if (['关闭', '关', '离线'].includes(value)) return '<span class="fd-state fd-off">' + value + '</span>';
    return value;
  }

  function group(title, fields) {
    return `<section class="fd-group"><h3>${title}</h3><dl>${fields.map(([key, value]) =>
      `<div><dt>${key}</dt><dd>${reading(value)}</dd></div>`).join('')}</dl></section>`;
  }

  function barrelTable(device) {
    if (!device.barrels) return '';
    const fields = device.barrelFields.map(field => `<th scope="col">${field}</th>`).join('');
    const rows = device.barrels.map((values, i) =>
      `<tr><th scope="row">肥料桶 ${i + 1}</th>${values.map(value => `<td>${reading(value)}</td>`).join('')}</tr>`
    ).join('');
    return `<section class="fd-barrels"><h3>肥料桶</h3><div class="fd-table-scroll" tabindex="0" aria-label="肥料桶运行数据"><table>
      <thead><tr><th scope="col">编号</th>${fields}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  let dialog;
  let opener;
  function createDialog() {
    const element = document.createElement('dialog');
    element.className = 'farm-device-dialog';
    element.setAttribute('aria-labelledby', 'fd-name');
    document.body.append(element);
    element.addEventListener('click', event => {
      if (event.target.closest('.fd-close') || event.target === element) element.close();
    });
    element.addEventListener('close', () => opener?.focus?.({preventScroll: true}));
    return element;
  }

  window.openFarmDevice = function openFarmDevice(type, plotName) {
    if (!Object.hasOwn(devices, type)) return;
    const device = devices[type];
    dialog ??= createDialog();
    if (!dialog.open) opener = document.activeElement;
    const identity = [['IMEI', device.imei]];
    if (device.hostId) identity.push(['主机ID', device.hostId]);
    identity.push(['通讯方式', device.comm], ['信号强度', String(device.signal)]);
    if (device.version) identity.push(['主板软件版本号', device.version]);
    dialog.innerHTML = `<div class="fd-sheet">
      <header class="fd-head">
        <div class="fd-device-image"><img alt="" src="device-icons/${type}-map.webp"></div>
        <div class="fd-heading"><div class="fd-headline"><h2 id="fd-name">${device.name}</h2>${reading(device.status)}</div>
          <p class="fd-model">${device.model}</p><p class="fd-report">上报时间 <time datetime="2026-11-17T15:11:24+08:00">${lastReport}</time></p></div>
        <button type="button" class="fd-close" aria-label="关闭设备详情" autofocus>×</button>
      </header>
      <div class="fd-content" role="region" aria-label="设备详情" tabindex="0">
        <div class="fd-identity">${group('设备信息', identity)}</div>
        <div class="fd-groups">${device.sections.map(([name, fields]) => group(name, fields)).join('')}</div>
        ${barrelTable(device)}
      </div>
    </div>`;
    if (typeof plotName === 'string' && plotName.trim()) {
      const row = document.createElement('div');
      row.className = 'fd-plot-row';
      const label = document.createElement('dt');
      label.textContent = '所属地块';
      const value = document.createElement('dd');
      value.textContent = plotName.trim();
      row.append(label, value);
      dialog.querySelector('.fd-identity dl').prepend(row);
    }
    if (!dialog.open) dialog.showModal();
  };
})();
