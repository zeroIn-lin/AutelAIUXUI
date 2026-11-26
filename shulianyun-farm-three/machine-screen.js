(() => {
  const width = 1920;
  const height = 1080;
  const fallbackCorners = {tl:[391,153], tr:[598,179], bl:[391,305]};

  function attach(viewer, controls, canvas) {
    const product = canvas.parentElement;
    const preview = product.querySelector('.machine-preview');
    const glass = product.querySelector('.machine-glass');
    const mirror = glass.querySelector('iframe');
    const base = new URL('./machine-demo/',document.baseURI);
    const deviceOrigin = base.protocol === 'file:' ? 'null' : base.origin;
    const targetOrigin = deviceOrigin === 'null' ? '*' : deviceOrigin;
    const sheets = ['login.css','system-settings.css','operation-log.css'].map(file => new URL(file,base).href);
    let projected, active=false, hasFrame=false;
    let documentStyles, displayStyle;

    // The model uses an orthographic camera. Its three projected corners define
    // an affine transform from the flat, 1920 × 1080 HMI to the cabinet glass.
    function align() {
      if (!active) return;
      let corners = projected;
      if (!corners || canvas.dataset.ready !== 'true') {
        const size = preview.offsetWidth;
        if (!size) return;
        const left = (product.clientWidth-size)/2;
        const top = (product.clientHeight-size)/2;
        const point = ([x,y]) => [left+x*size/1200, top+y*size/1200];
        corners = {tl:point(fallbackCorners.tl),tr:point(fallbackCorners.tr),bl:point(fallbackCorners.bl)};
      }
      const {tl,tr,bl} = corners;
      const matrix = [(tr[0]-tl[0])/width,(tr[1]-tl[1])/width,
        (bl[0]-tl[0])/height,(bl[1]-tl[1])/height,tl[0],tl[1]];
      glass.style.transform = 'matrix('+matrix.join(',')+')';
      glass.hidden = !hasFrame;
    }

    function subscribe() {
      if (controls.hasAttribute('src')) {
        controls.contentWindow?.postMessage({type:'machine-screen-mirror',active},targetOrigin);
      }
    }
    function update() {
      const next = viewer.open && !document.hidden;
      if (next === active) return;
      active = next;
      if (!active) {
        hasFrame = false;
        glass.hidden = true;
      }
      align();
      subscribe();
    }

    // This empty, script-disabled document only paints the original HMI's
    // current view. There is one device controller and one task timer.
    const doc = mirror.contentDocument;
    const policy = doc.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "default-src 'none'; img-src 'self' file: data: blob:; style-src 'self' file: 'unsafe-inline'; font-src 'self' file: data:; form-action 'none'";
    const assetBase = doc.createElement('base');
    assetBase.href = base.href;
    doc.head.append(policy,assetBase);
    doc.documentElement.lang = 'zh-CN';

    function applyStyles(styles) {
      documentStyles?.forEach(node=>node.remove());
      documentStyles = [];
      for (const sheet of styles) {
        let node;
        if (typeof sheet.css === 'string') {
          node = doc.createElement('style');
          node.textContent = sheet.css;
        } else if (sheets.includes(sheet.href)) {
          node = doc.createElement('link');
          node.rel = 'stylesheet';
          node.href = sheet.href;
        } else continue;
        doc.head.append(node);
        documentStyles.push(node);
      }
      displayStyle ??= doc.createElement('style');
      displayStyle.textContent = `
        html,body {margin:0!important;padding:0!important;overflow:hidden!important;width:100%!important;height:100%!important}
        #screen {position:absolute!important;inset:0 auto auto 0!important;margin:0!important;width:1920px!important;height:1080px!important;transform:scale(var(--glass-scale-x),var(--glass-scale-y))!important;transform-origin:top left!important}
      `;
      doc.head.append(displayStyle);
    }

    function paint(frame) {
      if (frame.styles) applyStyles(frame.styles);
      const w = frame.viewportWidth || width;
      const h = frame.viewportHeight || height;
      // Keep the source viewport's media queries, then fit the complete display
      // into the model's physical glass, including on narrow screens.
      mirror.style.width = w+'px';
      mirror.style.height = h+'px';
      mirror.style.transform = 'scale('+width/w+','+height/h+')';
      doc.documentElement.style.setProperty('--glass-scale-x',w/width);
      doc.documentElement.style.setProperty('--glass-scale-y',h/height);
      doc.documentElement.dataset.theme = frame.theme || 'light';
      doc.body.className = frame.bodyClass || '';
      doc.body.innerHTML = frame.html;
      hasFrame = true;
      align();
      for (const item of frame.scroll || []) {
        const scrollable = doc.querySelector('[data-mirror-scroll="'+Number(item.i)+'"]');
        if (scrollable) scrollable.scrollTo(item.x,item.y);
      }
    }

    window.addEventListener('message', event => {
      if (!active || event.source !== controls.contentWindow || event.origin !== deviceOrigin) return;
      if (event.data?.type === 'machine-screen-frame' && typeof event.data.html === 'string') paint(event.data);
    });
    canvas.addEventListener('machine-screen-layout',event => {projected = event.detail;align();});
    new MutationObserver(align).observe(canvas,{attributes:true,attributeFilter:['data-ready']});
    new ResizeObserver(align).observe(product);
    preview.addEventListener('load',align);
    controls.addEventListener('load',() => {if (active) subscribe();});
    document.addEventListener('visibilitychange',update);
    return {update};
  }
  window.FarmCabinetScreen = {attach};
})();
