# Sunny Circuit

A bright toy-car arcade racer in 3D. Race five rivals or the ghost of your best lap, work up a four-tier career with a season rival in each tier, earn licenses, and take on elimination races, drift trials and checkpoint rushes, drift through corners for a mini-turbo, slipstream and hit the boost pads, and earn credits to buy cars and parts. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser, pick a mode (**Quick race**, **Career**, **Grand Prix**, **Challenges**, **Time trial** or **Drift school**), a track and direction, your car and its color, laps and rival difficulty, then press **Race!** (or Enter). The menu shows your car in a showroom view.

| Key | Action |
|---|---|
| ↑ / W | accelerate |
| ↓ / S | brake, then reverse |
| ← → / A D | steer |
| Space / Shift | drift (hold while turning) |
| R | put the car back on the track |
| C | change camera: chase, far chase, bumper |
| P / Esc | pause |
| M | sound on/off |

**Grip:** the tyres have a limit. Take a corner too fast and the car slides wide and loses speed, so brake before the tight ones.

**Drift boost:** hold drift while turning. The slide builds up over about half a second rather than snapping round, so you have time to correct it with ← →. The bar under the speedometer fills: blue sparks give a short boost when you let go, orange sparks a longer one. Hitting a wall cancels the drift.

**Boost pads:** the blue pads with yellow arrows give a burst of speed.

**Perfect start:** press the gas (on touch screens, tap **DRIFT**) the moment the lights go green for a boost off the line. Hold the gas down too early and the wheels spin for a moment.

**Slipstream:** tuck in close behind another car on a straight and **SLIPSTREAM** lights up above the speedometer: you get up to about 11 km/h extra top speed to pull out and pass. Rivals do it too.

**Damage:** hard hits on walls and other cars lower your top speed by up to about 13%, shown as **DAMAGE** above the speedometer, and a badly damaged car smokes. It repairs very slowly during the race and fully before the next one.

**Tyre wear:** tyres wear as you drive, faster when they slide or drift. **TYRES %** above the speedometer shows what is left; fully worn tyres have about a fifth less grip, so the end of a 5-lap race is slipperier than the start. Slicks wear fastest, street and off-road tyres slowest. Tyres are fresh for every race.

**Weather:** choose **Dry**, **Rain** or **Random** in Quick race (on the Alpine Pass rain falls as snow). On a wet road every car has about a fifth less grip and brakes later; slicks lose a lot more, off-road and street tyres the least. The sky darkens, the road shines, cars throw up spray and you see less far ahead. Wet races pay 25% more credits. In the Grand Prix each round has its own forecast, shown in the calendar; time trials are always dry.

## Phone as the controller
Play on the computer and steer with your phone, no app needed:

1. In the menu, press **📱 Use your phone as the controller**. A QR code appears.
2. Scan it with the phone's camera. The controller page (`pad.html`) opens in the phone's browser.
3. Choose how to steer: **tilt the phone** like a steering wheel, or an **on-screen stick**. Choose **automatic gas** or a **GAS** button you hold. For tilt you can pick gentle, normal or sharp steering, reverse the direction, and press **Center** to reset straight ahead. On an iPhone, allow motion sensors when asked.
4. Press **Connect**. The phone has big DRIFT, BRAKE and GAS buttons, plus pause and camera. A **▶ Race!** button on the phone starts the race, and the phone shows your position, lap and speed.

The phone vibrates on crashes, drift boosts and boost pads (Android only: iPhone browsers cannot vibrate), and keeps its screen awake. With automatic gas, tap DRIFT the moment the lights go green for a perfect start. The keyboard keeps working alongside the phone. If the phone drops out mid-race, the game pauses.

The phone and the computer find each other through a free public pairing service (PeerJS) and then talk directly over WebRTC, so both need the internet for the first handshake. Some office, school or mobile networks block the direct connection; a home Wi-Fi network usually works. For testing on one computer, open the controller link with `?local` in a second tab of the same browser (`pad.html?local#code`).

## Phones and tablets
Touch controls turn on automatically. The car accelerates by itself. Steer with ◀ ▶ on the left, hold **DRIFT** while turning and let go for a boost, and hold **BRAKE** to slow down or reverse. **II** pauses; the pause menu has **Back on track** if you get turned around. Both orientations work; landscape plays best.

## Cars
Eight models, each with its own look and a small handling difference. All eight are **sculpted**: each car is written as a distance field (digital clay) in `sculpt/*.mjs`, meshed and baked at build time by `node racing/sculpt/bake.mjs` into `assets/cars/<car>.hi.bin` (computers, about 90k triangles) and `.lo.bin` (phones, about 30k), with colour, panel lines and occlusion baked into the vertices. The game loads the right file and falls back to the older lofted models below until it arrives. `carlab.html` is a showroom for inspecting them. Bodies are lofted: a smooth cross-section is swept along the car with its own width, floor and roof curves, so they have rounded shoulders, fender hips, tapered noses and cut wheel arches. Glasshouses have painted pillars and roof with glass windows, tyres have rounded shoulders, and rims, brake discs and calipers are modelled. Paint, glass and chrome reflect the track's own sky. You pick one; your five rivals drive five of the others, a different line-up on each track.

| Car | Character |
|---|---|
| GT Coupe | Balanced all-rounder: fastback, rear wing, five-spoke rims |
| Muscle | Highest top speed but heavier in corners: long bonnet, hood scoop, twin stripes, chrome bumpers, quad round lights |
| Rally Hatch | Quickest off the line and nimble: light pod, roof spoiler, mud flaps, white rally rims |
| Prototype | Le Mans racer with high downforce: bubble canopy, shark fin, big wing, but slower to accelerate |
| Roadster | Classic open-top, charges drift boosts fastest: driver in helmet, leather seats, wire wheels |
| Baja Truck | Lifted off-road truck that is barely slowed by grass: roll cage, light bar, bull bar, spare wheel |
| Volt EV | Electric hypercar: the quickest off the line and out of corners, but heavy; wraparound glass canopy, light blades front and rear, air channels through the fenders, no exhaust |
| Formula | Open-wheel single seater with the most grip of all, but hopeless on grass: needle nose, halo, airbox, wide front wing and tall rear wing, wheels out in the air |

In a test where the same driver drove every car, average lap times were within about half a second of each other; the Formula, the most expensive car, is about half a second quicker again on tracks where nobody leaves the road.

## Career: credits
Every race pays credits, shown at the bottom of the results:

| | Easy | Normal | Hard | Expert | Legend |
|---|---|---|---|---|---|
| 1st place (3 laps) | 600 | 1,000 | 1,500 | 2,200 | 3,000 |

- 2nd to 6th pay 70%, 50%, 35%, 25% and 15% of that. 2 laps pay two thirds, 5 laps five thirds.
- Bonuses: fastest lap (150 × the level factor), a clean race with no wall hits (120 × the level factor), and +25% for a wet race.
- Grand Prix races pay 80% of a quick race, plus 3,000 / 2,000 / 1,200 × the level factor for finishing the championship 1st, 2nd or 3rd.
- Time trial medals pay 300 (bronze), 600 (silver) and 1,000 (gold) per layout, once each.

You start with 2,000 credits and three cars: GT Coupe, Rally Hatch and Roadster. The Baja Truck costs 3,000, the Muscle 4,500, the Volt EV 7,500, the Prototype 9,000 and the Formula 12,000; click a locked car in the menu to buy it. **Expert** rivals unlock once you finish a Hard Grand Prix in the top three, **Legend** after an Expert one. Credits, cars and parts are saved in this browser.

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
6. **Maple Woods**: 2.3 km round a forest lake in autumn: a long sweeper, tight esses and a hairpin at the far end, between maples, birches and dark firs, with fallen leaves on the grass and drifting through the air, log cabins with smoking chimneys, a sawmill, a fire lookout tower on a rocky knoll, and a jetty with rowing boats on the lake. About 72 seconds.

7. **Jungle Ruins**: 2.5 km through the rainforest, with step pyramids, a waterfall, giant trees, palms and ferns. A **jump** on the start straight clears a river, and a **dirt shortcut** leaves the circuit on the left and runs through a lost temple (stone columns and a gateway) to cut off a long bend. About 72 seconds.
8. **Volcano Ridge**: 2.6 km over black lava rock at dusk, under a smoking volcano with a glowing crater: two **jumps** over glowing lava rivers, lava pools, steam vents, dead trees and falling ash. About 75 seconds.
9. **Starlight Stadium**: 1.8 km floodlit night circuit inside a stadium bowl: an infield hairpin loop, a **jump** on the back straight, floodlight towers that light the road, lit stands all round, a giant screen and fireworks over the infield. About 53 seconds.
10. **Sakura Hills**: 2.1 km through cherry blossom in spring: red torii gates over the road, a five-storey pagoda, rice paddies, stone lanterns, a snow-capped volcano on the horizon, falling petals, and a **bamboo shortcut** that cuts off the chicane. About 61 seconds.

**Jumps**: the yellow kicker ramps across the road throw the car into the air. Steering does almost nothing in the air and the tyres have no grip, so line up straight before the ramp. A flight of more than half a second that lands straight gives a small boost (**Big air!**). The minimap marks jumps with a yellow dot.

**Shortcuts**: a narrower dirt road, signposted with a yellow **SHORTCUT** board, leaves the circuit and rejoins it further on. It is shorter but the dirt is slower and less grippy: a clean run gains about a second, a messy one loses time. Off-road tyres, the Rally kit and the Baja Truck lose least on dirt, and you can drift on it. Some rivals take it too (more on harder levels and in cars that like dirt). The minimap shows it as a dashed line.

Every track can also be driven in **Reverse** (pick it above the track list in Quick race and Time trial), which turns each corner into its mirror and needs different braking points. The Grand Prix always runs forward.

All tracks have a grandstand, pit garages, a footbridge, advertising boards, tyre walls and gravel traps on the outside of the bends. The road is 13.5 m wide.

Best race time (per track, direction and lap count) and best lap (per track and direction) are saved in this browser.

## Grand Prix
Choose **Grand Prix** in the menu and a series, then race its tracks in order with the same rivals, laps and difficulty:

- **Sunny Cup**: the six original tracks.
- **Wild Cup**: the four new tracks (jumps, shortcuts and the night stadium).
- **Grand Tour**: all ten tracks, with double prize money for the championship podium.


- Points per race: 10, 8, 6, 4, 2 and 1 for 1st to 6th, plus 1 for the fastest lap.
- After every race the results show the points earned and the championship standings. Ties are split by number of wins.
- Progress is saved, so you can leave between races and continue later. **Abandon** in the menu starts over.
- Finishing the championship in the top three wins a gold, silver or bronze cup for that series and difficulty, plus credits. The best cups are shown in the menu.

## Career
Choose **Career** for a season-by-season ladder of events. There are four tiers, each with six events and its own **season rival**, who drives their own car a little faster than the rest and is marked ⚔ in the results. Every race against them counts in the head-to-head shown in the menu, and the last event of each tier is a one-on-one **duel** with them.

| Tier | Rivals | Rival | Needs |
|---|---|---|---|
| Rookie Cup | Normal | Pip, Rally Hatch | |
| Club Series | Hard | Rosa, Muscle | Rookie Cup complete and the B license |
| Pro Tour | Expert | Bolt, Prototype | Club Series complete and the A license |
| Masters | Legend | Zippy, Roadster | Pro Tour complete and the S license |

Events mix races (some in the rain or snow, one in reverse), eliminations, drift trials, checkpoint rushes and the duel. Each event earns up to three stars: 1st/2nd/3rd place (the duel needs a win), or a gold/silver/bronze medal in a drift trial or checkpoint rush. Every new star pays a tier bonus; a star in every event completes the tier and pays a completion bonus. Completing the Club Series unlocks Expert rivals everywhere, the Pro Tour Legend rivals.

### Licenses
Under **Licenses** in the Career menu are three licenses of three short tests each. Pass all three to earn the license (B 600, A 1,200, S 2,500 credits):

| License | Tests |
|---|---|
| B | Stop in the box (accelerate, then stop inside a yellow box 230 m ahead); Clean sector (first half of Sunset Coast in 33 s, no wall hits); First boosts (2 drift boosts in a lap of Maple Woods) |
| A | Big air (0.6 s or more off both jumps of Volcano Ridge in one lap); Take the shortcut (a lap of Sakura Hills under 1:04 using the bamboo shortcut); Wet lap (a lap of Sunset Coast in the rain under 1:08) |
| S | Orange master (3 orange boosts in a lap of Alpine Pass); Night sprint (a clean lap of Starlight Stadium under 0:56); Overtaker (from the back of five Hard rivals, 3rd or better after one lap of Desert Canyon) |

## Challenges
Choose **Challenges**, a challenge and a track:

- **Elimination**: race the five rivals at the chosen difficulty. After 45 seconds the car in last place is knocked out, then another every 20 seconds, until one car is left. The box under the lap timer counts down to the next knockout and warns you when you are last.
- **Drift trial**: alone on track for 75 seconds. Drifting scores points (faster and longer drifts score more, drifting on dirt scores extra); the points are banked when the drift ends. Each blue or orange boost raises the combo by ×0.5 or ×1, up to ×5; three seconds without drifting, or a wall, resets it, and a wall loses the drift in progress. Jumps score too.
- **Checkpoint rush**: start with a few seconds on the clock; every checkpoint gate (five per lap) adds time, 4% less each time. Reach as many as you can.

Drift trials and checkpoint rushes have bronze, silver and gold targets per track (drift: 40%, 70% and 100% of a per-track reference; checkpoints: 8, 11 and 14), paying 300, 600 and 1,000 credits once each. Eliminations pay like a race.

## Drift school
Choose **Drift school** to learn the drift boost alone on any track, in four lessons:

1. **Start a drift**: steer into a corner and hold drift until the car slides (3 times).
2. **Blue boost**: hold until blue sparks appear, then let go (3 times).
3. **Orange boost**: keep holding until the sparks turn orange, then let go (3 times).
4. **Drift lap**: 4 orange boosts in a single lap.

**Watch a demo first** (in the Drift school menu, or in the pause menu) lets the game drive your car using exactly the keys you have. On-screen keys bottom left light up as they are pressed, and a caption names each step: hold ↑ on the straight, steer and press DRIFT together to turn in, keep DRIFT held and tap ← → to stay on the road, then let go as the road straightens. Press any key (or tap) to take over. The on-screen keys stay visible in Drift school, so you can also watch your own inputs.

A coach panel shows the current lesson and progress. Before each corner a hint says which way it turns, a large gauge in the middle of the screen fills while you drift and tells you when to let go, and every drift gets feedback (too short, blue, orange, lost to a wall, too slow). If drift will not start, the hint says why: too slow, not steering, or on the grass. Finishing all four lessons the first time pays 500 credits; after that you can keep practising freely.

## Time trial
Choose **Time trial** to drive alone. Each lap is timed, and your best lap on each layout is saved as a **ghost**: a see-through car that drives it again next time. Under the lap timer, the green or red number is how far ahead (−) or behind (+) the ghost you are at that point of the lap.

Each layout has bronze, silver and gold target lap times, shown in the menu. A tidy lap in the stock GT without drift boosts earns bronze; silver and gold need drift boosts and clean lines all the way round, and fresh tyres help, so your first flying lap is often the quickest.

## Race view and sound
- **Cameras**: press **C** (or the 🎥 button under pause) to switch between chase, far chase and a low bumper view. Your choice is remembered. After you cross the line the camera circles your car like a TV replay.
- **Gaps**: under your position, the time to the car ahead (red) and behind (green). Gaining or losing a place flashes ▲ or ▼ next to the position.
- **Lap times**: every lap shows its time and how far it was from your best lap on that layout.
- **Tyre marks**: drifts, slides and hard braking leave dark marks on the road that stay for the rest of the race.
- **Engine**: five gears with a short lift at each upshift, and each car has its own voice: the Muscle and Baja Truck are deep, the Rally Hatch and Prototype high and sharp.

## Rivals
Bolt, Pip, Rosa, Mango and Zippy. They brake for corners, take a racing line (wide on the way in, clipping the inside at the apex), change lanes to pass, slipstream, and use the boost pads. You start at the back of the grid.

| Level | How the rivals drive |
|---|---|
| Easy | a little slower than you on the straights, careful in corners, loose lines |
| Normal | as fast as you, follow the racing line, sometimes boost out of corners and make a good start |
| Hard | faster than you with tuned engines, carry more speed through corners and often boost out of them, and occasionally block. You will need drift boosts and slipstream to win. |
| Expert | turbo engines, near-perfect lines, boost out of almost every corner, usually make a perfect start, and the car just ahead of you sometimes moves over to block. Unlocked by a Hard Grand Prix podium. |
| Legend | faster again than Expert, blocking more often. Unlocked by an Expert Grand Prix podium. |

In tests with a tidy computer driver in the stock GT over 3 dry laps, Easy was a clear win, Normal about 1–3 seconds short, Hard 2–6 seconds, Expert 6–10 seconds and Legend 7–14 seconds. If you pull ahead, the rivals speed up a little to keep the race close (more on harder levels).

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
- `jumps`: fractions of the lap where a kicker ramp sits (on a straight); `cut`: `{ from, to }` fractions where a dirt shortcut leaves and rejoins the circuit (a smooth curve between them; keep it clear of the start line).
- `theme`: sky, fog, light and ground colors, `kind` (`meadow`, `coast`, `alpine`, `desert`, `city`, `forest`, `jungle`, `volcano`, `stadium` or `sakura`, which picks the landmarks and plants), run-off and dust colors, distant `peaks` and `hillsCfg`, cloud and balloon counts, and optional `water`, `snowfall` or `night`.
