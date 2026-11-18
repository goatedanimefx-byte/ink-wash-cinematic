// B5 Master timeline - Ink Wash Cinematic (enhanced)
// Global function: timeline(t) -> { cameraOffset, transition, monkPose, monkX, captionIndex, cameraZoom, cameraTilt }
// Deterministic for t in [0, 60]. No external dependencies. No audio.

function _b5clamp(v, lo, hi) {
  if (!isFinite(v)) v = 0;
  return Math.max(lo, Math.min(hi, v));
}

function _b5smoothstep(a, b, x) {
  const t = _b5clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function _b5lerp(a, b, t) {
  return a + (b - a) * t;
}

// Keyframes: t, cameraX (px), cameraY (px), zoom (scale), tilt (deg-ish).
const B5_KEYS = [
  { t: 0,  x: -160, y: -20, zoom: 1.00, tilt: -6 },
  { t: 10, x: -90,  y:  22, zoom: 1.02, tilt:  6 },
  { t: 25, x:  60,  y: -12, zoom: 1.04, tilt: -3 },
  { t: 35, x: -110, y:  72, zoom: 1.05, tilt: 12 },
  { t: 45, x: 130,  y: -52, zoom: 1.09, tilt: -9 },
  { t: 55, x: 170,  y: -28, zoom: 1.17, tilt: -3 },
  { t: 60, x: 150,  y: -16, zoom: 1.19, tilt: -2 }
];

function _b5keyAt(t) {
  if (t <= B5_KEYS[0].t) {
    const k = B5_KEYS[0];
    return { x: k.x, y: k.y, zoom: k.zoom, tilt: k.tilt };
  }
  const last = B5_KEYS[B5_KEYS.length - 1];
  if (t >= last.t) {
    return { x: last.x, y: last.y, zoom: last.zoom, tilt: last.tilt };
  }
  for (let i = 0; i < B5_KEYS.length - 1; i++) {
    const a = B5_KEYS[i];
    const b = B5_KEYS[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = _b5smoothstep(a.t, b.t, t);
      return {
        x: _b5lerp(a.x, b.x, u),
        y: _b5lerp(a.y, b.y, u),
        zoom: _b5lerp(a.zoom, b.zoom, u),
        tilt: _b5lerp(a.tilt, b.tilt, u)
      };
    }
  }
  return { x: last.x, y: last.y, zoom: last.zoom, tilt: last.tilt };
}

function timeline(t) {
  const T = _b5clamp(typeof t === 'number' ? t : 0, 0, 60);

  const base = _b5keyAt(T);
  let camX = base.x;
  let camY = base.y;

  // Wind sway during bamboo forest (10-25 s).
  if (T >= 10 && T <= 25) {
    const w = (T - 10) / 15;
    camX += Math.sin(T * 1.7) * (6 + 4 * w);
    camY += Math.sin(T * 2.3 + 1.1) * 3;
  }
  // Water ripple at stream crossing (25-35 s).
  if (T >= 25 && T <= 35) {
    camY += Math.sin(T * 3.1) * 4;
  }

  camX = _b5clamp(camX, -200, 200);
  camY = _b5clamp(camY, -100, 100);

  // Ink-bloom transition reveals red accent at cave.
  const transition = _b5smoothstep(35, 42, T);

  // Monk pose.
  let monkPose = 'walk';
  if (T >= 55) monkPose = 'bowHead';
  else if (T >= 45) monkPose = 'sit';
  else if (T >= 42) monkPose = 'rise';

  // Monk X across screen with easing.
  function monkNorm() {
    if (T < 10) return _b5lerp(0.12, 0.58, _b5smoothstep(0, 10, T));
    if (T < 25) return _b5lerp(0.58, 0.74, _b5smoothstep(10, 25, T));
    if (T < 35) return _b5lerp(0.74, 0.46, _b5smoothstep(25, 35, T));
    if (T < 45) return _b5lerp(0.46, 0.58, _b5smoothstep(35, 45, T));
    return 0.56;
  }
  const monkX = _b5clamp(monkNorm() * 1080, 0, 1080);

  // Caption index (0-6).
  const captionThresholds = [0, 9, 18, 27, 36, 45, 54];
  let captionIndex = 0;
  for (let i = 0; i < captionThresholds.length; i++) {
    if (T >= captionThresholds[i]) captionIndex = i;
  }

  return {
    cameraOffset: { x: camX, y: camY },
    transition: transition,
    monkPose: monkPose,
    monkX: monkX,
    captionIndex: captionIndex,
    cameraZoom: base.zoom,
    cameraTilt: camY
  };
}

// CommonJS / browser global export (supports require() returning the function).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = timeline;
  module.exports.timeline = timeline;
} else if (typeof window !== 'undefined') {
  window.timeline = timeline;
} else if (typeof globalThis !== 'undefined') {
  globalThis.timeline = timeline;
}
