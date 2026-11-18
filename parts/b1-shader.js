// B1 Shader engine - Ink Wash Cinematic
// Global functions: initShader, renderFrame, createMaskCanvases

const B1_W = 1080;
const B1_H = 1920;

let _b1gl = null;
let _b1program = null;
let _b1uniforms = null;
let _b1vao = null;
let _b1texA = null;
let _b1texB = null;
let _b1maskA = null;
let _b1maskB = null;
let _b1ctxA = null;
let _b1ctxB = null;
let _b1fallbackMode = false;

function _b1compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile error: ' + log);
  }
  return sh;
}

const B1_VS = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const B1_FS = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_cameraOffset;
uniform sampler2D u_maskA;
uniform sampler2D u_maskB;
uniform float u_transition;
in vec2 v_uv;
out vec4 fragColor;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.52;
  mat2 m = mat2(0.866, 0.5, -0.5, 0.866);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p * 2.03;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = v_uv;
  vec2 px = 1.0 / u_resolution;

  float trans = clamp(u_transition, 0.0, 1.0);
  float radius = trans * 1.32;
  float radial = length(uv - vec2(0.5));
  float newVisible = smoothstep(radius + 0.10, radius - 0.10, radial);
  float boundary = exp(-abs(radial - radius) * 12.0);

  float t = u_time;
  vec2 q = uv * 3.2 + u_cameraOffset * 0.35;
  float n1 = fbm(q + vec2(t * 0.035, -t * 0.021));
  float n2 = fbm(q + vec2(-t * 0.017, t * 0.029) + 17.0);
  vec2 warped = uv + (vec2(n1, n2) - 0.5) * 0.055;
  warped = clamp(warped, px, 1.0 - px);

  float inkA = texture(u_maskA, warped).g;
  float inkB = texture(u_maskB, warped).g;
  float ink = mix(inkA, inkB, newVisible);
  float redA = texture(u_maskA, warped).r;
  float redB = texture(u_maskB, warped).r;
  float red = mix(redA, redB, newVisible);

  vec2 paperP = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 4.5 + u_cameraOffset;
  float fibre = fbm(paperP * 2.7 + vec2(t * 0.012, -t * 0.009));
  float fibreFine = fbm(paperP * 11.0 - vec2(t * 0.018, t * 0.011));
  float paper = 0.72 + 0.20 * fibre + 0.08 * fibreFine;

  float e = 2.0 / max(u_resolution.x, u_resolution.y);
  float il = texture(u_maskA, clamp(warped + vec2(-e, 0.0), px, 1.0 - px)).g;
  float ir = texture(u_maskA, clamp(warped + vec2(e, 0.0), px, 1.0 - px)).g;
  float it = texture(u_maskA, clamp(warped + vec2(0.0, -e), px, 1.0 - px)).g;
  float ib = texture(u_maskA, clamp(warped + vec2(0.0, e), px, 1.0 - px)).g;
  float grad = length(vec2(ir - il, ib - it));
  float pool = smoothstep(0.06, 0.32, grad) * smoothstep(0.05, 0.55, ink);

  float streak = fbm(vec2(paperP.x * 1.3, paperP.y * 14.0) + vec2(t * 0.04, -t * 0.02));
  float brush = smoothstep(0.60, 0.86, streak) * ink;

  vec3 paperColor = vec3(0.90, 0.84, 0.76) * paper;
  vec3 inkColor = vec3(0.07, 0.08, 0.11);

  float inkAlpha = smoothstep(0.03, 0.42, ink + boundary * 0.18);
  vec3 col = mix(paperColor, inkColor, inkAlpha);
  col = mix(col, inkColor * 0.55, pool * 0.55);
  col = mix(col, inkColor * 0.72, brush * 0.30);

  float mist = fbm(paperP * 0.85 + vec2(t * 0.018, t * 0.012));
  mist = smoothstep(0.45, 0.82, mist);
  float mistAmt = mist * (0.34 - 0.18 * inkAlpha);
  col = mix(col, vec3(0.88, 0.90, 0.93), mistAmt);

  float redGlow = red * smoothstep(0.05, 0.75, red);
  col += vec3(0.78, 0.10, 0.06) * redGlow * 0.75;
  col += vec3(1.0, 0.34, 0.22) * pow(redGlow, 1.8) * 0.95;

  float vig = smoothstep(1.18, 0.30, length(uv - vec2(0.5)) * 1.35);
  col *= vig;

  float grain = (hash21(gl_FragCoord.xy + fract(t * 37.0) * 1000.0) - 0.5) * 0.09;
  col += grain;

  col = clamp(col, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}`;

function _b1fallback(message) {
  if (typeof document === 'undefined') return;
  const glCanvas = document.getElementById('gl');
  if (!glCanvas) return;
  const c = document.createElement('canvas');
  c.width = B1_W; c.height = B1_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe7d8';
  ctx.fillRect(0, 0, B1_W, B1_H);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * B1_W, y = Math.random() * B1_H;
    ctx.fillStyle = 'rgba(90,70,45,' + (Math.random() * 0.08) + ')';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = '#2b2118';
  ctx.font = 'bold 52px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('WebGL2 unavailable', B1_W / 2, B1_H / 2 - 40);
  ctx.font = '30px Georgia';
  ctx.fillText(message || 'This browser does not support WebGL2.', B1_W / 2, B1_H / 2 + 30);
  ctx.fillText('Ink-wash shader engine cannot run.', B1_W / 2, B1_H / 2 + 80);
  if (glCanvas.parentNode) glCanvas.parentNode.replaceChild(c, glCanvas);
  const s = document.getElementById('status');
  if (s) s.textContent = 'webgl2 fallback';
}

function initShader() {
  if (typeof document === 'undefined') {
    return { gl: null, program: null, uniforms: null };
  }
  const glCanvas = document.getElementById('gl');
  if (!glCanvas) {
    return { gl: null, program: null, uniforms: null };
  }
  const gl = glCanvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) {
    _b1fallback('WebGL2 context could not be created.');
    _b1fallbackMode = true;
    return { gl: null, program: null, uniforms: null };
  }

  let program;
  try {
    const vs = _b1compile(gl, gl.VERTEX_SHADER, B1_VS);
    const fs = _b1compile(gl, gl.FRAGMENT_SHADER, B1_FS);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  } catch (err) {
    _b1fallback(err.message);
    console.error(err);
    _b1fallbackMode = true;
    return { gl: null, program: null, uniforms: null };
  }

  gl.useProgram(program);

  const aPos = gl.getAttribLocation(program, 'a_position');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  function makeTex() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  const texA = makeTex();
  const texB = makeTex();

  const uniforms = {
    u_time: gl.getUniformLocation(program, 'u_time'),
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_cameraOffset: gl.getUniformLocation(program, 'u_cameraOffset'),
    u_maskA: gl.getUniformLocation(program, 'u_maskA'),
    u_maskB: gl.getUniformLocation(program, 'u_maskB'),
    u_transition: gl.getUniformLocation(program, 'u_transition')
  };

  _b1gl = gl;
  _b1program = program;
  _b1uniforms = uniforms;
  _b1vao = vao;
  _b1texA = texA;
  _b1texB = texB;

  return { gl: gl, program: program, uniforms: uniforms };
}

function createMaskCanvases() {
  if (typeof document === 'undefined') {
    return { maskA: null, maskB: null, ctxA: null, ctxB: null };
  }
  const maskA = document.createElement('canvas');
  const maskB = document.createElement('canvas');
  maskA.width = maskB.width = B1_W;
  maskA.height = maskB.height = B1_H;
  maskA.id = 'maskA';
  maskB.id = 'maskB';
  maskA.style.display = 'none';
  maskB.style.display = 'none';
  const ctxA = maskA.getContext('2d');
  const ctxB = maskB.getContext('2d');
  if (document.body) {
    document.body.appendChild(maskA);
    document.body.appendChild(maskB);
  }
  _b1maskA = maskA;
  _b1maskB = maskB;
  _b1ctxA = ctxA;
  _b1ctxB = ctxB;
  return { maskA: maskA, maskB: maskB, ctxA: ctxA, ctxB: ctxB };
}

function renderFrame(t, cameraOffset, transition) {
  if (_b1fallbackMode === true || !_b1gl || !_b1program) return;
  const gl = _b1gl;
  if (_b1maskA && _b1maskB) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, _b1texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _b1maskA);
    gl.bindTexture(gl.TEXTURE_2D, _b1texB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _b1maskB);
  }

  let cx = 0, cy = 0;
  if (typeof cameraOffset === 'number') {
    cx = cameraOffset;
  } else if (Array.isArray(cameraOffset)) {
    cx = cameraOffset[0] || 0;
    cy = cameraOffset[1] || 0;
  } else if (cameraOffset && typeof cameraOffset === 'object') {
    cx = (cameraOffset.x !== undefined) ? cameraOffset.x : (cameraOffset[0] || 0);
    cy = (cameraOffset.y !== undefined) ? cameraOffset.y : (cameraOffset[1] || 0);
  }

  gl.viewport(0, 0, B1_W, B1_H);
  gl.clearColor(0.02, 0.02, 0.02, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(_b1program);
  gl.uniform1f(_b1uniforms.u_time, t);
  gl.uniform2f(_b1uniforms.u_resolution, B1_W, B1_H);
  gl.uniform2f(_b1uniforms.u_cameraOffset, cx, cy);
  gl.uniform1f(_b1uniforms.u_transition, transition);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, _b1texA);
  gl.uniform1i(_b1uniforms.u_maskA, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, _b1texB);
  gl.uniform1i(_b1uniforms.u_maskB, 1);
  gl.bindVertexArray(_b1vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}