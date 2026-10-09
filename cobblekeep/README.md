# Cobble Keep

A bright, cute 3D first-person shooter that plays like DOOM: keys, doors, secrets, a status bar and a face that reacts. Five stages, with a boss at the end. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser, or play it at https://k-mertin.github.io/littlethings/cobblekeep/.

- **Pick a stage:** every stage can be chosen from the title screen on any device. Nothing is locked.
- **Records:** cleared stages show a tick, your best time and stars. These are saved in that browser.
- **Direct link:** add `#stage7` (or any number 1–10) to the URL to open the title screen with that stage ready to play.
- **Mouse:** click inside the view to capture the mouse. Press Esc to release it and pause. The pause menu can restart the stage or return to stage select.
- **Length:** a full playthrough of all 10 stages takes about an hour.

| Key | Action |
|---|---|
| WASD | move (Shift to run) |
| Mouse | look; left click to shoot (F or Ctrl also shoot) |
| E / Space | open doors, ring the goal block |
| 1 2 3 4 / wheel | squeaky hammer, bubble blaster, confetti cannon, star launcher |
| Tab / M | map |
| N | music on/off |
| Arrow keys | turn and move without a mouse |
| P | pause |

**Difficulty:**
- **Relaxed:** enemies hit softer and have less health.
- **Normal:** the standard balance.
- **Tough:** enemies hit harder and have more health.

**Stars:** each stage awards up to three stars, one each for:
- popping every enemy
- collecting every treat
- finding every secret

## Phones and tablets
Touch controls turn on automatically. There are two control schemes, chosen on the title or pause screen:

- **Easy (default):** the left stick works like DOOM's arrow keys: up and down walk, left and right turn. You can play with one thumb.
- **Dual stick:** the left stick walks and sidesteps, and you drag on the right side to turn.

In both schemes:
- **Aiming:** dragging on the right side aims. One drag across about half the screen turns you around, on any screen size. Turn speed can be set to Slow, Normal or Fast.
- **Aim help:** the view gently pulls toward an enemy near the crosshair.
- **Auto-fire** (on by default) shoots when an enemy is lined up. You can still hold **FIRE**.
- **Doors and the goal block** open when you walk into them. Secret walls still need **USE**.
- **180°** spins you around. **TOY** switches weapon, and **MAP** and **II** open the map and pause.

Settings are saved in the browser. Landscape plays best. In portrait the view sits at the top and the controls fill the space below.

## Stages
Five worlds, two stages each. The second stage of each world is bigger and ends with a boss you must pop before the goal block will ring.

| # | Stage | Keys | Boss |
|---|---|---|---|
| 1 | Sunny Meadow | red | |
| 2 | Windmill Farm | red, blue | Boulder Bob |
| 3 | Cozy Castle | red, blue | |
| 4 | Royal Kitchen | red, yellow | Puff Queen |
| 5 | Sandy Temple | red, yellow | |
| 6 | Oasis Ruins | red, blue | Mega Shroom |
| 7 | Frosty Peaks | red, blue, yellow | |
| 8 | Crystal Caverns | red, blue, yellow | Frost Jelly |
| 9 | Candy Town | red, yellow | |
| 10 | Sugar Keep | red, blue | Jelly King |

**Carry-over:** your health, shield and toys carry over between stages. If you start from stage select, you get a fair starting kit for that stage.

**Retrying:** if you get bonked, the stage restarts with whatever you had when you entered it.

## Friends and foes
- **Jelly**: bouncy, bites up close. Its color changes with each stage.
- **Shroom**: stands back and spits spores.
- **Puff**: a flying cloud that throws zaps and floats over hazards.
- **Rocky**: a slow stone golem that hits hard.
- **Bee**: fast and flying, dives in for quick stings.
- **Teapot**: a turret that stays put and puffs out three bursts of steam.
- **Bosses**: Boulder Bob, Puff Queen, Mega Shroom, Frost Jelly and the Jelly King. Each fires fans and rings of orbs, summons helpers and speeds up at half health.

Pickups: hearts (+25), super hearts (+100, up to 200), bubble shields (armor), ammo jars and boxes, red, blue and yellow keys, and **Sugar Rush** candy (double damage and faster running for 20 seconds, usually hidden in secrets).

## How it is built
- The game logic runs on a 2D tile grid, the same way DOOM does. That covers movement, collision, enemy pathfinding, hit-scan weapons and doors.
- The world is drawn in real 3D with [Three.js](https://threejs.org) (WebGL):
  - Walls, floors and ceilings are built from the map.
  - Lighting comes from the sun and the sky, with soft shadows, distance fog and a gradient sky with clouds.
- Textures are painted in code on 256×256 canvases (brick, wood grain, stone, frosting, ice and so on). Bump maps give them surface relief.
- Characters, pickups and the toy weapons are 3D models built from smooth shapes, with glossy materials and cute faces.
- The HUD and menus are HTML on top of the 3D view.
- On slower devices the game automatically lowers resolution and then turns off shadows to keep frame rates smooth.

## Editing stages
The maps are the `MAPS` array in `index.html`; stage settings (name, textures, sky, starting toys) are in `STAGES`.

- **Walls:** `G` grass block, `L` hedge, `P` planks, `W` log, `C` cobble, `B` cream brick, `K` bookshelf, `U` `V` `Y` pink/blue/yellow wool, `N` sandstone, `H` chiseled sandstone, `I` ice, `Q` snow brick, `R` spruce, `J` candy stripe, `Z` cake, `E` chocolate.
- **Doors and goal:** `D` door, `1` red door, `2` blue door, `3` yellow door, `S` secret wall, `X` goal block.
- **Floors:** `.` and `,` are indoor floors, `~` and `-` are outdoor floors (open sky), `=` is water or jam. Each stage picks the textures for these.
- **Enemies:** `p` player start, `j` jelly, `m` shroom, `f` puff, `g` rocky, `d` bee, `v` teapot, `z` the stage's boss (set by `boss` in `STAGES`), `q` Jelly King.
- **Pickups:** `h` heart, `u` super heart, `a` shield, `b` bubbles, `c` confetti, `s` stars, `i` Sugar Rush, `w` confetti cannon, `x` star launcher, `r` `e` `y` red/blue/yellow keys.
- **Decorations:** `t` lantern, `o` flower, `k` cactus, `n` snowman, `l` lollipop.
