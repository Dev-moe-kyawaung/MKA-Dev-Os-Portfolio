/**
 * MKA-OS WebGL particles — GPU-driven (optimized)
 * - Single interleaved STATIC buffer (no per-frame uploads)
 * - Motion entirely in vertex shader
 * - Adaptive count / DPR for mobile
 * - Pause on hidden tab / reduced motion
 */
(function () {
  var mount = document.getElementById('gl-particles');
  if (!mount) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mount.classList.add('gl-fallback');
    return;
  }

  var mobile = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(canvas);

  var gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  }) || canvas.getContext('experimental-webgl', { alpha: true, depth: false });

  if (!gl) {
    mount.classList.add('gl-fallback');
    return;
  }

  // Adaptive density
  var area = window.innerWidth * window.innerHeight;
  var COUNT = mobile
    ? Math.min(90, Math.floor(area / 14000) + 40)
    : Math.min(140, Math.floor(area / 12000) + 60);
  var DPR = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[particles]', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  /* GPU-only motion — base position + phase; no CPU writes after init */
  var vs = compile(gl.VERTEX_SHADER, [
    'precision mediump float;',
    'attribute vec3 aPos;',
    'attribute float aSize;',
    'attribute float aPhase;',
    'uniform float uTime;',
    'uniform vec2 uRes;',
    'uniform vec2 uPtr;',
    'varying float vA;',
    'void main(){',
    '  float t=uTime*0.12+aPhase;',
    '  /* cheap displacement — 2 sin, 1 cos */',
    '  float sx=sin(t+aPos.y*1.7);',
    '  float cy=cos(t*0.85+aPos.x*1.3);',
    '  vec2 p=aPos.xy+vec2(sx*0.045,cy*0.035);',
    '  /* soft pointer parallax (uniform, no branching) */',
    '  p+=uPtr*0.025*(0.6+aPos.z);',
    '  float z=aPos.z+sx*0.015;',
    '  float depth=0.55+0.45*(z+0.5);',
    '  gl_Position=vec4(p,z*0.08,1.0);',
    '  /* point size capped for fill-rate */',
    '  gl_PointSize=min(aSize*depth*uRes.y*0.0035,18.0);',
    '  vA=0.22+0.5*depth;',
    '}'
  ].join('\n'));

  /* Avoid discard when possible — smooth alpha edge is cheaper on many GPUs */
  var fs = compile(gl.FRAGMENT_SHADER, [
    'precision mediump float;',
    'uniform vec3 uColor;',
    'varying float vA;',
    'void main(){',
    '  vec2 c=gl_PointCoord-0.5;',
    '  float d=dot(c,c)*4.0;', /* 0 at center → 1 at edge of unit circle */
    '  float soft=1.0-smoothstep(0.6,1.0,d);',
    '  float a=vA*soft;',
    '  if(a<0.02) discard;', /* rare; keeps additive clean */
    '  gl_FragColor=vec4(uColor*a,a);',
    '}'
  ].join('\n'));

  if (!vs || !fs) {
    mount.classList.add('gl-fallback');
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    mount.classList.add('gl-fallback');
    return;
  }

  /* Interleaved: pos.xyz | size | phase  → 5 floats/vertex, STATIC */
  var STRIDE = 5;
  var data = new Float32Array(COUNT * STRIDE);
  for (var i = 0; i < COUNT; i++) {
    var o = i * STRIDE;
    data[o] = (Math.random() * 2 - 1) * 0.92;
    data[o + 1] = (Math.random() * 2 - 1) * 0.92;
    data[o + 2] = Math.random() - 0.5;
    data[o + 3] = 2.0 + Math.random() * 3.5;
    data[o + 4] = Math.random() * 6.28318530718;
  }

  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  var aPos = gl.getAttribLocation(prog, 'aPos');
  var aSize = gl.getAttribLocation(prog, 'aSize');
  var aPhase = gl.getAttribLocation(prog, 'aPhase');
  var uTime = gl.getUniformLocation(prog, 'uTime');
  var uRes = gl.getUniformLocation(prog, 'uRes');
  var uPtr = gl.getUniformLocation(prog, 'uPtr');
  var uColor = gl.getUniformLocation(prog, 'uColor');

  function bindAttribs() {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    var bytes = STRIDE * 4;
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bytes, 0);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, bytes, 12);
    gl.enableVertexAttribArray(aPhase);
    gl.vertexAttribPointer(aPhase, 1, gl.FLOAT, false, bytes, 16);
  }

  /* Optional VAO — bind once */
  var vaoExt = gl.getExtension('OES_vertex_array_object');
  var vao = null;
  if (vaoExt) {
    vao = vaoExt.createVertexArrayOES();
    vaoExt.bindVertexArrayOES(vao);
    bindAttribs();
    vaoExt.bindVertexArrayOES(null);
  }

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); /* pre-multiplied additive */
  gl.clearColor(0, 0, 0, 0);

  var ptrX = 0, ptrY = 0, targetX = 0, targetY = 0;
  window.addEventListener('pointermove', function (e) {
    targetX = (e.clientX / window.innerWidth) * 2 - 1;
    targetY = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  var pageVisible = true;
  document.addEventListener('visibilitychange', function () {
    pageVisible = document.visibilityState === 'visible';
  });

  var running = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      running = !!(es[0] && es[0].isIntersecting);
    }, { threshold: 0 }).observe(mount);
  }

  var w = 0, h = 0;
  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    var dw = Math.floor(w * DPR);
    var dh = Math.floor(h * DPR);
    if (canvas.width === dw && canvas.height === dh) return;
    canvas.width = dw;
    canvas.height = dh;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, dw, dh);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  gl.useProgram(prog);
  gl.uniform3f(uColor, 0.45, 0.68, 1.0);

  var t0 = performance.now();
  var last = 0;
  /* ~30fps cap on mobile saves battery; desktop ~60 */
  var minDelta = mobile ? 32 : 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!pageVisible || !running) return;
    if (minDelta && now - last < minDelta) return;
    last = now;

    var t = (now - t0) * 0.001;
    /* smooth pointer (CPU is fine — 2 floats) */
    ptrX += (targetX - ptrX) * 0.06;
    ptrY += (targetY - ptrY) * 0.06;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uPtr, ptrX, ptrY);

    if (vao) vaoExt.bindVertexArrayOES(vao);
    else bindAttribs();

    gl.drawArrays(gl.POINTS, 0, COUNT);

    if (vao) vaoExt.bindVertexArrayOES(null);
  }
  requestAnimationFrame(frame);
})();
