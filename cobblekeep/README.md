# Cobble Keep

A 3D fantasy first-person shooter that plays like DOOM: keys, doors, secrets, a status bar and a hero portrait that reacts. The Dark Wizard Morvane has stolen the Crown Crystal; you play a young squire, Rowan or Lyra, crossing five lands to bring it home. Ten stages in five worlds, each world ending with a boss. The game is one file (`index.html`) with no image or sound files. Three.js loads from a CDN, so it needs an internet connection the first time. Sculpted monsters load from `assets/cast/` (see below); opened straight from disk (`file://`) the game falls back to its simpler built-in models.

## Story
- **Hero:** pick Rowan (squire knight) or Lyra (spellblade squire) on the title screen. The choice changes the HUD portrait and the name used in the story.
- **Language:** English or 繁體中文, switched on the title screen. It starts in Chinese when the browser language is Chinese. Every menu, message, stage name and story line is translated.
- **Prologue:** four illustrated panels play the first time you start stage 1. The Prologue button on the title replays them.
- **Chapters:** the first stage of each world opens with a chapter panel. After each boss stage, the results card tells what happens next.
- **Bosses:** each boss arrives with a cinematic banner (name, title and a line) and says something when defeated: Grukk the Goblin Chief, Nocturna the Bat Queen, Sethep the Mummy King, Hrimgar the Frost Giant and Morvane the Dark Wizard.
- **Ending:** clearing stage 10 plays a four-panel epilogue before the final results.
- Story panels advance with a tap, click, Space or Enter, and can be skipped.

## Sculpted monsters
Monsters are sculpted in code as distance fields ("digital clay"): smooth shapes blended together, with eye sockets and mouths carved out, skinned to a bone rig so arms and legs bend when they walk and swing.

- **Source:** `sculpt/sdf.mjs` (the toolkit) and `sculpt/models/*.mjs` (one file per monster).
- **Build:** `node cobblekeep/sculpt/bake.mjs` (needs `npm i meshoptimizer`). It meshes each model, bakes colour, shading and bone weights into the vertices, and writes two detail levels to `assets/cast/<name>.hi.bin` and `<name>.lo.bin`. Run it again after changing a model and commit the `.bin` files.
- **Phones:** touch devices load the `.lo` files (about a quarter of the triangles) with a cheaper skin material. Nothing is sculpted on the device.
- **In the game:** eyes, teeth and weapons are simple shapes added at load time. The older built-in model is shown until a file arrives, then swapped.
- **Done so far:** goblin, Goblin Chief, imp mage, Dark Wizard, bat, Bat Queen, knight.

## Phone as a controller
Press **📱 Phone controller** on the title screen. The big screen (computer or TV browser) shows a QR code and a 5-letter room code. Scan it with a phone, or open `cobblekeep/controller.html` on the phone and type the code. Hold the phone sideways.

- **Playing:** left half is a floating stick (walk and sidestep), the right half turns when you drag, plus Attack (hold), Use, Swap weapon and 180° buttons. The top bar shows health, shield and ammo, with Map and Pause.
- **Menus and story:** the phone switches to arrows, OK and Back. The arrows move a gold highlight between the buttons on the big screen; in the story, OK turns the page and Back skips.
- **Phone settings (⚙):** drag aim on/off and speed, gyro aim on/off and speed (turn the phone left and right; iPhone asks for permission), auto-attack, vibration when hurt (Android only) and language. Settings are kept on the phone.
- One phone drives the game; a second phone takes over. If the phone disconnects, open the same page again and it rejoins.
- **How it connects:** PeerJS (WebRTC). The free PeerJS server only introduces the two sides, then they talk directly. Both need internet; some work or school networks block WebRTC. Add `?net=local` to both pages to test on one computer with two tabs.

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
| 1 2 3 4 / wheel | rune sword, arcane wand, repeater crossbow, fire staff |
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
Five worlds, two stages each: the meadow and village, the royal castle, the desert temple, the frozen peaks and finally the cursed royal capital, where the Dark Wizard has taken the palace. The second stage of each world is bigger and ends with a boss you must pop before the goal block will ring.

| # | Stage | Keys | Boss |
|---|---|---|---|
| 1 | Sunny Meadow | red | |
| 2 | Windmill Farm | red, blue | Goblin Chief |
| 3 | Castle Gate | red, blue | |
| 4 | Royal Kitchen | red, yellow | Bat Queen |
| 5 | Sandy Temple | red, yellow | |
| 6 | Oasis Ruins | red, blue | Mummy King |
| 7 | Frosty Peaks | red, blue, yellow | |
| 8 | Crystal Caverns | red, blue, yellow | Frost Giant |
| 9 | Cursed Town | red, yellow | |
| 10 | Shadow Palace | red, blue | Dark Wizard |

**Carry-over:** your health, shield and weapons carry over between stages. If you start from stage select, you get a fair starting kit for that stage.

**Retrying:** if you get bonked, the stage restarts with whatever you had when you entered it.

## Friends and foes
The Dark Wizard has filled Cobble Keep with monsters. They have a teen-friendly fantasy look: sculpted heads, painted almond eyes, cloth, leather, metal and crystal.

- **Goblin**: charges in and swings a spiked club.
- **Imp mage**: stays back and throws magic bolts from a crystal staff.
- **Fire wisp**: a floating flame that throws fireballs and drifts over hazards.
- **Haunted knight**: an empty suit of armour with a sword and shield. Slow, tough and hits hard.
- **Bat**: fast and flying, dives in for quick bites.
- **Crystal totem**: a rune-carved stone turret that stays put and fires three crystal bolts at a time.
- **Bosses**: the Goblin Chief, the Bat Queen, the Mummy King, the Frost Giant and the Dark Wizard. Each fires fans and rings of orbs, summons helpers and speeds up at half health.

Pickups: hearts (+25), super hearts (+100, up to 200), magic wards (armor), mana potions, quivers of bolts and fire runes (ammo), red, blue and yellow keys, and **Sugar Rush** candy (double damage and faster running for 20 seconds, usually hidden in secrets).

## How it is built
- The game logic runs on a 2D tile grid, the same way DOOM does. That covers movement, collision, enemy pathfinding, hit-scan weapons and doors.
- The world is drawn in real 3D with [Three.js](https://threejs.org) (WebGL):
  - Walls, floors and ceilings are built from the map.
  - Lighting comes from the sun and the sky, with soft shadows, distance fog and a gradient sky with clouds.
- Textures are painted in code on 256×256 canvases (brick, wood grain, stone, frosting, ice and so on). Bump maps give them surface relief.
- Characters, pickups and weapons are 3D models with painted cloth, leather, wood, metal and crystal. Every enemy attack has its own projectile (rune rings, fireballs, crystal shards, rocks, screech rings, sand, icicles, void orbs), with a particle trail and a hit flash. The wand and crossbow draw glowing streaks, the sword leaves a slash arc, and fireballs burst into a ring of flame.
- The HUD and menus are HTML on top of the 3D view.
- On slower devices the game automatically lowers resolution and then turns off shadows to keep frame rates smooth.

## Editing stages
The maps are the `MAPS` array in `index.html`; stage settings (name, textures, sky, starting weapons) are in `STAGES`.

- **Walls:** `G` grass block, `L` hedge, `P` planks, `W` log, `C` cobble, `B` cream brick, `K` bookshelf, `U` `V` `Y` pink/blue/yellow wool, `N` sandstone, `H` chiseled sandstone, `I` ice, `Q` snow brick, `R` spruce, `J` candy stripe, `Z` cake, `E` chocolate.
- **Doors and goal:** `D` door, `1` red door, `2` blue door, `3` yellow door, `S` secret wall, `X` goal block.
- **Floors:** `.` and `,` are indoor floors, `~` and `-` are outdoor floors (open sky), `=` is water or a cursed pool (cursed pools hurt). Each stage picks the textures for these, and can repaint a wall letter with `walls` (the cursed capital turns the castle tapestries `U` into torn banners).
- **Enemies:** `p` player start, `j` goblin, `m` imp mage, `f` fire wisp, `g` haunted knight, `d` bat, `v` crystal totem, `z` the stage's boss (set by `boss` in `STAGES`), `q` Dark Wizard. (Inside the code the old type names `jelly`, `shroom`, `puff`, `golem`, `bee` and `teapot` are kept; `TYPEMODEL` maps them to the new models.)
- **Pickups:** `h` heart, `u` super heart, `a` magic ward, `b` mana potion, `c` quiver of bolts, `s` fire runes, `i` Sugar Rush, `w` repeater crossbow, `x` fire staff, `r` `e` `y` red/blue/yellow keys.
- **Decorations:** `t` iron lamp post, `o` flower, `k` cactus, `n` frost crystals, `l` cursed crystal.
