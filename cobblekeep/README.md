# Cobble Keep

A bright, cute first-person shooter that plays like DOOM: keys, doors, secrets, a status bar and a face that reacts. The world is blocky pixel art. Five stages, with a boss at the end. Everything runs from one file (`index.html`) with no build step and no image or sound files.

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

## Editing stages
The maps are the `MAPS` array in `index.html`; stage settings (name, textures, sky, starting toys) are in `STAGES`.

- **Walls:** `G` grass block, `L` hedge, `P` planks, `W` log, `C` cobble, `B` cream brick, `K` bookshelf, `U` `V` `Y` pink/blue/yellow wool, `N` sandstone, `H` chiseled sandstone, `I` ice, `Q` snow brick, `R` spruce, `J` candy stripe, `Z` cake, `E` chocolate.
- **Doors and goal:** `D` door, `1` red door, `2` blue door, `3` yellow door, `S` secret wall, `X` goal block.
- **Floors:** `.` and `,` are indoor floors, `~` and `-` are outdoor floors (open sky), `=` is water or jam. Each stage picks the textures for these.
- **Enemies:** `p` player start, `j` jelly, `m` shroom, `f` puff, `g` rocky, `q` Jelly King.
- **Pickups:** `h` heart, `u` super heart, `a` shield, `b` bubbles, `c` confetti, `s` stars, `w` confetti cannon, `x` star launcher, `r` `e` `y` red/blue/yellow keys.
- **Decorations:** `t` lantern, `o` flower, `k` cactus, `n` snowman, `l` lollipop.
