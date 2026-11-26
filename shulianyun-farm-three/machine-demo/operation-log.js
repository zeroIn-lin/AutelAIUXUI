const operationLog = (() => {
  const storeKey = 'fert-demo-operations-v1';
  const filters = [
    ['category', '控制类型', ['首部', '田间', '施肥', '紧急', '其他']],
    ['result', '操作结果', ['成功', '失败']],
    ['mode', '应用模式', ['手动水肥', '一键水肥', '自动水肥']],
    ['source', '操作来源', ['本地终端', '农场版小程序', '农场版 APP']]
  ];
  const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});
  const device = '123456789012345';
  const batch = [
    {item:'阀门 1-1-A', action:'开度 0% → 80%', success:true},
    {item:'阀门 2-1-A', action:'开度 0% → 60%', success:false, reason:'设备离线'}
  ];
  const examples = [
    ['施肥','肥料桶 1 · 注水阀','关闭 → 开启',true,'手动水肥','本地终端'],
    ['田间','灌区 1','批量调整阀门开度',false,'手动水肥','农场版小程序',batch],
    ['首部','灌溉泵','关闭 → 开启',true,'自动水肥','农场版 APP'],
    ['施肥','肥料桶 1 · 搅拌机','关闭 → 开启',true,'一键水肥','本地终端'],
    ['施肥','肥料桶 3 · 注肥阀','关闭 → 开启',false,'一键水肥','本地终端',null,'控制器反馈超时'],
    ['首部','初级过滤器清洗阀','开启 → 关闭',true,'自动水肥','农场版小程序'],
    ['紧急','急停','关闭 → 开启',true,'手动水肥','本地终端'],
    ['紧急','急停复位','开启 → 关闭',true,'手动水肥','本地终端'],
    ['其他','模式切换','手动水肥 → 一键水肥',true,'一键水肥','本地终端'],
    ['田间','阀门 1-1-A','开度 20% → 60%',true,'自动水肥','农场版 APP'],
    ['施肥','施肥泵','开启 → 关闭',true,'一键水肥','本地终端'],
    ['首部','后级过滤器','关闭 → 开启',false,'手动水肥','农场版 APP',null,'设备离线']
  ].map(([category,item,action,success,mode,source,steps,reason],index) => ({
    id:'example-'+index, timestamp:Date.now()-3600000-index*21600000, category,item,action,success,mode,source,steps,reason,operator:'张三',device
  }));
  let local = [];
  try {
    const saved=JSON.parse(localStorage.getItem(storeKey)||'[]');
    if(Array.isArray(saved))local=saved.filter(row=>row && typeof row.id==='string' && Number.isFinite(row.timestamp));
  } catch {}
  let applied = {};

  function parts(timestamp) {
    return Object.fromEntries(dateParts.formatToParts(timestamp).map(({type,value})=>[type,value]));
  }
  function date(timestamp, iso=false) {
    const p=parts(timestamp);
    return iso ? p.year+'-'+p.month+'-'+p.day : p.year+'-'+Number(p.month)+'-'+Number(p.day);
  }
  function time(timestamp) {
    const {hour,minute,second}=parts(timestamp);
    return hour+':'+minute+':'+second;
  }
  function add(category,item,action,mode) {
    local.unshift({
      id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),timestamp:Date.now(),
      category,item,action,mode,success:true,source:'本地终端',operator:'张三',device
    });
    local=local.slice(0,160);
    try { localStorage.setItem(storeKey,JSON.stringify(local)); } catch {}
  }

  const all=()=>[...local,...examples].sort((a,b)=>b.timestamp-a.timestamp);
  const find=id=>all().find(row=>row.id===id);
  const isFiltered=()=>Object.values(applied).some(Boolean);
  const result=row=>row.success?'成功':'失败';
  const resultTag=row=>`<span class="operation-result ${row.success?'is-success':'is-failed'}">${result(row)}</span>`;
  const matched=row=>{
    const day=date(row.timestamp,true);
    if(applied.start&&day<applied.start||applied.end&&day>applied.end)return false;
    return filters.every(([key])=>!applied[key]||applied[key]===(key==='result'?result(row):row[key]));
  };

  function pageHTML() {
    const rows=all().filter(matched);
    return `<section class="operation-page" aria-labelledby="operation-heading">
      <header class="operation-heading"><h2 id="operation-heading" tabindex="-1">操作记录</h2>
        <div class="operation-tools">${isFiltered()?'<button data-action="operation-reset">清除筛选</button>':''}<button data-action="operation-filters">筛选${isFiltered()?' · 已启用':''}</button></div></header>
      <div class="operation-table-wrap" tabindex="0" aria-label="操作记录列表">
        <table class="operation-table"><thead><tr><th scope="col">操作日期</th><th scope="col">控制类型</th><th scope="col">操作项目</th><th scope="col">操作动作</th><th scope="col">操作结果</th><th scope="col">来源</th><th scope="col">操作人</th><th scope="col">操作</th></tr></thead>
          <tbody>${rows.length?rows.map(row=>`<tr data-action="operation-detail" data-id="${esc(row.id)}"><td title="${time(row.timestamp)}">${date(row.timestamp)}</td><td>${esc(row.category)}</td><td>${esc(row.item)}</td><td>${esc(row.action)}</td><td>${resultTag(row)}</td><td>${esc(row.source)}</td><td>${esc(row.operator)}</td><td><button class="operation-view" data-action="operation-detail" data-id="${esc(row.id)}" aria-label="查看${esc(row.item)}的操作记录">查看</button></td></tr>`).join(''):`<tr><td colspan="8" class="operation-empty">没有符合条件的操作记录</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
  }

  function dateField(name, label, value) {
    const icon = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5m8-5v5M4 11h16"/></svg>';
    return `<div class="operation-date-field" data-operation-date="${name}">
      <span id="operation-${name}-label">${label}</span>
      <input name="${name}" type="hidden" value="${esc(value)}">
      <button type="button" class="operation-date-trigger" aria-expanded="false" aria-haspopup="dialog" aria-controls="operation-${name}-calendar" aria-labelledby="operation-${name}-label operation-${name}-value">
        <span id="operation-${name}-value" class="operation-date-value">${value?displayDate(value):'请选择日期'}</span>${icon}
      </button>
      <div class="operation-calendar" id="operation-${name}-calendar" role="dialog" aria-label="${label}日历" hidden></div>
    </div>`;
  }

  function displayDate(iso) {
    const [year,month,day]=iso.split('-').map(Number);
    return year+'-'+month+'-'+day;
  }

  function calendarDate(timestamp) {
    return new Date(timestamp).toISOString().slice(0,10);
  }

  function drawCalendar(field, month) {
    const panel=field.querySelector('.operation-calendar');
    const selected=field.querySelector('input').value;
    const today=date(Date.now(),true);
    const [year,m]=month.split('-').map(Number);
    const weekStart=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
    const count=new Date(Date.UTC(year,m,0)).getUTCDate();
    const triangle='<svg width="10" height="8" viewBox="0 0 10 8" fill="currentColor" aria-hidden="true"><path d="M0 7 5 1 10 7Z"/></svg>';
    panel.dataset.month=month;
    panel.innerHTML=`<div class="operation-calendar-header"><strong aria-live="polite">${year}年${m}月</strong>
      <div><button type="button" class="operation-month" data-month-step="-1" aria-label="上个月">${triangle}</button>
      <button type="button" class="operation-month" data-month-step="1" aria-label="下个月">${triangle}</button></div></div>
      <div class="operation-calendar-grid">${['一','二','三','四','五','六','日'].map(day=>`<span>${day}</span>`).join('')}
      ${Array.from({length:Math.ceil((weekStart+count)/7)*7},(_,index)=>{
        const day=index-weekStart+1;
        const iso=calendarDate(Date.UTC(year,m-1,day));
        const tabStop=(selected||today).slice(0,7)===month ? iso===(selected||today) : day===1;
        return `<button type="button" data-calendar-day="${iso}" class="operation-calendar-day ${day<1||day>count?'is-adjacent':''}" tabindex="${tabStop?0:-1}" aria-label="${displayDate(iso)}" aria-pressed="${iso===selected}" ${iso===today?'aria-current="date"':''}>${Number(iso.slice(-2))}</button>`;
      }).join('')}</div>
      <div class="operation-calendar-footer"><button type="button" data-calendar-action="clear">清除</button><button type="button" data-calendar-action="today">今天</button></div>`;
  }

  function closeCalendar(field, restoreFocus=false) {
    field.querySelector('.operation-calendar').hidden=true;
    const trigger=field.querySelector('.operation-date-trigger');
    trigger.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger.focus();
  }

  function pickDate(field, value) {
    const input=field.querySelector('input');
    input.value=value;
    field.querySelector('.operation-date-value').textContent=value?displayDate(value):'请选择日期';
    input.dispatchEvent(new Event('change',{bubbles:true}));
    closeCalendar(field,true);
  }

  document.addEventListener('click',event=>{
    const field=event.target.closest('[data-operation-date]');
    const open=Array.from(document.querySelectorAll('.operation-calendar:not([hidden])'),panel=>panel.closest('[data-operation-date]'));
    for(const other of open)if(other!==field)closeCalendar(other);
    if(!field)return;
    const panel=field.querySelector('.operation-calendar');
    const button=event.target.closest('button');
    if(!button)return;
    if(button.classList.contains('operation-date-trigger')){
      if(!panel.hidden){closeCalendar(field);return;}
      const value=field.querySelector('input').value||date(Date.now(),true);
      drawCalendar(field,value.slice(0,7));
      panel.hidden=false;
      button.setAttribute('aria-expanded','true');
      panel.querySelector('[data-calendar-day="'+value+'"]')?.focus();
      return;
    }
    if(button.dataset.monthStep){
      const [year,month]=panel.dataset.month.split('-').map(Number);
      const step=Number(button.dataset.monthStep);
      drawCalendar(field,calendarDate(Date.UTC(year,month-1+step,1)).slice(0,7));
      panel.querySelector('[data-month-step="'+step+'"]').focus();
    }else if(button.dataset.calendarDay)pickDate(field,button.dataset.calendarDay);
    else if(button.dataset.calendarAction)pickDate(field,button.dataset.calendarAction==='today'?date(Date.now(),true):'');
  },true);

  document.addEventListener('keydown',event=>{
    const panel=document.querySelector('.operation-calendar:not([hidden])');
    if(!panel)return;
    const field=panel.closest('[data-operation-date]');
    if(event.key==='Escape'){
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCalendar(field,true);
      return;
    }
    const day=event.target.dataset.calendarDay;
    const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
    if(!day||!step)return;
    event.preventDefault();
    const next=calendarDate(Date.parse(day)+step*86400000);
    if(next.slice(0,7)!==panel.dataset.month)drawCalendar(field,next.slice(0,7));
    const target=panel.querySelector('[data-calendar-day="'+next+'"]');
    if(target){
      panel.querySelector('[data-calendar-day][tabindex="0"]')?.setAttribute('tabindex','-1');
      target.tabIndex=0;
      target.focus();
    }
  },true);

  function filterHTML(draft) {
    return `<form id="operation-filter-form" class="operation-filter-form">
      <fieldset><legend>任务时间</legend><div class="operation-date-range">
        ${dateField('start','开始日期',draft.start||'')}
        <span aria-hidden="true">至</span>
        ${dateField('end','结束日期',draft.end||'')}
      </div></fieldset>
      ${filters.map(([key,label,options])=>`<fieldset><legend>${label}</legend><div class="operation-filter-options">
        ${['',...options].map(value=>`<label><input type="radio" name="${key}" value="${value}" ${(draft[key]||'')===value?'checked':''}><span>${value||'全部'}</span></label>`).join('')}
      </div></fieldset>`).join('')}
      <p class="operation-filter-error" role="alert"></p>
    </form>`;
  }

  function detailHTML(row) {
    const facts = [
      ['操作分类',row.category],['操作项目',row.item],['当前模式',row.mode],['操作人',row.operator],
      ['操作来源',row.source],['操作时间',date(row.timestamp)+' '+time(row.timestamp)],['操作对象（IMEI）',row.device]
    ];
    return `<dl class="operation-facts">${facts.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}
      <div><dt>操作动作</dt><dd>${esc(row.action)}</dd></div>
      <div><dt>操作结果</dt><dd>${resultTag(row)}${row.reason?' <span class="operation-reason">'+esc(row.reason)+'</span>':''}</dd></div>
    </dl>${row.steps?.length?`<table class="operation-table operation-step-table"><thead><tr><th scope="col">操作对象</th><th scope="col">操作动作</th><th scope="col">结果</th></tr></thead>
      <tbody>${row.steps.map(step=>`<tr><td>${esc(step.item)}</td><td>${esc(step.action)}</td><td>${resultTag(step)}${step.reason?' <span class="operation-reason">'+esc(step.reason)+'</span>':''}</td></tr>`).join('')}</tbody></table>`:''}`;
  }

  return {pageHTML, filterHTML, detailHTML, find, add, filters:()=>({...applied}), setFilters:next=>{applied=next;}};
})();
