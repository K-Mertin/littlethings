# Crystal Outpost

A bright little real-time strategy game in the spirit of StarCraft. Mine crystals and gas, build a base, train an army and destroy every enemy building. Play as the **Blue Outpost** (machines), **the Bloom** (plants and bugs) or **the Shards** (living crystal), three factions that build, grow and fight in different ways, in a six-mission campaign or in skirmish matches, 1 vs 1 or 2 vs 2 with a computer ally. Everything is in one file (`index.html`): no build step, no image or sound files, no libraries.

## Play
Open `index.html` in a browser. The title screen has three choices; a computer-vs-computer match plays behind it.

- **Skirmish**: pick your options and press **Start battle** (or Enter).
- **Missions**: six short missions that teach the game. Each one unlocks the next and earns up to three stars.
- **Continue**: appears when there is an autosaved skirmish to pick up.

### Skirmish options
| Option | Choices |
|---|---|
| Mode | 1 vs 1, or 2 vs 2 with a computer ally (needs a medium or large map) |
| You play / Enemy | Blue Outpost, the Bloom, the Shards, or a random enemy faction |
| Difficulty | Easy, Normal, Hard |
| Map size | Small (64×64), Medium (80×80), Large (104×104) |
| Map | Meadow, Desert, Snow or Random. Every map is randomly generated and mirrored so both sides are fair |
| Start with | Standard (50 crystals), More (400 + 150 gas), Lots (1500 + 600 gas) |
| Speed | Slow, Normal, Fast |

Your choices are remembered. Skirmish games autosave every 30 seconds and when you leave the page; **Continue** on the title screen picks the game back up. Missions don't autosave.

In 2 vs 2 your ally builds its own base, defends yours, attacks on its own, and joins in when you send three or more soldiers somewhere.

### Mouse and keyboard
| Input | Action |
|---|---|
| Left-click a unit / drag a box | select. A box with soldiers in it leaves the workers out. Shift adds, double-click or Ctrl+click selects that type on screen |
| Left-click or right-click the ground | soldiers attack-move there (they fight whatever they meet), workers walk |
| Left-click or right-click an enemy / crystals | attack it / mine them. On a Blue building being built: help build. On a building: set its rally point |
| Right-click your damaged building or machine (Blue workers) | repair it |
| Esc or ✕ | deselect (Esc again pauses) |
| M / S / H / A | move without fighting / stop / hold position / attack (then click) |
| F2 or ⚔ Army | select the whole army |
| ` (backtick) | select the next idle worker |
| B | build menu for workers, then a building key and click to place. Hold Shift to place several |
| R / E | abilities: Rush (Troopers), Siege mode (Tanks), Harden (Beetles), Burrow (Burrowers) once researched; Scanner Sweep (Command Center); Uproot / Root (Thorns); Blink (Blades, E); Barrier (Wardens, R). R on Blue workers repairs |
| Ctrl + 1–9 | make a group. Press the number to select it, twice to jump to it |
| Space | jump to the last "under attack" alert |
| Arrows, screen edge, mouse wheel, middle-drag, minimap | scroll and zoom (scrolling eases in and out) |
| Esc / P | cancel, or pause |

If you prefer classic StarCraft clicks (left-click only selects), turn off **Left-click / tap on the ground gives orders** in the pause menu. The panels at the bottom only appear when something is selected, so the map stays clear.

### Phones and tablets
Tap a unit or building to select it. With units selected, tap the ground to move (soldiers fight on the way) or an enemy to attack. Drag with one finger to scroll (it glides when you flick), pinch to zoom, and **press and hold, then drag** to box-select. **⚔** in the top bar selects every soldier. Landscape works best.

## Economy
- **Crystals**: workers mine them (5 per trip) and carry them back to a Command Center or Heart Tree.
- **Gas**: build a Refinery (Blue), grow a Sap Well (Bloom) or warp in a Prism Tap (Shards) on a green geyser. One worker at a time goes inside (4 per trip); three per geyser is plenty.
- **Supply**: every unit takes supply. The main building gives 10, each Supply Depot / Seed Pod / Obelisk 8, up to 200.

## How the three factions differ
| | Blue Outpost | The Bloom | The Shards |
|---|---|---|---|
| Making units | each building trains its own units, one at a time in a queue of five. More Barracks, bigger army | every creature hatches at a **Heart Tree** from **seeds**: 3 at most, a new one about every 10 seconds. Eggs grow side by side. Nest, Hive and Spire only unlock creatures | gates train one at a time, but if a gate's rally point is inside a **power field**, the new unit **warps in right there**, even across the map |
| Building | a worker stands next to the building until it is done, anywhere on open ground | a Sprout turns into the building and is used up. Buildings must grow on **living ground** | a Spark starts the warp and goes straight back to work; the building forms by itself. Most buildings need **power** from an Obelisk or the Crystal Core, and stop working without it |
| Toughness and healing | workers repair buildings and machines | everything heals slowly by itself, faster on living ground. Creatures also run 30% faster there | every unit and building has a **shield** that takes damage first and grows back fast after a few seconds out of combat. Health never heals |
| Special | **Scanner Sweep** reveals an area, including burrowed units, for 12 seconds | Spitters hatch **in pairs**, Wasp stings **poison**, Spore Bombers leave **acid pools**, **Thorns uproot** and walk | Blades **Blink**, Prisms and Monoliths fire **beams** that hit every ground enemy in a line, Wardens **recharge shields** and cast **Barrier** |

Each faction has an edge in one matchup and a harder time in another:

| Matchup | Edge | Why |
|---|---|---|
| Blue vs Bloom | Blue, slightly | Tank and Gunship splash is made for swarms of small creatures |
| Bloom vs Shards | Bloom, slightly | spit acid eats halfway through shields, poison and acid pools skip them entirely, and a swarm surrounds a small army |
| Shards vs Blue | Shards, slightly | Blades Blink onto Tanks, shields shrug off chip damage, and forward Obelisks bring reinforcements past Blue's defences |

## The Blue Outpost
Machines and soldiers. Workers build each structure by standing next to it, and they also repair damaged buildings and machines (Buggy, Tank, Hornet, Gunship). Idle workers repair anything damaged nearby on their own.

| Building | Cost | Needs | Does |
|---|---|---|---|
| Command Center | 400 | – | trains Workers, takes resources, +10 supply, Scanner Sweep (E) |
| Supply Depot | 100 | – | +8 supply |
| Refinery | 75 | a gas geyser | lets workers collect gas |
| Barracks | 150 | Supply Depot | trains Troopers and Guardians, researches Rush |
| Factory | 150 + 100 gas | Barracks | builds Buggies and Tanks, researches Siege tech |
| Turret | 100 | Barracks | defensive gun tower, hits air and ground |
| Armory | 150 + 50 gas | Barracks | researches Weapons and Armor |
| Starport | 150 + 100 gas | Factory | builds Hornets and Gunships |

| Unit | Cost | Supply | Notes |
|---|---|---|---|
| Worker | 50 | 1 | mines, builds, repairs |
| Trooper | 50 | 1 | ranged, hits air and ground. **Rush (R)**: 50% faster for 8 s, costs 10 health |
| Guardian | 100 | 2 | tough melee fighter with a shield |
| Buggy | 75 | 2 | very fast raider |
| Tank | 150 + 100 gas | 3 | long range with splash, ground only. **Siege mode (E)**: range 10, 40-damage shells, can't move |
| Hornet | 125 + 50 gas | 2 | fast flyer, hits air and ground |
| Gunship | 200 + 150 gas | 4 | slow flyer that bombs the ground with splash |

## The Bloom
Plants and bugs. A Sprout walks to the spot and **turns into the building** (the Sprout is used up), and the building then grows by itself on living ground. Every creature hatches at a Heart Tree; each egg costs one seed. A second or third Heart Tree means more seeds and a wider patch of living ground.

| Building | Cost | Needs | Does |
|---|---|---|---|
| Heart Tree | 350 | – | hatches every creature from seeds, takes resources, +10 supply |
| Seed Pod | 100 | – | +8 supply |
| Sap Well | 75 | a gas geyser | lets Sprouts collect sap (gas) |
| Nest | 150 | Seed Pod | unlocks Spitters and Beetles, researches Hard shell |
| Hive | 150 + 100 gas | Nest | unlocks Burrowers and Menders, researches Deep burrow |
| Thorn | 100 | Nest | spitting plant, hits air and ground. **Uproot (E)**: pulls up its roots and walks slowly (it can't shoot while walking), then **Root (E)** plants it again on living ground |
| Grove | 150 + 50 gas | Nest | researches Venom (weapons) and Carapace (armor) |
| Spire | 150 + 100 gas | Hive | unlocks Wasps and Spore Bombers |

| Unit | Cost | Supply | Notes |
|---|---|---|---|
| Sprout | 50 | 1 | gathers, turns into buildings |
| Spitter | 50 for two | 1 for two | hatch in pairs. Weak alone, ranged acid, hits air and ground. Acid eats through shields: half of it goes straight to health |
| Beetle | 100 | 2 | armored melee. **Harden (R)**: 60% less damage for 6 s but slower; ready again after 18 s |
| Burrower | 100 + 50 gas | 2 | fast melee. **Burrow (E)**: hides underground where enemies can't see or hit it (unless a Scanner Sweep finds it), bursts out when an enemy walks close, and the first hit does double damage |
| Mender | 75 + 75 gas | 2 | floating flower that heals nearby friends. Can't attack |
| Wasp | 120 + 50 gas | 2 | fast flyer, hits air and ground. Its sting poisons: 3 damage a second for 4 seconds |
| Spore Bomber | 200 + 150 gas | 4 | slow floating bomber with splash, ground only. Each bomb leaves an acid pool that hurts ground units standing in it for 5 seconds |

Flying units go straight over rocks, water and buildings. Only Troopers, Spitters, Lancers, Turrets, Thorns, Shard Cannons, Hornets, Wasps and Gliders can shoot at them.

## The Shards
Living crystal. Few units, each one strong and expensive. A Spark starts a warp and goes back to mining; the building forms by itself (it can't be sped up). Shields regrow, health doesn't, so pull hurt units back for a few seconds and send them in again.

| Building | Cost | Needs | Does |
|---|---|---|---|
| Crystal Core | 400 | – | trains Sparks, takes resources, +10 supply, powers the area around it |
| Obelisk | 100 | – | +8 supply, powers Shard buildings within 6.5 tiles. Units from gates can warp in next to it |
| Prism Tap | 75 | a gas geyser | lets Sparks collect gas. Needs no power |
| Warp Gate | 150 | Obelisk | trains Lancers and Blades, researches Blink |
| Prism Forge | 150 + 100 gas | Warp Gate | trains Prisms and Wardens, researches Barrier |
| Shard Cannon | 125 | Warp Gate | crystal tower, hits air and ground |
| Sanctum | 150 + 50 gas | Warp Gate | researches Resonance (weapons) and Lattice (armor) |
| Sky Gate | 150 + 150 gas | Prism Forge | trains Gliders and Monoliths |

| Unit | Cost | Supply | Shield + health | Notes |
|---|---|---|---|---|
| Spark | 50 | 1 | 20 + 25 | gathers, warps in buildings |
| Lancer | 100 | 2 | 40 + 45 | throws light spears at air and ground |
| Blade | 125 + 25 gas | 2 | 60 + 80 | fast sword fighter. **Blink (E)**: jump up to 6 tiles in an instant, ready again after 9 s |
| Prism | 150 + 100 gas | 3 | 70 + 90 | long beam that hurts every ground enemy in a line. Ground only |
| Warden | 75 + 100 gas | 2 | 80 + 60 | recharges the shields of nearby friends. **Barrier (R)**: fill the shields of every friend nearby at once, ready again after 30 s. Can't attack |
| Glider | 125 + 75 gas | 2 | 50 + 70 | fast flyer, hits air and ground |
| Monolith | 250 + 200 gas | 5 | 150 + 200 | huge floating crystal with a line beam, ground only |

## Upgrades
| Research | Where | Cost | Effect |
|---|---|---|---|
| Weapons / Venom / Resonance 1–2 | Armory / Grove / Sanctum | 100 + 100, then 175 + 175 gas | +1 damage for all units and towers (heavy units more). Level 2 needs a Factory / Hive / Prism Forge |
| Armor / Carapace / Lattice 1–2 | Armory / Grove / Sanctum | 100 + 100, then 175 + 175 gas | +1 armor for all units. Level 2 needs a Factory / Hive / Prism Forge |
| Rush training | Barracks | 100 + 100 gas | unlocks Rush |
| Siege tech | Factory | 150 + 150 gas | unlocks Siege mode |
| Hard shell | Nest | 100 + 100 gas | unlocks Harden |
| Deep burrow | Hive | 125 + 125 gas | unlocks Burrow |
| Blink | Warp Gate | 150 + 150 gas | unlocks Blink |
| Barrier | Prism Forge | 125 + 125 gas | unlocks Barrier |

## Missions
| # | Mission | You learn | Stars for |
|---|---|---|---|
| 1 | First Base | mining, workers, Supply Depot, Barracks, Troopers | finishing, under 5:00, 8+ workers |
| 2 | Hold the Line | defending against five waves for six minutes | surviving, Command Center never below half health, losing 8 units or fewer |
| 3 | Rescue | leading a squad with Rush, escorting freed workers home while Buggies hunt them | rescuing, under 4:00, all 5 workers saved |
| 4 | Break the Wall | Siege tech and sieged Tanks against a walled base | breaking in, under 10:00, losing 10 units or fewer |
| 5 | Sky Raid | Hornets and Gunships against three Refineries, with a 9-minute timer | finishing, under 6:00, losing 4 units or fewer |
| 6 | Final Outpost | a full match on a large snowy map against the Bloom on Hard | winning, under 20:00, losing 40 units or fewer |

Commander Pip explains each step in small message boxes on the left that close by themselves (tap to skip). The objective list above them can be folded away with **–**. Stars and unlocked missions are saved in this browser.

## The computer
The computer plays every faction the same way you do: workers, supply, production buildings, gas, towers, upgrades, flyers and an expansion. It attacks in waves that grow over time, defends its base, pulls back if a wave is mostly destroyed, uses Rush, Siege mode, Harden, Burrow, Blink and Barrier, keeps Menders and Wardens with its army, warps Shard reinforcements in at a forward Obelisk, and builds more anti-air when you send flyers. As your ally in 2 vs 2 it also guards your base.

| Level | Income | First attack | Waves |
|---|---|---|---|
| Easy | 75% | about 6:20 | small, grow slowly |
| Normal | 100% | about 5:00 | medium |
| Hard | 125% | about 4:00 | large, grow quickly |

In test matches between two Normal computers, games last about 10–11 minutes on a medium map. Across all three matchups each faction wins about as often as it loses, with the small edges shown in the matchup table above. Your skirmish wins per level are saved in this browser.

## How it is built
- Maps are random blobs of rock, trees and water, mirrored through the centre so both sides are fair; a flood fill carves a path if any base gets cut off. Meadow, desert and snow maps use their own colors, trees (round trees, cacti and palms, snowy pines) and water.
- Units find their way with A* on the tile grid and smooth the path with line-of-sight checks. Flyers go straight. Units push each other apart; mining workers slip past each other so mineral lines don't jam.
- The simulation runs at a fixed 30 steps per second and units are drawn between steps, so motion stays smooth on 60 and 120 Hz screens. Fog of war is a per-tile visibility grid shared by your side, blurred when drawn.
- Teams sit on two sides, so 2 vs 2 uses the same rules as 1 vs 1. Each faction maps its buildings onto the same roles (main building, supply, gas, barracks, factory, air, tower, tech), which lets one computer player play any faction.
- All art is drawn in code on a canvas, the HUD icons reuse the same drawing code, and sounds are synthesized with the Web Audio API. Autosaves are JSON in `localStorage`.
