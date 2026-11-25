// Build replaces this placeholder with an embedded local texture. A data URL
// allows the same sphere renderer to work in both file previews and the site.
(() => {
  const textureUrl = '__EARTH_TEXTURE_DATA__';
  const root = document.querySelector('[data-v4-home]');
  const globe = root?.querySelector('.v4-scene-earth');
  if (!(root instanceof HTMLElement) || !(globe instanceof HTMLElement)) return;
  const home = root;
  const earth = globe;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let rotation = 0.8;
  let dispose = () => {};

  const initialize = () => {
    dispose();
    home.dataset.earthRenderer = 'loading';
    const canvas = document.createElement('canvas');
    canvas.className = 'v4-earth-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    earth.append(canvas);
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power'
    });
    if (!gl) {
      canvas.remove();
      home.dataset.earthRenderer = 'fallback';
      return;
    }

    let disposed = false;
    let frame = 0;
    let previousTime = 0;
    let lastDraw = 0;
    let loaded = false;
    let hasDrawn = false;
    /** @type {WebGLShader[]} */
    const shaders = [];
    /** @type {WebGLProgram | null} */
    let program = null;
    /** @type {WebGLBuffer | null} */
    let buffer = null;
    /** @type {WebGLTexture | null} */
    let texture = null;
    const image = new window.Image();

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      lastDraw = 0;
    };
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      motionObserver.disconnect();
      preference.removeEventListener('change', syncMotion);
      canvas.removeEventListener('webglcontextlost', contextLost);
      image.onload = null;
      image.onerror = null;
      if (!gl.isContextLost()) {
        if (texture) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach(shader => gl.deleteShader(shader));
      }
      canvas.remove();
    };
    const fallback = () => {
      home.dataset.earthRenderer = 'fallback';
      cleanup();
    };
    /** @param {Event} event */
    function contextLost(event) {
      event.preventDefault();
      fallback();
    }

    /** @param {number} kind @param {string} source */
    const compile = (kind, source) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error('Earth shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Earth shader compilation failed');
      return shader;
    };

    /** @type {WebGLUniformLocation | null} */
    let rotationLocation = null;
    /** @type {WebGLUniformLocation | null} */
    let featherLocation = null;
    const draw = () => {
      if (disposed || !loaded || !program || gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(rotationLocation, rotation);
      gl.uniform1f(featherLocation, 2 / Math.max(canvas.width, 1));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.rotation = rotation.toFixed(6);
      if (!hasDrawn) {
        // Keep the CSS fallback visible until the first texture-backed frame.
        if (gl.getError() !== gl.NO_ERROR) { fallback(); return; }
        hasDrawn = true;
        home.dataset.earthRenderer = 'ready';
      }
    };
    const resize = () => {
      if (disposed) return;
      const bounds = earth.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 600 ? 1.25 : 1.5);
      const size = Math.min(1024, Math.max(1, Math.round(bounds.width * pixelRatio)));
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      draw();
    };
    const running = () => home.dataset.heroMotion === 'running' && !preference.matches && !document.hidden;
    /** @param {number} time */
    const tick = time => {
      frame = 0;
      if (disposed || !running()) { stop(); return; }
      if (!previousTime) previousTime = time;
      const elapsed = Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;
      // A full turn takes 100 seconds. Longitude moves across the spherical
      // surface; this is not a rotating flat disc or scrolling circle image.
      rotation = (rotation + elapsed * Math.PI * 2 / 100) % (Math.PI * 2);
      if (time - lastDraw >= 1000 / 24) {
        draw();
        lastDraw = time;
      }
      if (!disposed) frame = window.requestAnimationFrame(tick);
    };
    function syncMotion() {
      if (disposed || !loaded) return;
      if (running()) {
        if (!frame) frame = window.requestAnimationFrame(tick);
      } else {
        stop();
        draw();
      }
    }
    const motionObserver = new window.MutationObserver(syncMotion);
    const resizeObserver = 'ResizeObserver' in window ? new window.ResizeObserver(resize) : null;
    dispose = cleanup;
    motionObserver.observe(home, { attributes: true, attributeFilter: ['data-hero-motion'] });
    resizeObserver?.observe(earth);
    preference.addEventListener('change', syncMotion);
    canvas.addEventListener('webglcontextlost', contextLost);

    try {
      const vertex = compile(gl.VERTEX_SHADER, `
        attribute vec2 aPosition;
        varying vec2 vPosition;
        void main() {
          vPosition = aPosition;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `);
      const fragment = compile(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 vPosition;
        uniform sampler2D uTexture;
        uniform float uRotation;
        uniform float uFeather;
        const float PI = 3.14159265359;
        void main() {
          float radius = length(vPosition);
          if (radius >= 1.0) discard;
          vec3 normal = vec3(vPosition, sqrt(max(0.0, 1.0 - dot(vPosition, vPosition))));
          float longitude = atan(normal.x, normal.z) + uRotation;
          float latitude = asin(clamp(normal.y, -1.0, 1.0));
          vec2 uv = vec2(fract(longitude / (2.0 * PI) + 0.5), latitude / PI + 0.5);
          vec3 surface = texture2D(uTexture, uv).rgb;
          vec3 light = normalize(vec3(-0.55, 0.65, 0.9));
          float diffuse = max(dot(normal, light), 0.0);
          float rim = pow(1.0 - normal.z, 2.0);
          vec3 color = surface * (0.30 + 0.85 * diffuse) * (1.0 - rim * 0.50);
          float alpha = 1.0 - smoothstep(1.0 - uFeather, 1.0, radius);
          gl_FragColor = vec4(color, alpha);
        }
      `);
      program = gl.createProgram();
      if (!program) throw new Error('Earth program unavailable');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Earth program linking failed');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Earth vertex buffer unavailable');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      rotationLocation = gl.getUniformLocation(program, 'uRotation');
      featherLocation = gl.getUniformLocation(program, 'uFeather');
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
      image.onload = () => {
        if (disposed) return;
        try {
          texture = gl.createTexture();
          if (!texture) throw new Error('Earth texture unavailable');
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          loaded = true;
          resize();
          syncMotion();
        } catch { fallback(); }
      };
      image.onerror = fallback;
      image.src = textureUrl;
    } catch { fallback(); }
  };

  window.addEventListener('pagehide', () => dispose());
  window.addEventListener('pageshow', event => { if (event.persisted) initialize(); });
  initialize();
})();
