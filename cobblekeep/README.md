# Cobble Keep

A 3D fantasy first-person shooter that plays like DOOM: keys, doors, secrets, a status bar and a hero portrait that reacts. The Dark Wizard Morvane has stolen the Crown Crystal; you play a young squire, Rowan or Lyra, crossing five lands to bring it home. Part I has ten stages in five worlds, each world ending with a boss. Part II, *The Rift Lands*, adds five more stages in three new worlds with three new bosses, and a Survival Arena mode. The game is one file (`index.html`) with no sound files. Three.js loads from a CDN, so it needs an internet connection the first time. Sculpted monsters load from `assets/cast/` and baked surfaces from `assets/tex/` (see below); opened straight from disk (`file://`) the game falls back to its simpler built-in models and painted textures.

## Story
- **Hero:** pick Rowan (squire knight) or Lyra (spellblade squire) on the title screen. The choice changes the HUD portrait and the name used in the story.
- **Language:** English or 繁體中文, switched on the title screen. It starts in Chinese when the browser language is Chinese. Every menu, message, stage name and story line is translated.
- **Prologue:** four illustrated panels play the first time you start stage 1. The Prologue button on the title replays them.
- **Chapters:** the first stage of each world opens with a chapter panel. After each boss stage, the results card tells what happens next.
- **Bosses:** each boss arrives with a cinematic banner (name, title and a line) and says something when defeated: Grukk the Goblin Chief, Nocturna the Bat Queen, Sethep the Mummy King, Hrimgar the Frost Giant and Morvane the Dark Wizard.
- **Ending:** clearing stage 10 plays a four-panel epilogue before the final results.
- Story panels advance with a tap, click, Space or Enter, and can be skipped.

## Part II: The Rift Lands
After the Crown Crystal comes home, a shard tears open a rift in the old Elderwood. Part II is picked from its own tab on the title screen; clearing stage 10 also offers to carry straight on.

| # | Stage | World | Keys | Boss |
|---|---|---|---|---|
| 11 | Elderwood Trail | Old woods | red, blue | |
| 12 | Gloomcap Hollow | Old woods | red, blue | Slime Queen (Glooma) |
| 13 | Ember Forge | Ember forge (lava) | red, blue | |
| 14 | Molten Depths | Ember forge (lava) | red, blue, yellow | Forge Titan (Ignar) |
| 15 | Rift Spire | Rift (void pools) | red, blue, yellow | Shade of Morvane |

- **Rune pillars:** every zone holds a carved pillar. Walk into it to light it (a beam of light rises). The rune seal only rings once every pillar is lit. The HUD shows how many are lit. Lighting one wakes a small ambush around it.
- **Sealed vaults:** every zone also has a vault behind a rune gate (`O`). It cannot be forced; it grinds open when that zone's pillar is lit, and holds a chest and two good items.
- **New monsters:** *slime* (hops in, splits into two slimelings when popped), *powder goblin* (sprints at you, lights the keg on its back and blows up; popped, it explodes too and hurts its friends), *shade mage* (ghostly, blinks away when hurt or crowded, throws slow homing ghost-flames), *shield warden* (its shield takes 85% off direct hits unless it is mid-swing or caught unaware; fire blasts and lightning get round it), *goblin shaman* (backs away and heals hurt monsters nearby with a green beam; pop it first).
- **New bosses:** the *Slime Queen* leaps to where you stand (a green ring marks the landing) and sheds two slimes at two thirds and one third health. The *Forge Titan* raises its fists while a red ring glows round it, then slams everything inside; it also throws molten rocks and calls powder goblins. The *Shade of Morvane* blinks round its tower, throws fans of homing ghost-flames and calls shade mages.
- **Thunder Rod (weapon 5):** found in the first zone of stage 11. Its bolt strikes the first foe in line and leaps to up to four more nearby, losing a little power each jump. Uses thunder crystals (cap 60), which turn up in Part II stages, chests and vaults.
- **New surfaces:** bark, living wood, thorn hedges, leaf litter and mossy paths; basalt with glowing cracks, riveted iron, forge brick, grates and lava; rift stone, void brick, star marble and void pools. They are painted in code like the original set (they have no baked versions yet).

## Ratings
Every cleared stage gets a rating as well as stars. **S** needs all three stars inside the stage's par time (par grows with the map's size); **A** is all three stars, or two stars inside one and a half times par; **B** is at least one star or inside par; otherwise **C**. The results card shows the time, the par time and the rating, and the stage list on the title remembers your best rating.

## Survival Arena
The third tab on the title screen. Three walled arenas: the Castle Colosseum, the Ember Pit (with lava pools) and the Rift Garden. Monsters pour in through four gates in waves; the mix grows from goblins and bats to wardens and shade mages. Every fifth wave a boss arrives (all eight take turns, with less health than in the story). Between waves there is a short break, supplies drop round the middle, and the field holds at most 18 monsters at once. You start with all five weapons. Score is earned per monster (champions count double) plus a bonus per wave; your best score and wave per arena are saved in the browser.

## Sculpted monsters
Monsters are sculpted in code as distance fields ("digital clay"): smooth shapes blended together, with eye sockets and mouths carved out, skinned to a bone rig so arms and legs bend when they walk and swing.

- **Source:** `sculpt/sdf.mjs` (the toolkit) and `sculpt/models/*.mjs` (one file per monster).
- **Build:** `node cobblekeep/sculpt/bake.mjs` (needs `npm i meshoptimizer`). It meshes each model, bakes colour, shading and bone weights into the vertices, and writes two detail levels to `assets/cast/<name>.hi.bin` and `<name>.lo.bin`. Run it again after changing a model and commit the `.bin` files.
- **Phones:** touch devices load the `.lo` files (about a quarter of the triangles) with a cheaper skin material, and the monsters cast no shadows. Nothing is sculpted on the device.
- **Far away:** monsters out of view or more than 15 tiles off update their pose every fourth frame.
- **In the game:** eyes, teeth and weapons are simple shapes added at load time. The older built-in model is shown until a file arrives, then swapped.
- **Done so far:** goblin, Goblin Chief, imp mage, Dark Wizard, bat, Bat Queen, knight, fire wisp, crystal totem, Mummy King, Frost Giant (the whole cast), plus the hero's four weapons, glove and bracer, all the scenery (cactus, lamp posts, flowers, frost crystals, cursed crystals) every pickup (hearts, ward shield, potions, quiver, fire runes, keys), and the solid cores of the monsters' attacks (rock, amethyst shard, icicle, scarab, void orb, ember, rune star). The hand-held kit always loads the detailed set.

## Baked surfaces
Walls, floors and ceilings in all five worlds are generated in code as height fields: bricks, stones, planks and tiles with chipped edges, grime, moss, frost and wood grain. From the height come normal maps (light catches the relief), roughness maps (marble and ice shine, plaster stays matte) and glow maps for cursed runes, key gems and the goal seal.

- **Source:** `tools/textures.js` (one recipe per texture).
- **Build:** serve the repo over HTTP, then `node cobblekeep/tools/bake-textures.cjs http://localhost:8000/cobblekeep/tools/texbake.html` (needs Playwright). It writes WebP files to `assets/tex/`: 1024 px for desktops and 512 px for phones, plus `index.json`.
- **In the game:** the old painted textures show first and are swapped for the baked set as it loads, one world at a time.

## Phone as a controller
Press **📱 Phone controller** on the title screen. The big screen (computer or TV browser) shows a QR code and a 5-letter room code. Scan it with a phone, or open `cobblekeep/controller.html` on the phone and type the code. Hold the phone sideways.

- **Playing:** left half is a floating stick (walk and sidestep), the right half turns when you drag, plus Attack (hold), Use, Swap weapon and 180° buttons. The top bar shows health, shield and ammo, with Map and Pause.
- **Menus and story:** the phone switches to arrows, OK and Back. The arrows move a gold highlight between the buttons on the big screen; in the story, OK turns the page and Back skips.
- **Phone settings (⚙):** drag aim on/off and speed, gyro aim on/off and speed (turn the phone left and right; iPhone asks for permission), auto-attack, vibration when hurt (Android only) and language. Settings are kept on the phone.
- One phone drives the game; a second phone takes over. If the phone disconnects, open the same page again and it rejoins.
- **How it connects:** PeerJS (WebRTC). The free PeerJS server only introduces the two sides, then they talk directly. Both need internet; some work or school networks block WebRTC. Add `?net=local` to both pages to test on one computer with two tabs.

## Maps
Each stage is generated from a fixed seed (the same layout every time), about three times the floor area of the original hand-drawn maps.

- **Safe house:** every stage starts in a small closed cabin with a few supplies. No monster is placed near it, and nothing gets in until you open its door.
- **Zones and keys:** the map is split into one zone per key. Each zone holds the key to the coloured door into the next, so keys always come in order (red, blue, yellow). The last zone holds the rune seal; on boss stages it sits in the boss's arena.
- **Inside a zone:** indoor halls and outdoor yards, joined by corridors with extra loops so there is more than one way round. Some halls are L-shaped or have pillars; some yards have pools.
- **Secrets:** every zone hides a closet behind a wall that opens when you press Use on it.
- **Checked:** the generator walks each map like a player (picking up keys, opening doors) and only keeps a layout where the seal, every key, monster and pickup can be reached.
- **Treasure chests:** one or two per zone (some in secret closets). Press Use in front of one to open it: it spills two or three good items (big hearts, wards, elixirs, ammo) and counts as treasure.
- **Barrels and powder kegs:** barrels stand along walls and break when hit, sometimes dropping supplies. Red powder kegs explode when hit, hurting monsters (and you, if you stand too close) and setting off kegs nearby.
- **Spike traps:** after the first zone, some corridors are crossed by spike plates that rise every few seconds. Watch for the click and time your run.
- **Champions:** about one monster in ten is a champion: bigger, three times the health, harder hits and a golden glow. Defeating one drops a big heart, a ward or an elixir.
- The generator is `genLevel()` in `index.html`; sizes, key counts and monster mixes per stage are in `GEN`.

## Play
Open `index.html` in a browser, or play it at https://k-mertin.github.io/littlethings/cobblekeep/.

- **Pick a stage:** every stage can be chosen from the title screen on any device. Nothing is locked.
- **Records:** cleared stages show a tick, your best time and stars. These are saved in that browser.
- **Direct link:** add `#stage7` (or any number 1–15) to the URL to open the title screen with that stage ready to play.
- **Mouse:** click inside the view to capture the mouse. Press Esc to release it and pause. The pause menu can restart the stage or return to stage select.
- **Length:** a full playthrough of all 10 stages takes about an hour.

| Key | Action |
|---|---|
| WASD | move (Shift to run) |
| Mouse | look; left click to shoot (F or Ctrl also shoot) |
| E / Space | open doors, ring the goal block |
| 1 2 3 4 5 / wheel | rune sword, arcane wand, repeater crossbow, fire staff, thunder rod |
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
- **Enemies:** `p` player start, `j` goblin, `m` imp mage, `f` fire wisp, `g` haunted knight, `d` bat, `v` crystal totem, `*` slime, `+` powder goblin, `?` shade mage, `@` shield warden, `<` goblin shaman, `z` the stage's boss (set by `boss` in `STAGES`), `q` Dark Wizard. (Inside the code the old type names `jelly`, `shroom`, `puff`, `golem`, `bee` and `teapot` are kept; `TYPEMODEL` maps them to the new models.)
- **Pickups:** `h` heart, `u` super heart, `a` magic ward, `b` mana potion, `c` quiver of bolts, `s` fire runes, `)` thunder crystals, `i` Sugar Rush, `w` repeater crossbow, `x` fire staff, `(` thunder rod, `r` `e` `y` red/blue/yellow keys.
- **Part II objects:** `|` rune pillar, `O` rune gate of a sealed vault. The generator records which zone each pillar and gate belongs to (`rows.meta`), so a pillar opens its own zone's vault.
- **Decorations:** `t` iron lamp post, `o` flower, `k` cactus, `n` frost crystals, `l` cursed crystal.
