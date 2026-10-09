# Sunny Circuit

A bright toy-car arcade racer in 3D. Race five rivals over 3 or 5 laps, drift through corners for a mini-turbo and hit the boost pads. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser, pick a track, a car color, laps and rival difficulty, then press **Race!** (or Enter).

| Key | Action |
|---|---|
| ↑ / W | accelerate |
| ↓ / S | brake, then reverse |
| ← → / A D | steer |
| Space / Shift | drift (hold while turning) |
| R | put the car back on the track |
| P / Esc | pause |
| M | sound on/off |

**Drift boost:** hold drift while turning. The bar under the speedometer fills: blue sparks give a short boost when you let go, orange sparks a longer one. Hitting a wall cancels the drift.

**Boost pads:** the blue pads with yellow arrows give a burst of speed.

## Phones and tablets
Touch controls turn on automatically. The car accelerates by itself. Steer with ◀ ▶ on the left, hold **DRIFT** while turning and let go for a boost, and hold **BRAKE** to slow down or reverse. **II** pauses; the pause menu has **Back on track** if you get turned around. Both orientations work; landscape plays best.

## Tracks
1. **Meadow Loop**: green fields, a hairpin and a fast back straight. About 1 km.
2. **Sunset Coast**: an island loop with palms, an S-bend and sea all around. About 950 m.

Best race time (per track and lap count) and best lap (per track) are saved in this browser.

## Rivals
Bolt, Pip, Rosa, Mango and Zippy. They follow the track, slow down for corners, change lanes to pass, and use the boost pads. Their pace is set by **Easy / Normal / Hard**, with gentle catch-up so races stay close.

## How it is built
- Each track is a closed Catmull-Rom spline through a list of points. It is sampled about once per meter, and the road, kerbs, run-off and walls are built as ribbons along it.
- Cars use simple arcade physics: grip is lowered while drifting so the car slides, and grass slows you down. A fixed 120 Hz step keeps it the same on every device.
- Lap counting needs a halfway checkpoint, so cutting back over the line does not count.
- Rendering is Three.js (WebGL) with sun shadows, fog and a gradient sky. Textures (asphalt, kerbs, boost pads, banner) are painted in code on canvases. Trees, palms and the crowd are instanced meshes.
- On slower devices the game lowers resolution and then turns off shadows to keep the frame rate up.

## Adding a track
Add an entry to `TRACKS` in `index.html`:
- `pts`: the control points `[x, z]` in meters, going round the loop. The first point is the start line, so make the first two points a straight. Keep corners at least ~16 m in radius and keep separate parts of the track at least ~45 m apart.
- `boosts`: `[fraction of the lap, lateral offset]` for each boost pad.
- `theme`: sky colors, fog, ground colors, `deco: 'trees'` or `'palms'`, and `water` for a sea around the track.
