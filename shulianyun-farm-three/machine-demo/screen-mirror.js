(() => {
  'use strict';
  if (window.parent === window) return;
  const screen = document.getElementById('screen');
  if (!screen) return;

  const allowedStyles = new Set(['login.css','system-settings.css','operation-log.css'].map(file => new URL(file, location.href).href));
  const assets = new URL('./assets/',location.href);
  const filePage = location.protocol === 'file:';
  const targetOrigin = filePage ? '*' : location.origin;
  const excluded = 'script,style,iframe,frame,object,embed,foreignObject,base,link,meta,noscript,template,video,audio,source,animate,animateMotion,animateTransform,set,.login-demo small,.account-note,.pattern-lines polyline';
  const credentialsHint = /(?:初始图形[：:]|(?:密码|验证码|口令)[\s为是:：]{0,5}\d{4,})/u;
  const svgNS = 'http://www.w3.org/2000/svg';
  const cadence = 240;
  let subscribed = false, watching = false, timer = 0, lastAt = -Infinity;
  let lastHTML = '', lastState = '', styleChanged = true;

  function styleList() {
    return Array.from(document.head.querySelectorAll('style,link[rel~="stylesheet"]')).flatMap(el => {
      if (el.tagName === 'STYLE') return [{css:el.textContent}];
      return allowedStyles.has(el.href) ? [{href:el.href}] : [];
    });
  }
  function inertAttributes(el) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase(), value = attr.value.trim();
      if (/^on/.test(name) || ['action','formaction','srcdoc','srcset','target','autofocus','contenteditable'].includes(name)) el.removeAttributeNode(attr);
      else if ((name==='href' || name==='xlink:href') && !(el.namespaceURI===svgNS && /^#[\w.-]+$/.test(value))) el.removeAttributeNode(attr);
      else if (name==='src') {
        const bundled = el.tagName==='IMG' && /^assets\/[\w.-]+\.(?:png|jpe?g|webp|svg)$/i.test(value);
        if (bundled) el.src = new URL(value.slice('assets/'.length),assets).href;
        else if (!(el.tagName==='IMG' && /^data:image\/(?:png|jpeg|webp|svg\+xml);/i.test(value))) el.removeAttributeNode(attr);
      }
    }
  }
  function snapshot() {
    const bounds = screen.getBoundingClientRect();
    const width = screen.offsetWidth, height = screen.offsetHeight;
    if (!bounds.width || !bounds.height || !width || !height) return null;
    const screenScale = bounds.width / width, scroll = [];
    function copy(node) {
      if (node.nodeType===Node.TEXT_NODE) return document.createTextNode(credentialsHint.test(node.data) ? '' : node.data);
      if (node.nodeType!==Node.ELEMENT_NODE || node.matches(excluded)) return null;
      if (node.parentNode===screen && getComputedStyle(node).display==='none') return null;
      const mirror=node.cloneNode(false);
      inertAttributes(mirror);
      if (node instanceof HTMLInputElement) {
        if (['checkbox','radio'].includes(node.type)) mirror.toggleAttribute('checked',node.checked);
        // Only previously committed numeric settings may carry a value. Never copy live input buffers.
        if (node.type!=='number' || node.closest('.touch-keyboard,.account-dialog,.login-page,.unlock-dialog,.debug-layer')) mirror.removeAttribute('value');
      }
      if (node instanceof HTMLOptionElement) mirror.toggleAttribute('selected',node.selected);
      if (node.matches('.pattern-dot')) mirror.setAttribute('aria-pressed','false');
      if (!(node instanceof HTMLTextAreaElement) && !node.isContentEditable) {
        for (const child of node.childNodes) {
          const next=copy(child);
          if (next) mirror.append(next);
        }
      }
      if (node.scrollLeft || node.scrollTop) {
        const i=scroll.length;
        mirror.setAttribute('data-mirror-scroll',String(i));
        scroll.push({i,x:node.scrollLeft,y:node.scrollTop});
      }
      // Native modal dialogs escape the source screen's CSS scale. Place them back in its logical coordinates.
      if (node instanceof HTMLDialogElement && node.matches(':modal')) {
        const rect=node.getBoundingClientRect(), backdrop=document.createElement('div');
        Object.assign(backdrop.style,{position:'absolute',inset:'0',zIndex:'2147483646',backgroundColor:getComputedStyle(node,'::backdrop').backgroundColor});
        Object.assign(mirror.style,{position:'absolute',inset:'auto',margin:'0',left:(rect.left-bounds.left)/screenScale+'px',top:(rect.top-bounds.top)/screenScale+'px',width:rect.width+'px',height:rect.height+'px',maxWidth:'none',maxHeight:'none',transformOrigin:'0 0',transform:'scale('+1/screenScale+')'});
        backdrop.append(mirror);
        return backdrop;
      }
      return mirror;
    }
    const root=copy(screen);
    root.style.removeProperty('transform');
    return {html:root.outerHTML,width,height,screenScale,viewportWidth:innerWidth,viewportHeight:innerHeight,theme:document.documentElement.dataset.theme || 'light',bodyClass:document.body.className,scroll};
  }
  function send() {
    timer=0;
    if (!watching || document.hidden) return;
    lastAt=performance.now();
    const frame=snapshot();
    if (!frame) return;
    const {html,...state}=frame, signature=JSON.stringify(state);
    if (!styleChanged && html===lastHTML && signature===lastState) return;
    lastHTML=html;
    lastState=signature;
    if (styleChanged) frame.styles=styleList();
    styleChanged=false;
    parent.postMessage({type:'machine-screen-frame',...frame},targetOrigin);
  }
  function schedule() {
    if (watching && !timer) timer=setTimeout(send, Math.max(0,cadence-(performance.now()-lastAt)));
  }
  const screenObserver=new MutationObserver(schedule);
  const styleObserver=new MutationObserver(() => {styleChanged=true;schedule();});
  const contextObserver=new MutationObserver(schedule);
  function activate() {
    const shouldWatch=subscribed && !document.hidden;
    if (shouldWatch===watching) return;
    watching=shouldWatch;
    if (watching) {
      lastAt=-Infinity;
      lastHTML='';
      styleChanged=true;
      screenObserver.observe(screen,{childList:true,subtree:true,attributes:true,characterData:true});
      styleObserver.observe(document.head,{childList:true,subtree:true,characterData:true});
      contextObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class']});
      contextObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
      screen.addEventListener('scroll',schedule,true);
      screen.addEventListener('change',schedule,true);
      window.addEventListener('resize',schedule);
      schedule();
    } else {
      clearTimeout(timer);timer=0;
      screenObserver.disconnect();styleObserver.disconnect();contextObserver.disconnect();
      screen.removeEventListener('scroll',schedule,true);
      screen.removeEventListener('change',schedule,true);
      window.removeEventListener('resize',schedule);
      lastHTML='';lastState='';
    }
  }
  window.addEventListener('message',event => {
    if (event.source!==parent || event.origin!==(filePage?'null':location.origin)) return;
    if (event.data?.type!=='machine-screen-mirror' || typeof event.data.active!=='boolean') return;
    subscribed=event.data.active;
    activate();
  });
  document.addEventListener('visibilitychange',activate);
  window.addEventListener('pagehide',()=>{subscribed=false;activate();});
})();
