// Account flows are local prototype interactions; SMS is explicitly simulated.
(()=>{
let view='',step=1,codeSent=false,deadline=0,password='246810';
const style=document.createElement('style');style.textContent=`.account-menu{display:flex;flex-direction:column;gap:12px;position:absolute;right:20px;top:90px;z-index:90;background:var(--ui-panel,#fff);border:1px solid var(--ui-border,#ccc);border-radius:12px;padding:12px;box-shadow:0 8px 24px #0003}.account-menu button{display:block;width:200px;height:60px}.account-overlay{position:absolute;inset:0;z-index:180;background:#0007;display:grid;place-items:center}.account-dialog{background:var(--ui-panel,#fff);color:var(--ui-text,#222);width:760px;padding:30px 44px;border-radius:18px}.account-dialog header{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}.account-dialog h2{margin:0;font-size:30px}.account-dialog label{display:flex;align-items:center;gap:18px;margin:20px 0;font-size:24px}.account-dialog label>span{width:110px}.account-dialog input{min-width:0;flex:1;height:62px;font-size:24px;padding:0 16px;border:1px solid #aaa;border-radius:8px}.account-dialog button{min-height:56px;font-size:23px;padding:8px 22px}.account-dialog .primary{background:#39b665;color:white}.account-dialog footer{display:flex;justify-content:center;gap:20px;margin-top:26px}.account-dialog .account-error{color:#cf3434;min-height:30px;font-size:20px}.account-dialog .account-note{font-size:20px;color:var(--ui-muted,#777)}.account-dialog .account-link{display:block;margin:18px auto 0;color:#289c50;background:none;border:0}.account-dialog .steps{display:flex;justify-content:space-around;font-size:24px;margin-bottom:28px}.account-dialog .steps .active{font-weight:bold;color:#289c50}#screen .account-dialog .account-input{position:relative;display:flex;flex:1;width:auto;min-width:0}#screen .account-dialog .account-input input{width:100%;box-sizing:border-box;padding-right:66px}#screen .account-dialog [data-ac="eye"]{position:absolute;right:4px;top:3px;display:grid;place-items:center;width:56px;height:56px;min-height:56px;padding:0;border:0;border-radius:6px;background:transparent;box-shadow:none;color:var(--ui-muted,#777)}#screen .account-dialog .account-link{background:transparent;border:0;box-shadow:none;color:#289c50;text-decoration:none;padding:8px 12px;min-height:48px}#screen .account-dialog .account-link:hover{text-decoration:underline}#screen .account-dialog [data-ac="eye"]:focus-visible,#screen .account-dialog .account-link:focus-visible{outline:2px solid #62bb51;outline-offset:2px}#screen .account-dialog .account-input input::placeholder{font-size:18px;color:var(--ui-muted,#777)}#screen .account-dialog .account-error:empty{display:none}#screen .account-dialog footer{margin-top:24px}#screen .account-dialog .account-link{margin-top:12px}#screen .account-dialog{padding-bottom:24px}
#screen .account-dialog .steps{display:flex;justify-content:flex-start;align-items:center;gap:44px;padding:0;margin:0 0 26px;border:0;background:none;box-shadow:none}
#screen .account-dialog .steps span{display:flex;align-items:center;gap:12px;color:var(--ui-muted,#66716b)}
#screen .account-dialog .steps b{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--ui-button-mid,#e9ecea);font-size:20px}
#screen .account-dialog .steps .active{color:var(--ui-accent-text,#187738);font-weight:700}
#screen .account-dialog .steps .active b{background:#187738;color:#fff}
#screen .account-dialog .account-link{margin:0 0 0 128px;padding-inline:0;text-align:left;width:max-content}`;document.head.append(style);
const root=()=>document.querySelector('#screen');
function close(){document.querySelector('.account-overlay')?.remove();loginPage?.querySelector('.login-layout')?.removeAttribute('inert');view='';}
const eyeIcon=visible=>'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(visible?'<path d="m3 3 18 18"/>':'')+'</svg>';
const field=(id,label,type='password')=>`<label><span>${label}</span><span class="account-input"><input id="ac-${id}" type="${type}" autocomplete="off" ${id==='new'?'placeholder="8–16位，大小写字母、数字、特殊字符中至少三种组合"':''} aria-label="${label}">${type==='password'?`<button type="button" data-ac="eye" data-for="ac-${id}" aria-label="显示${label}" aria-pressed="false">${eyeIcon(false)}</button>`:''}</span></label>`;
function show(v){view=v;root().querySelector('.account-menu')?.remove();document.querySelector('.account-overlay')?.remove();const box=document.createElement('div');box.className='account-overlay';box.innerHTML=`<section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="ac-title"><header><h2 id="ac-title">${v==='change'?'修改密码':v==='forgot'?'忘记密码':v==='logout'?'退出登录':'账号登录'}</h2><button data-ac="close" aria-label="关闭">×</button></header><form novalidate>${v==='logout'?'<p style="font-size:28px;text-align:center">确定要退出当前账号吗？</p>':v==='login'?field('name','账号','text')+field('pass','密码'):v==='forgot'?`<div class="steps"><span class="${step===1?'active':''}"><b aria-hidden="true">1</b>验证手机号</span><span class="${step===2?'active':''}"><b aria-hidden="true">2</b>重置密码</span></div>`+(step===1?field('phone','手机号','tel')+`<label><span>验证码</span><input id="ac-code" inputmode="numeric" aria-label="验证码"><button type="button" data-ac="code">获取验证码</button></label><p class="account-note">原型演示：验证码为 123456，不发送短信</p>`:field('new','新密码')+field('repeat','确认密码')):field('old','旧密码')+field('new','新密码')+field('repeat','确认密码')}${v==='change'||v==='forgot'&&step===2?'':''}${v==='change'?'<button type="button" class="account-link" data-ac="forgot">忘记密码</button>':''}<div class="account-error" role="alert"></div><footer>${v==='logout'?'<button type="button" data-ac="close">取消</button>':''}<button class="primary" type="submit">${v==='login'?'登录':v==='forgot'&&step===1?'下一步':'确定'}</button></footer></form></section>`;if(loginPage) loginPage.querySelector('.login-layout').setAttribute('inert','');(loginPage||root()).append(box);box.querySelector('input,button').focus();box.querySelector('form').onsubmit=e=>{e.preventDefault();submit();};}
function submit(){const val=id=>document.getElementById('ac-'+id)?.value||'',err=t=>document.querySelector('.account-error').textContent=t;
if(view==='logout'){close();sessionStorage.removeItem('fert-demo-session');mountLogin();return;}
if(view==='login'){if(val('name')!=='张三'||val('pass')!==password)return err('账号或密码不正确');close();toast('登录成功');return;}
if(view==='forgot'&&step===1){if(!/^1\d{10}$/.test(val('phone')))return err('请输入正确的手机号');if(!codeSent||val('code')!=='123456'||Date.now()>deadline)return err('请获取并输入有效验证码');step=2;show('forgot');return;}
if(view==='change'&&val('old')!==password)return err('旧密码不正确');const p=val('new'),groups=[/[a-z]/,/[A-Z]/,/\d/,/[^a-zA-Z0-9\s]/].filter(r=>r.test(p)).length;if(p.length<8||p.length>16||groups<3||/\s/.test(p))return err('密码须为8–16位，且包含至少三种字符');if(p!==val('repeat'))return err('两次输入的密码不一致');password=p;lockPassword=p;close();if(loginPage){loginPage.querySelector('[role=alert]').textContent='密码已重置，请使用新密码登录';loginPage.querySelector('input')?.focus();}else toast('密码修改成功');}
document.addEventListener('click',e=>{const user=e.target.closest('.user-button');if(user){e.preventDefault();e.stopImmediatePropagation();const old=root().querySelector('.account-menu');if(old){old.remove();return;}const menu=document.createElement('div');menu.className='account-menu';menu.innerHTML='<button data-ac="change">修改密码</button><button data-ac="logout">退出登录</button>';root().append(menu);return;}const b=e.target.closest('[data-ac]');if(b){e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.ac;if(a==='close')close();else if(a==='eye'){const i=document.getElementById(b.dataset.for);i.type=i.type==='password'?'text':'password';b.innerHTML=eyeIcon(i.type==='text');b.setAttribute('aria-pressed',String(i.type==='text'));b.setAttribute('aria-label',(i.type==='text'?'隐藏':'显示')+i.getAttribute('aria-label'));}else if(a==='code'){if(!/^1\d{10}$/.test(document.getElementById('ac-phone').value)){document.querySelector('.account-error').textContent='请输入正确的手机号';return;}codeSent=true;deadline=Date.now()+300000;b.disabled=true;let n=60;b.textContent=n+'秒后重试';const timer=setInterval(()=>{if(!b.isConnected){clearInterval(timer);return;}b.textContent=--n+'秒后重试';if(n<=0){clearInterval(timer);b.disabled=false;b.textContent='获取验证码';}},1000);}else{if(a==='forgot'){step=1;codeSent=false;}show(a);}return;}if(!e.target.closest('.account-menu'))root().querySelector('.account-menu')?.remove();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(view==='login')return;close();root().querySelector('.account-menu')?.remove();}if(e.key==='Tab'&&view){const items=[...document.querySelectorAll('.account-dialog button:not(:disabled),.account-dialog input')];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}});
let loginPage = null;
const baseTitle = '智慧水肥操作系统';

function enterControl() {
  sessionStorage.setItem('fert-demo-session','1');
  loginPage.remove();
  loginPage = null;
  root().classList.remove('show-login');
  root().querySelector('.top')?.removeAttribute('inert');
  root().querySelector('.main')?.removeAttribute('inert');
  root().querySelector('.topnav button')?.focus();
}

function mountLogin() {
  if (loginPage) return;
  root().classList.add('show-login');
  root().querySelector('.top')?.setAttribute('inert','');
  root().querySelector('.main')?.setAttribute('inert','');
  loginPage = document.createElement('main');
  loginPage.className = 'login-page';
  loginPage.setAttribute('aria-labelledby','login-title');
  loginPage.innerHTML = `<div class="login-layout"><section class="login-intro"><h1 id="login-title">${baseTitle}</h1>
      <p>数联耘农场版小程序支持注册账号和远程管理设备。</p><a href="tel:40080012350">400-800-12350</a></section>
    <section class="login-card" aria-label="账号登录"><div class="login-tabs" role="group" aria-label="登录方式"><button data-login-tab="password">密码登录</button><button data-login-tab="scan">扫码登录</button></div><div class="login-content"></div></section></div>`;
  loginPage.querySelectorAll('[data-login-tab]').forEach(button=>button.addEventListener('click',()=>drawLogin(button.dataset.loginTab)));
  root().append(loginPage);
  drawLogin('password');
}

function drawLogin(mode) {
  loginPage.querySelectorAll('[data-login-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.loginTab===mode)));
  const area = loginPage.querySelector('.login-content');
  if (mode==='scan') {
    area.innerHTML = '<div class="login-scan"><img src="assets/login-demo-qr.svg" alt="水肥机原型演示二维码"><small>演示码 · 扫码打开原型</small><button type="button" class="login-text-link">模拟扫码成功</button></div>';
    area.querySelector('button').onclick = enterControl;
    return;
  }
  area.innerHTML = `<form novalidate><label class="login-field">${uiIcon('user')}<input name="account" aria-label="账号" placeholder="请输入账号" autocomplete="username"></label>
    <label class="login-field">${uiIcon('lock')}<input name="password" type="password" aria-label="密码" placeholder="请输入密码" autocomplete="current-password"><button type="button" class="login-eye" aria-label="显示密码" aria-pressed="false">${eyeIcon(false)}</button></label>
    <p role="alert"></p><button class="login-submit">登录</button><button type="button" class="login-forgot" data-ac="forgot">忘记密码</button><details class="login-demo"><summary class="login-text-link">查看演示账号</summary><small>账号 张三 · 初始密码 246810</small></details></form>`;
  const form = area.querySelector('form');
  const input = form.elements.password;
  form.querySelector('.login-eye').onclick = e => {
    const visible = input.type==='password';
    input.type = visible?'text':'password';
    e.currentTarget.innerHTML = eyeIcon(visible);
    e.currentTarget.setAttribute('aria-pressed',String(visible));
    e.currentTarget.setAttribute('aria-label',visible?'隐藏密码':'显示密码');
  };
  form.onsubmit = e => {
    e.preventDefault();
    const account = form.elements.account;
    const error = form.querySelector('[role=alert]');
    if (!account.value.trim()) { error.textContent='请输入账号'; account.focus(); return; }
    if (!input.value) { error.textContent='请输入密码'; input.focus(); return; }
    if (account.value.trim()!=='张三' || input.value!==password) { error.textContent='账号或密码不正确'; input.focus(); return; }
    enterControl();
  };
}

if (window.parent === window && sessionStorage.getItem('fert-demo-session')!=='1') mountLogin();

})();
