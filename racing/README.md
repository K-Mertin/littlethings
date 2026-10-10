# Sunny Circuit

A bright toy-car arcade racer in 3D. Race five rivals over 3 or 5 laps, drift through corners for a mini-turbo and hit the boost pads. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser, pick a track, your car and its color, laps and rival difficulty, then press **Race!** (or Enter). The menu shows your car in a showroom view.

| Key | Action |
|---|---|
| ↑ / W | accelerate |
| ↓ / S | brake, then reverse |
| ← → / A D | steer |
| Space / Shift | drift (hold while turning) |
| R | put the car back on the track |
| P / Esc | pause |
| M | sound on/off |

**Grip:** the tyres have a limit. Take a corner too fast and the car slides wide and loses speed, so brake before the tight ones.

**Drift boost:** hold drift while turning. The bar under the speedometer fills: blue sparks give a short boost when you let go, orange sparks a longer one. Hitting a wall cancels the drift.

**Boost pads:** the blue pads with yellow arrows give a burst of speed.

## Phones and tablets
Touch controls turn on automatically. The car accelerates by itself. Steer with ◀ ▶ on the left, hold **DRIFT** while turning and let go for a boost, and hold **BRAKE** to slow down or reverse. **II** pauses; the pause menu has **Back on track** if you get turned around. Both orientations work; landscape plays best.

## Cars
Six models, each with its own look and a small handling difference. Bodies are lofted: a smooth cross-section is swept along the car with its own width, floor and roof curves, so they have rounded shoulders, fender hips, tapered noses and cut wheel arches. Glasshouses have painted pillars and roof with glass windows, tyres have rounded shoulders, and rims, brake discs and calipers are modelled. Paint, glass and chrome reflect the track's own sky. You pick one; your five rivals drive the others.

| Car | Character |
|---|---|
| GT Coupe | Balanced all-rounder: fastback, rear wing, five-spoke rims |
| Muscle | Highest top speed but heavier in corners: long bonnet, hood scoop, twin stripes, chrome bumpers, quad round lights |
| Rally Hatch | Quickest off the line and nimble: light pod, roof spoiler, mud flaps, white rally rims |
| Prototype | Le Mans racer with high downforce: bubble canopy, shark fin, big wing, but slower to accelerate |
| Roadster | Classic open-top, charges drift boosts fastest: driver in helmet, leather seats, wire wheels |
| Baja Truck | Lifted off-road truck that is barely slowed by grass: roll cage, light bar, bull bar, spare wheel |

In a test where the same driver drove every car, average lap times were within about half a second of each other.

## Garage: parts
Each base car can be fitted with parts in the **Garage** (in the menu, under the car list). Parts change how the car looks and drives, and each costs tuning points from a budget of 8, so you have to choose.

| Slot | Options (points) | Effect |
|---|---|---|
| Rear wing | None, Lip spoiler (1), GT wing (2), Race wing (3) | More grip in corners, less top speed |
| Tyres | Street, Sport (1), Slicks (2), Off-road (1) | Slicks grip best on tarmac but are hopeless on grass and slow to charge drifts; off-road tyres barely slow down on grass but grip less |
| Engine | Stock, Tuned (2), Turbo (4) | More top speed and acceleration; the turbo also makes the rear step out more |
| Body kit | None, Aero kit (2), Lightweight (2), Rally kit (1) | Aero: more grip, worse on grass. Lightweight: quicker but easier to push around. Rally: better on grass, slightly slower |
| Rims, rim finish | Six styles, five finishes | Looks only |

Every car starts with its stock parts, which give it the character described above. The stat bars show your build against stock. Parts are saved per car. Rivals race on stock parts.

## Tracks
1. **Meadow Loop**: 2.4 km with a hairpin, esses and a fast back straight through farmland, with snowy mountains, villages, barns and silos, wind turbines, ponds and hot-air balloons. Laps take about 70 seconds.
2. **Sunset Coast**: 2.2 km along the shore of an island: a long fast sweeper, a hairpin at the point and a chicane, with palms, a lighthouse, a pier, beach huts, hotels, a Ferris wheel, boats sailing round and a city on the next island. About 62 seconds.
3. **Alpine Pass**: 2.4 km mountain road of stacked switchbacks with four hairpins and a hump at the top, between fir forests, chalets, a frozen lake, a ski lift, snowmen and falling snow under tall peaks. About 70 seconds.
4. **Desert Canyon**: 2.4 km speedway: two huge straights and a twisting canyon section through red rock: striped mesas, a stone arch, cacti, an oasis, a roadside diner and wind pumps. About 70 seconds.
5. **Harbor City**: 2.2 km street circuit at night with right-angle corners round city blocks and a chicane, between lit towers, with street lamps, neon signs, a container port with cranes, stars and the moon. Cars light the road with their headlights. About 74 seconds.

All tracks have a grandstand, pit garages, a footbridge, advertising boards, tyre walls and gravel traps on the outside of the bends. The road is 13.5 m wide.

Best race time (per track and lap count) and best lap (per track) are saved in this browser.

## Grand Prix
Choose **Grand Prix** in the menu to race all five tracks in order with the same rivals, laps and difficulty.

- Points per race: 10, 8, 6, 4, 2 and 1 for 1st to 6th, plus 1 for the fastest lap.
- After every race the results show the points earned and the championship standings. Ties are split by number of wins.
- Progress is saved, so you can leave between races and continue later. **Abandon** in the menu starts over.
- Finishing the championship in the top three wins a gold, silver or bronze cup for that difficulty. The best cup for Easy, Normal and Hard is shown in the menu.

## Rivals
Bolt, Pip, Rosa, Mango and Zippy. They brake for corners, change lanes to pass and use the boost pads. You start at the back of the grid.

| Level | How the rivals drive |
|---|---|
| Easy | about 10% slower on the straights, careful in corners |
| Normal | close to your top speed, sometimes boost out of corners |
| Hard | slightly faster than you, carry speed through corners and often boost out of them. You will need drift boosts to win. |

If you pull ahead, the rivals speed up a little to keep the race close (more on Hard).

## How it is built
- Each track is a closed Catmull-Rom spline through a list of points. It is sampled about once per meter, and the road, kerbs, run-off and walls are built as ribbons along it.
- Cars use arcade physics with a tyre grip limit: past it the car slides wide and scrubs speed. Grip is lower while drifting, and grass slows you down. A fixed 120 Hz step keeps it the same on every device.
- Each car model is built at real size (4–4.8 m) as a lofted body and glasshouse (`makeLoft`), plus its own details, wheels and rims. They are scaled up slightly to read well at speed. Paint uses a clear-coat material with reflections. Models and their stats are in `MODELS` in `index.html`.
- Cars collide as oriented boxes (separating-axis test). Each hit applies an impulse at the contact corner with bounce, friction and spin, weighted by each model's mass (the Baja Truck is heaviest, the Roadster lightest). Tyres skate for a moment after a hit so the push separates the cars, and rivals steer away from a car alongside instead of leaning on it. Hits throw sparks, shake the body and camera, and make a crash sound; wall hits do too.
- Lap counting needs a halfway checkpoint, so cutting back over the line does not count.
- Rendering is Three.js (WebGL) with sun shadows, fog and a gradient sky. Textures (asphalt, kerbs, boost pads, banner) are painted in code on canvases. Trees, palms and the crowd are instanced meshes.
- On slower devices the game lowers resolution and then turns off shadows to keep the frame rate up.

## Adding a track
Add an entry to `TRACKS` in `index.html`:
- `pts`: control points `[x, z]` in meters for a smooth spline, going round the loop; or `path`: polygon corners `[x, z, radius]`, rounded to real arcs joined by straights (used for the street circuit and switchbacks). The first point is the start line, so make the first two points a straight. Keep corners at least ~16 m in radius and keep separate parts of the track at least ~45 m apart.
- `boosts`: `[fraction of the lap, lateral offset]` for each boost pad, or `'auto'` to put them on the straights.
- `theme`: sky, fog, light and ground colors, `kind` (`meadow`, `coast`, `alpine`, `desert` or `city`, which picks the landmarks and plants), run-off and dust colors, distant `peaks` and `hillsCfg`, cloud and balloon counts, and optional `water`, `snowfall` or `night`.
