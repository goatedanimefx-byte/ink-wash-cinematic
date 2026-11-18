# Ink Wash Cinematic: The Monk's Path

**Story arc (60 seconds)**
A solitary ink‑brush monk undertakes a pilgrimage across a mist‑shrouded mountain landscape. Beginning at a high ridge (0–10 s), he descends through swaying bamboo forest (10–25 s), crosses a rippling stream on stepping stones (25–35 s), and climbs to a hidden cave where a single red lantern glows (35–45 s). Inside the cave (45–55 s) he sits in meditation; his stillness draws a soft inner light that merges with the lantern's glow. The final moment (55–60 s) holds the camera on the lantern as the voice‑over ends: “Master the silence, and you master the world.”

**Emotional journey**
Solitude → struggle → patience → enlightenment. The red lantern appears only once, used sparingly as the story’s emotional pivot.

**Visual continuity**
Camera moves continuously: opening push‑in on the monk, slow pan right as he walks, slight parallax on mountain layers, downward tilt at the stream, upward tilt to the cave, gentle zoom on the lantern. No cuts; ink‑bloom shader dissolves transition between story beats (ridge→forest→stream→cave→meditation).

**Narration (approx 150 words)**
Text for speechSynthesis:
```
Stoicism is not the absence of feeling. It is the strength to keep walking when the path disappears. Discipline is the quiet voice that says ‘one more step.’ Recovery is the pause that lets the ink settle. Mental strength is the bamboo that bends but does not break. In the stillness, you find the answer that noise could never give. Master the silence, and you master the world.
```

**Character actions**
- Walk cycle with arm swing, breathing idle, sit, rise, bow head, hands‑in‑lap meditation pose.
- Legs and arms move visibly; brush‑stroke body varies width.

**World layers (parallax)**
1. Far mountains (wash, slow drift)
2. Mid bamboo forest (sway, moderate speed)
3. Near water (ripples, faster)
4. Rain/mist (particle layer)
5. Sun disc (soft glow)
6. Lantern flicker (red accent)

**Shader features**
Paper fibre noise, ink bleed/diffusion (fbm domain‑warped edges), dry‑brush streaks, edge pooling, soft mist, vignette, film grain, bloom on red accent, ink‑bloom transition between story moments.

**Timeline**
Single deterministic timeline t = 0…60 drives camera, characters, layers, shaders, captions, audio. Scrub to any second with ?t= parameter.