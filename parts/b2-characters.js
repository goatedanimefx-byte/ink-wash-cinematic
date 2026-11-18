// b2-characters.js — articulated ink-brush puppet (B2)
// Draws the pilgrim monk into the mask canvas GREEN channel only:
// every stroke is rgba(0,255,0,alpha). Called from drawMask().

(function (global) {
  'use strict';

  // Tapered ink-brush segment: circle at a, circle at b, widths wa->wb.
  function inkSeg(ctx, ax, ay, bx, by, wa, wb) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) { // dot
      ctx.beginPath();
      ctx.arc(ax, ay, Math.max(wa, 0.5), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    var nx = -dy / len, ny = dx / len; // perpendicular
    var ha = wa / 2, hb = wb / 2;
    ctx.beginPath();
    ctx.moveTo(ax + nx * ha, ay + ny * ha);
    ctx.lineTo(bx + nx * hb, by + ny * hb);
    ctx.arc(bx, by, hb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
    ctx.lineTo(ax - nx * ha, ay - ny * ha);
    ctx.arc(ax, ay, ha, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
    ctx.closePath();
    ctx.fill();
  }

  // One joint: position + limb segment drawn toward child joint.
  function limb(ctx, j0, j1, w0, w1) {
    inkSeg(ctx, j0.x, j0.y, j1.x, j1.y, w0, w1);
  }

  // Build skeleton for pose at time t. Returns joint object.
  function skeleton(x, y, t, pose) {
    // y = ground (foot) level; figure grows upward (negative y).
    var S = { // standing proportions (units, scaled later by caller via x/y)
      hipY: -70, shY: -118, headY: -150,
      thigh: 46, shin: 44, upperArm: 34, foreArm: 30
    };
    var j = {
      hip: { x: x, y: y + S.hipY },
      shoulder: { x: x, y: y + S.shY },
      head: { x: x, y: y + S.headY },
      kneeL: { x: 0, y: 0 }, ankleL: { x: 0, y: 0 },
      kneeR: { x: 0, y: 0 }, ankleR: { x: 0, y: 0 },
      elbowL: { x: 0, y: 0 }, wristL: { x: 0, y: 0 },
      elbowR: { x: 0, y: 0 }, wristR: { x: 0, y: 0 }
    };

    var ph = t * 4.2; // walk cycle phase
    var sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);

    function leg(side, swing, stance) {
      var hip = { x: j.hip.x + side * 10, y: j.hip.y };
      var kneeX = hip.x + swing * 22;
      var kneeY = hip.y + S.thigh - Math.abs(stance) * 8;
      var ankleX = hip.x + swing * 34;
      var ankleY = y;
      if (pose === 'sit' || pose === 'rise') { // folded
        kneeX = hip.x + side * 26; kneeY = hip.y + 22;
        ankleX = hip.x + side * 34; ankleY = y - 6;
      }
      return { hip: hip, knee: { x: kneeX, y: kneeY }, ankle: { x: ankleX, y: ankleY } };
    }
    var L = leg(-1, sw, sw2), R = leg(1, sw2, sw);
    j.kneeL = L.knee; j.ankleL = L.ankle;
    j.kneeR = R.knee; j.ankleR = R.ankle;

    // Arms swing opposite legs.
    function arm(side, swing) {
      var sh = { x: j.shoulder.x + side * 12, y: j.shoulder.y };
      var el = { x: sh.x + swing * 16, y: sh.y + S.upperArm };
      var wr = { x: el.x + swing * 22, y: el.y + S.foreArm };
      if (pose === 'sit' || pose === 'rise') { // hands in lap
        el = { x: sh.x + side * 14, y: sh.y + S.upperArm - 6 };
        wr = { x: j.hip.x + side * 8, y: j.hip.y + 10 };
      }
      if (pose === 'bowHead') { // arms hang, hands low
        el = { x: sh.x + side * 4, y: sh.y + S.upperArm + 4 };
        wr = { x: el.x, y: el.y + S.foreArm + 4 };
      }
      return { shoulder: sh, elbow: el, wrist: wr };
    }
    var AL = arm(-1, -sw), AR = arm(1, -sw2);
    j.elbowL = AL.elbow; j.wristL = AL.wrist;
    j.elbowR = AR.elbow; j.wristR = AR.wrist;

    // Head: bow or breathe.
    var breathe = Math.sin(t * 1.6) * 2;
    if (pose === 'bowHead') j.head.y += 26;
    if (pose === 'idle') j.head.y += breathe;
    if (pose === 'sit' || pose === 'rise') j.head.y += 8;
    j.shoulder.y += (pose === 'idle') ? breathe : 0;
    return j;
  }

  /**
   * drawMonk(ctx, x, y, t, pose)
   * ctx  : 2D context of mask canvas (green channel ink).
   * x,y  : foot-ground anchor.
   * t    : elapsed seconds (drives cycle + breathing).
   * pose : 'walk' | 'idle' | 'sit' | 'rise' | 'bowHead'
   */
  function drawMonk(ctx, x, y, t, pose) {
    if (!ctx) return;
    pose = pose || 'walk';
    var j = skeleton(x, y, t, pose);

    ctx.save();
    ctx.fillStyle = 'rgba(0,255,0,0.92)';
    ctx.strokeStyle = 'rgba(0,255,0,0.92)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var walking = (pose === 'walk');
    var sway = walking ? Math.sin(t * 4.2) * 3 : Math.sin(t * 1.6) * 1.5;

    // Robe torso: hip -> shoulder, wide tapering brush stroke.
    inkSeg(ctx, j.hip.x + sway, j.hip.y, j.shoulder.x + sway * 0.5, j.shoulder.y, 34, 22);
    // Robe skirt flare toward ground.
    inkSeg(ctx, j.hip.x - 8, j.hip.y + 4, j.hip.x - 22 + sway, y - 2, 26, 10);
    inkSeg(ctx, j.hip.x + 8, j.hip.y + 4, j.hip.x + 22 + sway, y - 2, 26, 10);

    // Legs: hip -> knee -> ankle, thinning widths.
    limb(ctx, j.hip, j.kneeL, 18, 12); limb(ctx, j.kneeL, j.ankleL, 12, 7);
    limb(ctx, j.hip, j.kneeR, 18, 12); limb(ctx, j.kneeR, j.ankleR, 12, 7);

    // Arms: shoulder -> elbow -> wrist.
    limb(ctx, j.shoulder, j.elbowL, 14, 10); limb(ctx, j.elbowL, j.wristL, 10, 6);
    limb(ctx, j.shoulder, j.elbowR, 14, 10); limb(ctx, j.elbowR, j.wristR, 10, 6);

    // Head: ink circle + topknot.
    ctx.beginPath();
    ctx.arc(j.head.x + sway * 0.4, j.head.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(j.head.x + sway * 0.4, j.head.y - 14, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Export (module + browser global).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { drawMonk: drawMonk, inkSeg: inkSeg };
  } else {
    global.drawMonk = drawMonk;
    global.inkSeg = inkSeg;
  }
})(typeof window !== 'undefined' ? window : globalThis);

/*
EXAMPLE CALL (from drawMask in b1-shader integration):

  drawMask(ctx, time, variant) {
    ctx.clearRect(0, 0, W, H);
    var p = (time < 10) ? 'walk' : (time < 45) ? 'walk' : 'sit';
    drawMonk(ctx, 540, 1500, time, p);      // green-channel ink mask
    drawMonk(ctx, 540, 1500, time, 'bowHead'); // e.g. cave moment
  }

Node syntax check:  node --check b2-characters.js
*/
