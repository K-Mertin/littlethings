# Sunny Circuit

A bright toy-car arcade racer in 3D. Race five rivals or the ghost of your best lap, drift through corners for a mini-turbo, slipstream and hit the boost pads, and earn credits to buy cars and parts. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser, pick a mode (**Quick race**, **Grand Prix** or **Time trial**), a track and direction, your car and its color, laps and rival difficulty, then press **Race!** (or Enter). The menu shows your car in a showroom view.

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

**Perfect start:** press the gas (on touch screens, tap **DRIFT**) the moment the lights go green for a boost off the line. Hold the gas down too early and the wheels spin for a moment.

**Slipstream:** tuck in close behind another car on a straight and **SLIPSTREAM** lights up above the speedometer: you get up to about 11 km/h extra top speed to pull out and pass. Rivals do it too.

**Damage:** hard hits on walls and other cars lower your top speed by up to about 13%, shown as **DAMAGE** above the speedometer, and a badly damaged car smokes. It repairs very slowly during the race and fully before the next one.

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

## Career: credits
Every race pays credits, shown at the bottom of the results:

| | Easy | Normal | Hard | Expert |
|---|---|---|---|---|
| 1st place (3 laps) | 600 | 1,000 | 1,500 | 2,200 |

- 2nd to 6th pay 70%, 50%, 35%, 25% and 15% of that. 2 laps pay two thirds, 5 laps five thirds.
- Bonuses: fastest lap (150 × the level factor) and a clean race with no wall hits (120 × the level factor).
- Grand Prix races pay 80% of a quick race, plus 3,000 / 2,000 / 1,200 × the level factor for finishing the championship 1st, 2nd or 3rd.
- Time trial medals pay 300 (bronze), 600 (silver) and 1,000 (gold) per layout, once each.

You start with 2,000 credits and three cars: GT Coupe, Rally Hatch and Roadster. The Baja Truck costs 3,000, the Muscle 4,500 and the Prototype 9,000; click a locked car in the menu to buy it. **Expert** rivals unlock once you finish a Hard Grand Prix in the top three. Credits, cars and parts are saved in this browser.

## Garage: parts
Each base car can be fitted with parts in the **Garage** (in the menu, under the car list). Parts change how the car looks and drives, and each costs tuning points from a budget of 8, so you have to choose.

| Slot | Options (points, price) | Effect |
|---|---|---|
| Rear wing | None, Lip spoiler (1, 400 cr), GT wing (2, 900 cr), Race wing (3, 1,800 cr) | More grip in corners, less top speed |
| Tyres | Street, Sport (1, 500 cr), Slicks (2, 1,500 cr), Off-road (1, 700 cr) | Slicks grip best on tarmac but are hopeless on grass and slow to charge drifts; off-road tyres barely slow down on grass but grip less |
| Engine | Stock, Tuned (2, 1,500 cr), Turbo (4, 4,000 cr) | More top speed and acceleration; the turbo also makes the rear step out more |
| Body kit | None, Aero kit (2, 1,100 cr), Lightweight (2, 1,400 cr), Rally kit (1, 600 cr) | Aero: more grip, worse on grass. Lightweight: quicker but easier to push around. Rally: better on grass, slightly slower |
| Rims, rim finish | Six styles, five finishes | Looks only, free |

Every car comes with its stock parts, which give it the character described above. Other parts are bought once with credits and then fit every car you own; parts you have not bought show their price with a dashed border. The stat bars show your build against stock. Parts are saved per car. On Hard the rivals fit a tuned engine, on Expert a turbo where it fits their budget.

## Tracks
1. **Meadow Loop**: 2.4 km with a hairpin, esses and a fast back straight through farmland, with snowy mountains, villages, barns and silos, wind turbines, ponds and hot-air balloons. Laps take about 70 seconds.
2. **Sunset Coast**: 2.2 km along the shore of an island: a long fast sweeper, a hairpin at the point and a chicane, with palms, a lighthouse, a pier, beach huts, hotels, a Ferris wheel, boats sailing round and a city on the next island. About 62 seconds.
3. **Alpine Pass**: 2.4 km mountain road of stacked switchbacks with four hairpins and a hump at the top, between fir forests, chalets, a frozen lake, a ski lift, snowmen and falling snow under tall peaks. About 70 seconds.
4. **Desert Canyon**: 2.4 km speedway: two huge straights and a twisting canyon section through red rock: striped mesas, a stone arch, cacti, an oasis, a roadside diner and wind pumps. About 70 seconds.
5. **Harbor City**: 2.2 km street circuit at night with right-angle corners round city blocks and a chicane, between lit towers, with street lamps, neon signs, a container port with cranes, stars and the moon. Cars light the road with their headlights. About 74 seconds.

Every track can also be driven in **Reverse** (pick it above the track list in Quick race and Time trial), which turns each corner into its mirror and needs different braking points. The Grand Prix always runs forward.

All tracks have a grandstand, pit garages, a footbridge, advertising boards, tyre walls and gravel traps on the outside of the bends. The road is 13.5 m wide.

Best race time (per track, direction and lap count) and best lap (per track and direction) are saved in this browser.

## Grand Prix
Choose **Grand Prix** in the menu to race all five tracks in order with the same rivals, laps and difficulty.

- Points per race: 10, 8, 6, 4, 2 and 1 for 1st to 6th, plus 1 for the fastest lap.
- After every race the results show the points earned and the championship standings. Ties are split by number of wins.
- Progress is saved, so you can leave between races and continue later. **Abandon** in the menu starts over.
- Finishing the championship in the top three wins a gold, silver or bronze cup for that difficulty, plus credits. The best cup for each level is shown in the menu.

## Time trial
Choose **Time trial** to drive alone. Each lap is timed, and your best lap on each layout is saved as a **ghost**: a see-through car that drives it again next time. Under the lap timer, the green or red number is how far ahead (−) or behind (+) the ghost you are at that point of the lap.

Each layout has bronze, silver and gold target lap times, shown in the menu. A tidy lap in the stock GT without drift boosts earns bronze; gold needs drift boosts and clean lines all the way round.

## Rivals
Bolt, Pip, Rosa, Mango and Zippy. They brake for corners, take a racing line (wide on the way in, clipping the inside at the apex), change lanes to pass, slipstream, and use the boost pads. You start at the back of the grid.

| Level | How the rivals drive |
|---|---|
| Easy | a little slower than you on the straights, careful in corners, loose lines |
| Normal | as fast as you, follow the racing line, sometimes boost out of corners and make a good start |
| Hard | faster than you with tuned engines, carry more speed through corners and often boost out of them. You will need drift boosts and slipstream to win. |
| Expert | turbo engines, near-perfect lines, boost out of almost every corner and usually make a perfect start. Unlocked by a Hard Grand Prix podium. |

In tests with a tidy computer driver in the stock GT, Easy was a clear win, Normal a close race, Hard about 1–4 seconds short over 3 laps and Expert about 6 seconds short. If you pull ahead, the rivals speed up a little to keep the race close (more on harder levels).

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
