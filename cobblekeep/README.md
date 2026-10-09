# Cobble Keep

A bright, cute 3D first-person shooter that plays like DOOM: keys, doors, secrets, a status bar and a face that reacts. Five stages, with a boss at the end. Everything runs from one file (`index.html`) with no build step and no image or sound files. The only download is Three.js, loaded from a CDN, so it needs an internet connection the first time it loads.

## Play
Open `index.html` in a browser and click **Start**, or play it at https://k-mertin.github.io/littlethings/cobblekeep/. Click inside the view to capture the mouse; press Esc to release it and pause. Cleared stages unlock on the title screen (saved in this browser).

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
1. **Sunny Meadow**: hedges, a cottage (confetti cannon) and a well house with the red key. One secret.
2. **Cozy Castle**: courtyard, library (red key), a great hall with pillars (blue key). One secret.
3. **Sandy Temple**: desert ruin (red key), temple hall (star launcher), side chamber (yellow key), sanctum. One secret.
4. **Frosty Peaks**: frozen lake with icy water that hurts, a log cabin, and an ice castle that needs all three keys.
5. **Sugar Keep**: candy garden, a hall with a jam river, then the arena where the Jelly King waits. You have to pop him before the goal block will ring.

Your health, shield and toys carry over between stages. If you get bonked, the stage restarts with whatever you had when you entered it.

## Friends and foes
- **Jelly**: bouncy, bites up close. Its color changes with each stage.
- **Shroom**: stands back and spits spores.
- **Puff**: a flying cloud that throws zaps and floats over hazards.
- **Rocky**: a slow stone golem that hits hard.
- **Jelly King**: the boss. Throws a fan of orbs, summons jellies and speeds up at half health.

Pickups: hearts (+25), super hearts (+100, up to 200), bubble shields (armor), ammo jars/boxes, and red, blue and yellow keys.

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
- **Enemies:** `p` player start, `j` jelly, `m` shroom, `f` puff, `g` rocky, `q` Jelly King.
- **Pickups:** `h` heart, `u` super heart, `a` shield, `b` bubbles, `c` confetti, `s` stars, `w` confetti cannon, `x` star launcher, `r` `e` `y` red/blue/yellow keys.
- **Decorations:** `t` lantern, `o` flower, `k` cactus, `n` snowman, `l` lollipop.
