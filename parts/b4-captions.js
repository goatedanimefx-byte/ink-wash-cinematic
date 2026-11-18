/* b4-captions.js - Ink Wash Cinematic - visual captions only
 *
 * Interface (PARTS_API.md):
 *   initCaptions(container) -> HTMLElement[]   creates caption divs
 *   updateCaptions(t)                          fades by timeline (0..60)
 *
 * container: element or element id. Deterministic. No timers.
 * Visual text only. No sound code.
 *
 * Example calls:
 *   var nodes = initCaptions('overlay');   // or initCaptions(document.body)
 *   updateCaptions(12.5);
 *   updateCaptions(t);                     // call once per animation frame
 */

var B4_CAPTIONS = [
  {
    start: 0.8,
    end: 10.2,
    text: 'Stoicism is not the absence of feeling. It is the strength to keep walking when the path disappears, when the ridge falls away and the mist closes around you.'
  },
  {
    start: 10.8,
    end: 20.2,
    text: 'Discipline is the quiet voice that says, one more step. It does not shout. It simply returns your attention to the ground beneath your feet, again and again.'
  },
  {
    start: 20.8,
    end: 29.8,
    text: 'Recovery is the pause that lets the ink settle. Nothing is gained by hurry. The mountain waits. The water finds its level. So must the mind.'
  },
  {
    start: 30.4,
    end: 39.8,
    text: 'Mental strength is the bamboo that bends but does not break. It yields to the wind, then rises. In the stillness, you find the answer that noise could never give.'
  },
  {
    start: 40.4,
    end: 54.4,
    text: 'The lantern does not chase away the dark. It asks you to sit within it. Breath by breath, the small light grows, until the cave and the sky are one.'
  },
  {
    start: 55.0,
    end: 60.5,
    final: true,
    text: 'Master the silence, and you master the world.'
  }
];

var B4_FADE = 1.2;
var B4_NODES = [];

function b4Smooth01(x) {
  var v = x < 0 ? 0 : (x > 1 ? 1 : x);
  return v * v * (3 - 2 * v);
}

function initCaptions(container) {
  var host = (typeof container === 'string')
    ? (typeof document !== 'undefined' ? document.getElementById(container) : null)
    : container;

  B4_NODES = [];
  if (!host || typeof document === 'undefined') return B4_NODES;

  var layer = document.createElement('div');
  layer.className = 'ink-captions';
  layer.setAttribute('aria-live', 'polite');
  var ls = layer.style;
  ls.position = 'absolute';
  ls.top = '0';
  ls.left = '0';
  ls.right = '0';
  ls.bottom = '0';
  ls.pointerEvents = 'none';
  ls.zIndex = '20';

  for (var i = 0; i < B4_CAPTIONS.length; i++) {
    var cap = B4_CAPTIONS[i];
    var node = document.createElement('div');
    node.className = 'ink-caption' + (cap.final ? ' ink-caption-final' : '');
    node.textContent = cap.text;

    var s = node.style;
    s.position = 'absolute';
    s.left = '9%';
    s.right = '9%';
    s.bottom = cap.final ? '19%' : '12%';
    s.textAlign = 'center';
    s.fontFamily = 'Georgia, "Songti SC", "Noto Serif SC", serif';
    s.fontSize = cap.final ? 'clamp(28px, 4vmin, 58px)' : 'clamp(22px, 3.2vmin, 46px)';
    s.fontWeight = cap.final ? '600' : '500';
    s.lineHeight = '1.5';
    s.letterSpacing = '0.02em';
    s.color = 'rgba(246, 243, 233, 0.97)';
    s.textShadow = '0 2px 18px rgba(0,0,0,0.75), 0 0 6px rgba(0,0,0,0.6)';
    s.padding = '0 8px';
    s.opacity = '0';
    s.visibility = 'hidden';
    s.transform = 'translateY(14px)';
    s.willChange = 'opacity, transform';

    layer.appendChild(node);
    B4_NODES.push(node);
  }

  host.appendChild(layer);
  updateCaptions(0);
  return B4_NODES;
}

function updateCaptions(t) {
  var time = Number(t) || 0;

  for (var i = 0; i < B4_CAPTIONS.length; i++) {
    var node = B4_NODES[i];
    if (!node) continue;

    var cap = B4_CAPTIONS[i];
    var fadeIn = b4Smooth01((time - cap.start) / B4_FADE);
    var fadeOut = b4Smooth01((cap.end - time) / B4_FADE);
    var op = Math.max(0, Math.min(fadeIn, fadeOut));

    node.style.opacity = op.toFixed(3);
    node.style.transform = 'translateY(' + ((1 - op) * 14).toFixed(1) + 'px)';
    node.style.visibility = op > 0.002 ? 'visible' : 'hidden';
  }
}
