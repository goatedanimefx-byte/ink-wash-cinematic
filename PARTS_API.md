# PARTS API – Ink Wash Cinematic

Shared interface for parallel worker development. All parts integrate into final `video\index.html`.

## Global constants
- Canvas size: `W = 1080`, `H = 1920` (portrait).
- Main WebGL2 canvas id: `gl`.
- Offscreen mask canvas ids: `maskA`, `maskB` (each 1080×1920).
- Timeline function: `timeline(t)` where `t` = seconds 0…60.

## Mask drawing functions
The main drawing loop creates two ink masks (A and B) via `drawMask(ctx, time, variant)`.
- `ctx`: 2D context of a mask canvas.
- `time`: elapsed seconds (float).
- `variant`: 0 for maskA (first moment), 1 for maskB (second moment, contains red accent).
- The shader blends between masks using radial ink‑bloom transition.

## Part hooks
### B1 Shader engine (`b1-shader.js`)
Implement:
- `initShader()` → returns `{ gl, program, uniforms }`.
- `renderFrame(t, cameraOffset, transition)` → updates uniforms, draws.
- `createMaskCanvases()` → creates `maskA`, `maskB` 2D contexts.

Shader uniforms: `u_time`, `u_resolution`, `u_cameraOffset`, `u_maskA`, `u_maskB`, `u_transition`.

### B2 Puppet characters (`b2-characters.js`)
Implement:
- `drawMonk(ctx, x, y, t, pose)` where `pose` = `'walk'`, `'idle'`, `'sit'`, `'rise'`, `'bowHead'`.
- Joint chain: hip→knee→ankle, shoulder→elbow→wrist, head.
- Brush‑stroke body with varying width (`inkSeg` helper).
- Called from `drawMask` (variant 0 or 1) to draw monk in green channel.

### B3 World layers (`b3-world.js`)
Implement:
- `drawWorldLayers(ctx, t, cameraOffset)` → draws parallax layers: far mountains, mid bamboo, water ripples, rain, mist, sun disc, wind sway, lantern flicker.
- Layers move at different speeds relative to cameraOffset.
- Called from `drawMask` after characters.

### B4 Captions (`b4-captions.js`)
Implement:
- `initCaptions(container)` → creates caption divs.
- `updateCaptions(t)` → fades captions in/out based on timeline.
- Caption text from STORY.md narration (140‑160 words).
- No audio; only visual text.

### B5 Timeline (`b5-timeline.js`)
Implement:
- `timeline(t)` → returns `{ cameraOffset, transition, monkPose, monkX, captionIndex }`.
- Deterministic: same output for same `t`.
- Drives camera, characters, layers, shaders, captions.
- Controls: Play, Pause, Replay (no Mute). Start with one Play click.

## Integration order in main file
1. Include B1, B2, B3, B4, B5 scripts (inline).
2. `initShader()`, `createMaskCanvases()`, `initCaptions()`.
3. Animation loop calls `timeline(t)` → updates masks with `drawMonk`, `drawWorldLayers` → `renderFrame()` → `updateCaptions()`.
4. Fallback canvas if WebGL2 missing.

## Story moments (t)
0–10 s: ridge walk  
10–25 s: bamboo forest  
25–35 s: stream crossing  
35–45 s: climb to cave  
45–55 s: meditation  
55–60 s: lantern hold

Red accent appears only in cave (variant 1, lantern).