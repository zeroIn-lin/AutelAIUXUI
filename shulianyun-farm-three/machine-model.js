(() => {
  'use strict';

  function mount(canvas, THREE) {
    canvas.dataset.ready = 'false';
    if (!THREE || !THREE.WebGLRenderer) return null;

    let renderer, observer, camera, scene, displayGlass;
    const displayWidth = .84;
    const displayHeight = displayWidth * 9 / 16;
    let disposed = false;
    let lost = false;
    const resources = new Set();

    function own(resource) {
      resources.add(resource);
      return resource;
    }
    function material(color, roughness, metalness = 0) {
      return own(new THREE.MeshStandardMaterial({color, roughness, metalness}));
    }
    function mesh(geometry, surface, x, y, z) {
      const item = new THREE.Mesh(own(geometry), surface);
      item.position.set(x, y, z);
      scene.add(item);
      return item;
    }
    function box(w, h, d, radius, surface, x, y, z) {
      return mesh(new THREE.RoundedBoxGeometry(w, h, d, 2, radius), surface, x, y, z);
    }
    function cylinder(top, bottom, height, surface, x, y, z, axis = 'y', sides = 28) {
      const item = mesh(new THREE.CylinderGeometry(top, bottom, height, sides), surface, x, y, z);
      if (axis === 'z') item.rotation.x = Math.PI / 2;
      if (axis === 'x') item.rotation.z = -Math.PI / 2;
      return item;
    }
    function paintedTexture(width, height, paint) {
      const sheet = document.createElement('canvas');
      sheet.width = width;
      sheet.height = height;
      paint(sheet.getContext('2d'));
      const texture = own(new THREE.CanvasTexture(sheet));
      texture.colorSpace = 'srgb';
      return texture;
    }

    function buildCabinet() {
      const enamel = material(0xebebe9, .54, .10);
      const door = material(0xf5f5f2, .52, .10);
      const trim = material(0xdde1de, .32, .22);
      const silver = material(0xd7dcda, .22, .9);
      const graphite = material(0x323435, .58, .2);
      const seam = material(0x515351, .7, .08);
      const recess = material(0x383a3a, .77);
      // Fine powder-coated finish. A broad reflected softbox breaks up the
      // flat front door even when the model is displayed at small sizes.
      const coating = paintedTexture(256, 512, ctx => {
        const image = ctx.createImageData(256, 512);
        let seed = 147;
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 256; x++) {
            seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
            const grain = (seed / 4294967296 - .5) * 4;
            const glow = 8 * Math.exp(-((x / 256 - .24 + y / 2200) ** 2) / .11);
            const value = 244 + glow + grain;
            const index = (y * 256 + x) * 4;
            image.data[index] = value;
            image.data[index + 1] = value;
            image.data[index + 2] = value;
            image.data[index + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);
      });
      door.map = enamel.map = coating;

      // Folded steel carcass, recessed skirt and independent doors.
      box(1.435, .18, .982, .012, graphite, 0, .09, 0);
      box(1.44, 3.14, .982, .018, enamel, 0, 1.742, -.008);
      box(1.445, .032, .994, .009, trim, 0, 3.314, -.008);
      box(1.43, 3.135, .021, .007, seam, 0, 1.743, .491);
      box(1.416, 2.391, .036, .015, door, 0, 1.376, .507);
      box(1.416, .724, .036, .014, door, 0, 2.944, .507);
      box(.765, .026, .009, .004, seam, 0, 2.421, .527);

      // Punch pattern and the recessed ventilation compartment behind it.
      box(1.219, .578, .012, .009, silver, 0, 2.949, .529);
      box(1.197, .553, .010, .006, recess, 0, 2.949, .537);
      const grille = paintedTexture(768, 355, ctx => {
        const metal = ctx.createLinearGradient(0, 0, 768, 190);
        metal.addColorStop(0, '#b8bbb8');
        metal.addColorStop(.45, '#a6a9a7');
        metal.addColorStop(1, '#d0d1ce');
        ctx.fillStyle = metal;
        ctx.fillRect(0, 0, 768, 355);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        for (let row = 0; row * 7.8 < 364; row++) {
          for (let x = (row % 2) * 4.5; x < 778; x += 9) {
            ctx.moveTo(x + 3, row * 7.8);
            ctx.arc(x, row * 7.8, 3, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      });
      const grilleSurface = own(new THREE.MeshStandardMaterial({
        map: grille, transparent: true, roughness: .48, metalness: .16
      }));
      mesh(new THREE.PlaneGeometry(1.193, .546), grilleSurface, 0, 2.949, .544);

      // Panel-mounted HMI. The flanking strips of perforated steel remain
      // exposed around the graphite surround and inset display.
      box(.923, .535, .033, .015, graphite, 0, 2.949, .553);
      box(.878, .502, .013, .006, recess, 0, 2.949, .571);
      displayGlass = mesh(new THREE.PlaneGeometry(displayWidth, displayHeight),
        own(new THREE.MeshBasicMaterial({color: 0x15232b})), 0, 2.949, .5785);

      // Flush chrome cam lock and a mushroom emergency stop with a safety collar.
      box(.062, .235, .022, .019, silver, -.585, 1.371, .538);
      box(.036, .172, .03, .014, silver, -.585, 1.37, .557);
      box(.008, .033, .006, .003, seam, -.585, 1.411, .573);
      const yellow = material(0xf6bb12, .36, .04);
      const red = material(0xaf1f1b, .26, .025);
      cylinder(.093, .093, .025, yellow, -.026, 1.418, .543, 'z');
      cylinder(.044, .048, .051, graphite, -.026, 1.418, .572, 'z');
      cylinder(.061, .065, .042, red, -.026, 1.418, .61, 'z');
      const buttonRim = new THREE.TorusGeometry(.052, .010, 12, 40);
      mesh(buttonRim, red, -.026, 1.418, .631);
      // A shallow domed cap gives the red push surface a curved highlight.
      const crown = new THREE.CylinderGeometry(1, 1, 1, 32, 8, true);
      const vertices = crown.attributes.position;
      const normals = crown.attributes.normal;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const z = vertices.getZ(i);
        const angle = (vertices.getY(i) + .5) * Math.PI / 2;
        const ring = Math.cos(angle);
        const rise = Math.sin(angle);
        vertices.setXYZ(i, .052 * ring * x, .014 * rise, .052 * ring * z);
        const ny = rise * (.052 / .014);
        const length = Math.hypot(ring, ny);
        normals.setXYZ(i, ring * x / length, ny / length, ring * z / length);
      }
      mesh(crown, red, -.026, 1.418, .634).rotation.x = Math.PI / 2;

      // Removable side plate, fasteners and lifting eyes on the lid.
      box(.013, 3.093, .937, .006, enamel, .72, 1.745, -.014);
      for (const z of [-.444, .425]) {
        for (const y of [.234, 1.201, 2.32, 3.241]) {
          cylinder(.015, .015, .008, silver, .729, y, z, 'x');
          const slot = box(.003, .012, .003, .001, seam, .734, y, z);
          slot.rotation.x = .55;
        }
      }
      for (const x of [-.648, .648]) {
        for (const y of [.05, .128]) cylinder(.013, .013, .006, silver, x, y, .492, 'z');
      }
      for (const x of [-.545, .545]) {
        cylinder(.073, .084, .029, graphite, x, 3.346, .304);
        cylinder(.06, .072, .043, silver, x, 3.38, .304, 'y', 6);
        cylinder(.034, .043, .032, silver, x, 3.414, .304);
        const ring = mesh(new THREE.TorusGeometry(.051, .012, 12, 40), silver, x, 3.474, .304);
        ring.rotation.y = .25;
      }
    }

    function buildStudio() {
      // A small studio panorama and its mipmaps supply the strip reflections.
      // The room stays invisible and needs no cube map conversion render pass.
      const reflection = paintedTexture(256, 128, ctx => {
        const backdrop = ctx.createLinearGradient(0, 0, 0, 128);
        backdrop.addColorStop(0, '#b5b9b8');
        backdrop.addColorStop(.34, '#68706e');
        backdrop.addColorStop(.52, '#323638');
        backdrop.addColorStop(.64, '#5e6666');
        backdrop.addColorStop(1, '#989d98');
        ctx.fillStyle = backdrop;
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#f9faf7';
        ctx.fillRect(38, 20, 48, 53);
        ctx.fillRect(183, 12, 17, 62);
        ctx.fillStyle = '#c7d2d6';
        ctx.fillRect(111, 27, 10, 39);
        ctx.fillStyle = '#282d2f';
        ctx.fillRect(92, 29, 14, 60);
      });
      for (const surface of resources) {
        if (!surface.isMeshStandardMaterial) continue;
        surface.onBeforeCompile = shader => {
          shader.uniforms.studioReflection = {value: reflection};
          shader.fragmentShader = 'uniform sampler2D studioReflection;\n' +
            shader.fragmentShader.replace('#include <opaque_fragment>', `
              vec3 reflected = inverseTransformDirection(reflect(-geometryViewDir, normal), viewMatrix);
              vec2 studioUV = vec2(atan(reflected.z, reflected.x) * .159155 + .5,
                                   asin(clamp(reflected.y, -1.0, 1.0)) * .31831 + .5);
              vec3 softbox = textureLod(studioReflection, studioUV, roughnessFactor * 5.5).rgb;
              float viewCosine = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
              vec3 f0 = mix(vec3(.04), diffuseColor.rgb, metalnessFactor);
              vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - viewCosine, 5.0) * (1.0 - roughnessFactor);
              outgoingLight += softbox * fresnel * .96;
              #include <opaque_fragment>`);
        };
      }
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe7e9e5, 1.60));
      function softbox(color, intensity, x, y, z) {
        const lamp = new THREE.DirectionalLight(color, intensity);
        lamp.position.set(x, y, z);
        scene.add(lamp);
      }
      softbox(0xfffcf8, 2.35, -3, 7, 5);
      softbox(0xe9efff, .85, 4, 4, -4);
      softbox(0xffffff, .36, 5, 1, 2);
      const shadow = paintedTexture(192, 192, ctx => {
        const fade = ctx.createRadialGradient(96, 96, 28, 96, 96, 94);
        fade.addColorStop(0, 'rgba(28,43,40,.43)');
        fade.addColorStop(.46, 'rgba(28,43,40,.24)');
        fade.addColorStop(1, 'rgba(28,43,40,0)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, 192, 192);
      });
      const ground = mesh(new THREE.PlaneGeometry(2.85, 2.12), own(new THREE.MeshBasicMaterial({
        map: shadow, transparent: true, depthWrite: false
      })), .06, -.012, -.025);
      ground.rotation.x = -Math.PI / 2;
    }

    function resize() {
      if (lost || disposed) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      try {
        renderer.setSize(width, height, false);
        const aspect = width / height;
        const frameHeight = Math.max(4.24, 2.53 / aspect);
        camera.top = frameHeight / 2;
        camera.bottom = -camera.top;
        camera.right = camera.top * aspect;
        camera.left = -camera.right;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        canvas.dataset.ready = 'true';
        const projectCorner = (x, y) => {
          const point = displayGlass.position.clone().set(x, y, 0);
          displayGlass.localToWorld(point).project(camera);
          return [(point.x + 1) * width / 2, (1 - point.y) * height / 2];
        };
        const right = displayWidth / 2;
        const top = displayHeight / 2;
        canvas.dispatchEvent(new CustomEvent('machine-screen-layout', {detail: {
          tl: projectCorner(-right, top),
          tr: projectCorner(right, top),
          bl: projectCorner(-right, -top)
        }}));
      } catch {
        dispose();
      }
    }
    function contextLost(event) {
      event.preventDefault();
      lost = true;
      canvas.dataset.ready = 'false';
    }
    function contextRestored() {
      lost = false;
      resize();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      canvas.dataset.ready = 'false';
      for (const resource of resources) resource.dispose();
      resources.clear();
      renderer?.dispose();
    }
    try {
      renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0, 0);
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 30);
      camera.position.set(5.5, 3.57, 5.5);
      camera.lookAt(0, 1.74, 0);
      buildCabinet();
      buildStudio();
      canvas.addEventListener('webglcontextlost', contextLost);
      canvas.addEventListener('webglcontextrestored', contextRestored);
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();
    } catch {
      dispose();
      return null;
    }
    return disposed ? null : {resize, dispose};
  }

  window.FarmMachineModel = {mount};
})();
