/* b3-world.js - Ink Wash Cinematic - parallax world layers
 *
 * Interface (PARTS_API.md):
 *   drawWorldLayers(ctx, t, cameraOffset[, variant])
 *     ctx          - 2D context of maskA or maskB (1080x1920)
 *     t            - timeline seconds, 0..60
 *     cameraOffset - number (horizontal pan) OR {x, y} pan/tilt in pixels
 *     variant      - optional 0|1. Omitted: inferred from t (1 when t >= 35).
 *                    Lantern (red channel) only draws for variant 1 at t >= 34.
 *
 * Ink layers paint the GREEN channel: rgba(0, g, 0, a).
 * Lantern paints the RED channel:   rgba(r, 0, 0, a).
 * Caller owns canvas clear. This function never clears.
 *
 * Example calls:
 *   drawWorldLayers(maskBCtx, 12.5, -80);          // scalar pan, lantern off
 *   drawWorldLayers(maskBCtx, 41.0, {x: -120, y: 40}); // lantern on (inferred)
 *   drawWorldLayers(maskBCtx, 41.0, cam, 1);       // explicit variant 1
 *   drawWorldLayers(maskACtx, 41.0, cam, 0);       // no red accent
 */

var B3_W = 1080;
var B3_H = 1920;
var B3_TAU = Math.PI * 2;

/* Deterministic hash. Same i/seed -> same value. No Math.random. */
function b3Rand(i, seed) {
  var v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453123;
  return v - Math.floor(v);
}

function b3Clamp01(v) {
  return v < 0 ? 0 : (v > 1 ? 1 : v);
}

function b3Ink(g, a) {
  return 'rgba(0,' + (g | 0) + ',0,' + b3Clamp01(a).toFixed(3) + ')';
}

function b3Red(r, a) {
  return 'rgba(' + (r | 0) + ',0,0,' + b3Clamp01(a).toFixed(3) + ')';
}

function b3Cam(cameraOffset) {
  if (cameraOffset && typeof cameraOffset === 'object') {
    return { x: Number(cameraOffset.x) || 0, y: Number(cameraOffset.y) || 0 };
  }
  return { x: Number(cameraOffset) || 0, y: 0 };
}

/* ------------------------------------------------------------------ */
/* Sun disc: soft ink glow, behind every other layer.                  */
/* ------------------------------------------------------------------ */
function b3Sun(ctx, t, cam) {
  var sx = B3_W * 0.70 + cam.x * 0.04;
  var sy = B3_H * 0.17 + cam.y * 0.04;
  var pulse = 1 + 0.02 * Math.sin(t * 0.5);
  var r = 300 * pulse;

  ctx.save();
  var glow = ctx.createRadialGradient(sx, sy, 18, sx, sy, r);
  glow.addColorStop(0, b3Ink(150, 0.18));
  glow.addColorStop(0.22, b3Ink(140, 0.12));
  glow.addColorStop(0.60, b3Ink(120, 0.05));
  glow.addColorStop(1, b3Ink(100, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, B3_TAU);
  ctx.fill();

  ctx.strokeStyle = b3Ink(160, 0.14);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.30, 0, B3_TAU);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Far mountains: three wash ridges, slow drift, faint parallax.       */
/* ------------------------------------------------------------------ */
function b3Ridge(ctx, baseY, amp, seed, alpha) {
  var n = 10;
  var dx = (B3_W + 600) / n;
  var prevX = -300;
  var prevY = baseY - b3Rand(0, seed) * amp * 0.30;

  ctx.beginPath();
  ctx.moveTo(-300, B3_H + 200);
  ctx.lineTo(-300, baseY);

  for (var i = 1; i <= n; i++) {
    var x = -300 + i * dx;
    var peak = baseY - (0.25 + b3Rand(i, seed) * 0.75) * amp;
    ctx.quadraticCurveTo(prevX + dx * 0.5, prevY - amp * 0.22, x, peak);
    prevX = x;
    prevY = peak;
  }

  ctx.lineTo(B3_W + 300, B3_H + 200);
  ctx.closePath();
  ctx.fillStyle = b3Ink(120, alpha);
  ctx.fill();

  ctx.strokeStyle = b3Ink(150, alpha * 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function b3Mountains(ctx, t, cam) {
  var drift = Math.sin(t * 0.09) * 26 - t * 1.6;
  var layers = [
    { y: B3_H * 0.30, amp: 210, a: 0.10, seed: 1, f: 0.06 },
    { y: B3_H * 0.39, amp: 165, a: 0.13, seed: 5, f: 0.10 },
    { y: B3_H * 0.48, amp: 120, a: 0.16, seed: 9, f: 0.15 }
  ];

  for (var i = 0; i < layers.length; i++) {
    var L = layers[i];
    ctx.save();
    ctx.translate(cam.x * L.f + drift * L.f * 4, cam.y * L.f * 0.4);
    b3Ridge(ctx, L.y, L.amp, L.seed, L.a);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Mist: drifting soft bands. Drawn twice (far and near).              */
/* ------------------------------------------------------------------ */
function b3MistBand(ctx, y, h, alpha, drift) {
  var g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, b3Ink(95, 0));
  g.addColorStop(0.45, b3Ink(95, alpha));
  g.addColorStop(0.55, b3Ink(95, alpha));
  g.addColorStop(1, b3Ink(95, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-300 + drift, y - h / 2, B3_W + 600, h);
}

function b3Mist(ctx, t, cam, near) {
  var speed = near ? 15 : 7;
  var drift = ((t * speed) % 260) - 130;
  var bands = near
    ? [{ y: B3_H * 0.64, h: 230, a: 0.09 }, { y: B3_H * 0.79, h: 300, a: 0.07 }]
    : [{ y: B3_H * 0.42, h: 280, a: 0.07 }, { y: B3_H * 0.52, h: 220, a: 0.05 }];
  var factor = near ? 0.45 : 0.20;

  ctx.save();
  ctx.translate(cam.x * factor, cam.y * factor);
  for (var i = 0; i < bands.length; i++) {
    b3MistBand(ctx, bands[i].y, bands[i].h, bands[i].a, drift * (near ? 1.4 : 1));
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Mid bamboo: segmented stalks, nodes, leaves. Wind sway on plants.   */
/* ------------------------------------------------------------------ */
function b3Bamboo(ctx, t, cam) {
  var count = 16;

  for (var i = 0; i < count; i++) {
    var bx = -80 + b3Rand(i, 21) * (B3_W + 160);
    var baseY = B3_H * 0.92 + b3Rand(i, 22) * B3_H * 0.08;
    var depth = 0.55 + b3Rand(i, 23) * 0.45;
    var h = B3_H * (0.38 + b3Rand(i, 24) * 0.30) * depth;
    var w = (7 + b3Rand(i, 25) * 8) * depth;
    var segs = 7 + Math.floor(b3Rand(i, 26) * 4);
    var sway = Math.sin(t * (0.9 + depth * 0.5) + i * 0.7) * 0.035 * (0.6 + depth);
    var alpha = 0.18 + depth * 0.22;
    var factor = 0.30 + depth * 0.12;

    ctx.save();
    ctx.translate(bx + cam.x * factor, baseY + cam.y * factor);
    ctx.rotate(sway);

    var segLen = h / segs;
    for (var s = 0; s < segs; s++) {
      var y0 = -s * segLen;
      var y1 = y0 - segLen;
      ctx.strokeStyle = b3Ink(145, alpha);
      ctx.lineWidth = Math.max(1.4, w * (1 - s / (segs + 2)));
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(0, y1);
      ctx.stroke();

      ctx.strokeStyle = b3Ink(165, alpha * 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, y1);
      ctx.lineTo(w * 0.55, y1);
      ctx.stroke();
    }

    for (var k = 0; k < 5; k++) {
      var ly = -h * (0.58 + k * 0.085);
      var len = (70 + b3Rand(i * 9 + k, 27) * 90) * depth;
      for (var side = -1; side <= 1; side += 2) {
        ctx.strokeStyle = b3Ink(150, 0.12 + depth * 0.18);
        ctx.lineWidth = Math.max(1.2, 2.4 * depth);
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.quadraticCurveTo(side * len * 0.5, ly - len * 0.12, side * len, ly - len * 0.34);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

/* Reeds near water: smaller, faster wind sway. */
function b3Reeds(ctx, t, cam) {
  for (var i = 0; i < 22; i++) {
    var x = b3Rand(i, 31) * B3_W;
    var base = B3_H * (0.88 + b3Rand(i, 32) * 0.10);
    var len = 90 + b3Rand(i, 33) * 170;
    var sway = Math.sin(t * 1.6 + i * 0.9) * 0.09;
    ctx.save();
    ctx.translate(x + cam.x * 0.62, base + cam.y * 0.62);
    ctx.rotate(sway);
    ctx.strokeStyle = b3Ink(135, 0.16 + b3Rand(i, 34) * 0.14);
    ctx.lineWidth = 2 + b3Rand(i, 35) * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -len * 0.5, 18, -len);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Water: horizontal wash strokes + expanding ripple rings. Faster.    */
/* ------------------------------------------------------------------ */
function b3Water(ctx, t, cam) {
  ctx.save();
  ctx.translate(cam.x * 0.70, cam.y * 0.75);

  var top = B3_H * 0.60;
  for (var i = 0; i < 16; i++) {
    var y = top + b3Rand(i, 41) * B3_H * 0.34;
    var x = b3Rand(i, 42) * B3_W;
    var len = 60 + b3Rand(i, 43) * 260;
    var a = 0.10 + b3Rand(i, 44) * 0.16;
    ctx.strokeStyle = b3Ink(130, a);
    ctx.lineWidth = 1.5 + b3Rand(i, 45) * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.5, y - 6, x + len, y);
    ctx.stroke();
  }

  for (var r = 0; r < 14; r++) {
    var rx = b3Rand(r, 51) * B3_W;
    var ry = top + 40 + b3Rand(r, 52) * B3_H * 0.30;
    var phase = (t * 0.32 + b3Rand(r, 53)) % 1;
    var rad = 14 + phase * 95;
    ctx.strokeStyle = b3Ink(150, (1 - phase) * 0.28);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rad, rad * 0.22, 0, 0, B3_TAU);
    ctx.stroke();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Rain: deterministic particles, wrapping vertically.                 */
/* ------------------------------------------------------------------ */
function b3Rain(ctx, t, cam) {
  var span = B3_H + 300;
  ctx.save();
  ctx.translate(cam.x * 0.55, cam.y * 0.55);
  ctx.lineCap = 'round';

  for (var i = 0; i < 120; i++) {
    var bx = b3Rand(i, 61) * (B3_W + 120) - 60;
    var by = b3Rand(i, 62) * span;
    var speed = 380 + b3Rand(i, 63) * 420;
    var y = ((by + t * speed) % span) - 150;
    var x = bx + Math.sin(t * 0.8 + i) * 8;
    var len = 16 + b3Rand(i, 64) * 22;
    var alpha = 0.10 + b3Rand(i, 65) * 0.16;
    ctx.strokeStyle = b3Ink(120, alpha);
    ctx.lineWidth = 1 + b3Rand(i, 66) * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.30, y + len);
    ctx.stroke();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Lantern: red channel only. Flicker is deterministic from t.         */
/* ------------------------------------------------------------------ */
function b3Lantern(ctx, t, cam) {
  var lx = B3_W * 0.52 + cam.x * 0.92;
  var ly = B3_H * 0.33 + cam.y * 0.92;
  var flick = 0.82 + 0.12 * Math.sin(t * 8.7) + 0.06 * Math.sin(t * 21.3 + 1.1);
  var R = 230 * (0.92 + flick * 0.12);

  ctx.save();
  var glow = ctx.createRadialGradient(lx, ly, 6, lx, ly, R);
  glow.addColorStop(0, b3Red(235, 0.34 * flick));
  glow.addColorStop(0.18, b3Red(220, 0.18 * flick));
  glow.addColorStop(0.55, b3Red(190, 0.06 * flick));
  glow.addColorStop(1, b3Red(160, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lx, ly, R, 0, B3_TAU);
  ctx.fill();

  ctx.fillStyle = b3Red(240, 0.78 * flick);
  ctx.beginPath();
  ctx.ellipse(lx, ly, 18, 26, 0, 0, B3_TAU);
  ctx.fill();

  ctx.strokeStyle = b3Red(250, 0.55 * flick);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx, ly - 26);
  ctx.lineTo(lx, ly - 44);
  ctx.stroke();

  ctx.strokeStyle = b3Red(210, 0.30 * flick);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(lx, ly, 34, 0, B3_TAU);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Public entry point. Back-to-front draw order.                       */
/* ------------------------------------------------------------------ */
function drawWorldLayers(ctx, t, cameraOffset, variant) {
  if (!ctx) return;

  var time = Number(t) || 0;
  var cam = b3Cam(cameraOffset);
  var mode = (typeof variant === 'number') ? variant : (time >= 35 ? 1 : 0);

  ctx.save();
  b3Sun(ctx, time, cam);
  b3Mountains(ctx, time, cam);
  b3Mist(ctx, time, cam, false);
  b3Bamboo(ctx, time, cam);
  b3Reeds(ctx, time, cam);
  b3Water(ctx, time, cam);
  b3Mist(ctx, time, cam, true);
  b3Rain(ctx, time, cam);
  if (mode === 1 && time >= 34) b3Lantern(ctx, time, cam);
  ctx.restore();
}
