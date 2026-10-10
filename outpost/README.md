# Crystal Outpost

A bright little real-time strategy game in the spirit of StarCraft. Mine crystals and gas, build a base, train an army and destroy every enemy building. Play as the **Blue Outpost** (machines) or **the Bloom** (plants and bugs), in a six-mission campaign or in skirmish matches, 1 vs 1 or 2 vs 2 with a computer ally. Everything is in one file (`index.html`): no build step, no image or sound files, no libraries.

## Play
Open `index.html` in a browser. The title screen has three choices; a computer-vs-computer match plays behind it.

- **Skirmish**: pick your options and press **Start battle** (or Enter).
- **Missions**: six short missions that teach the game. Each one unlocks the next and earns up to three stars.
- **Continue**: appears when there is an autosaved skirmish to pick up.

### Skirmish options
| Option | Choices |
|---|---|
| Mode | 1 vs 1, or 2 vs 2 with a computer ally (needs a medium or large map) |
| You play / Enemy | Blue Outpost, the Bloom, or a random enemy faction |
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
| R / E | abilities once researched: Rush (Troopers), Siege mode (Tanks), Harden (Beetles), Burrow (Burrowers). R on Blue workers repairs |
| Ctrl + 1–9 | make a group. Press the number to select it, twice to jump to it |
| Space | jump to the last "under attack" alert |
| Arrows, screen edge, mouse wheel, middle-drag, minimap | scroll and zoom (scrolling eases in and out) |
| Esc / P | cancel, or pause |

If you prefer classic StarCraft clicks (left-click only selects), turn off **Left-click / tap on the ground gives orders** in the pause menu. The panels at the bottom only appear when something is selected, so the map stays clear.

### Phones and tablets
Tap a unit or building to select it. With units selected, tap the ground to move (soldiers fight on the way) or an enemy to attack. Drag with one finger to scroll (it glides when you flick), pinch to zoom, and **press and hold, then drag** to box-select. **⚔** in the top bar selects every soldier. Landscape works best.

## Economy
- **Crystals**: workers mine them (5 per trip) and carry them back to a Command Center or Heart Tree.
- **Gas**: build a Refinery (Blue) or grow a Sap Well (Bloom) on a green geyser. One worker at a time goes inside (4 per trip); three per geyser is plenty.
- **Supply**: every unit takes supply. The main building gives 10, each Supply Depot / Seed Pod 8, up to 200.

## The Blue Outpost
Machines and soldiers. Workers build each structure by standing next to it, and they also repair damaged buildings and machines (Buggy, Tank, Hornet, Gunship). Idle workers repair anything damaged nearby on their own.

| Building | Cost | Needs | Does |
|---|---|---|---|
| Command Center | 400 | – | trains Workers, takes resources, +10 supply |
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
Plants and bugs. A Sprout walks to the spot and **turns into the building** (the Sprout is used up), and the building then grows by itself. Bloom buildings and creatures slowly heal themselves when they haven't been hit for a few seconds, and living ground spreads under their buildings.

| Building | Cost | Needs | Does |
|---|---|---|---|
| Heart Tree | 350 | – | grows Sprouts, takes resources, +10 supply |
| Seed Pod | 100 | – | +8 supply |
| Sap Well | 75 | a gas geyser | lets Sprouts collect sap (gas) |
| Nest | 150 | Seed Pod | hatches Spitters and Beetles, researches Hard shell |
| Hive | 150 + 100 gas | Nest | hatches Burrowers and Menders, researches Deep burrow |
| Thorn | 100 | Nest | spitting plant, hits air and ground |
| Grove | 150 + 50 gas | Nest | researches Venom (weapons) and Carapace (armor) |
| Spire | 150 + 100 gas | Hive | hatches Wasps and Spore Bombers |

| Unit | Cost | Supply | Notes |
|---|---|---|---|
| Sprout | 50 | 1 | gathers, turns into buildings |
| Spitter | 50 | 1 | ranged acid, hits air and ground |
| Beetle | 100 | 2 | armored melee. **Harden (R)**: 60% less damage for 6 s but slower; ready again after 18 s |
| Burrower | 100 + 50 gas | 2 | fast melee. **Burrow (E)**: hides underground where enemies can't see or hit it, bursts out when an enemy walks close, and the first hit does double damage |
| Mender | 75 + 75 gas | 2 | floating flower that heals nearby friends. Can't attack |
| Wasp | 120 + 50 gas | 2 | fast flyer, hits air and ground |
| Spore Bomber | 200 + 150 gas | 4 | slow floating bomber with splash, ground only |

Flying units go straight over rocks, water and buildings. Only Troopers, Spitters, Turrets, Thorns, Hornets and Wasps can shoot at them.

## Upgrades
| Research | Where | Cost | Effect |
|---|---|---|---|
| Weapons / Venom 1–2 | Armory / Grove | 100 + 100, then 175 + 175 gas | +1 damage for all units and towers (heavy units more). Level 2 needs a Factory / Hive |
| Armor / Carapace 1–2 | Armory / Grove | 100 + 100, then 175 + 175 gas | +1 armor for all units. Level 2 needs a Factory / Hive |
| Rush training | Barracks | 100 + 100 gas | unlocks Rush |
| Siege tech | Factory | 150 + 150 gas | unlocks Siege mode |
| Hard shell | Nest | 100 + 100 gas | unlocks Harden |
| Deep burrow | Hive | 125 + 125 gas | unlocks Burrow |

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
The computer plays either faction the same way you do: workers, supply, production buildings, gas, towers, upgrades, flyers and an expansion. It attacks in waves that grow over time, defends its base, pulls back if a wave is mostly destroyed, uses Rush, Siege mode, Harden and Burrow, keeps Menders with its army, and builds more anti-air when you send flyers. As your ally in 2 vs 2 it also guards your base.

| Level | Income | First attack | Waves |
|---|---|---|---|
| Easy | 75% | about 6:20 | small, grow slowly |
| Normal | 100% | about 5:00 | medium |
| Hard | 125% | about 4:00 | large, grow quickly |

In test matches between two Normal computers, games last about 11–12 minutes on a medium map, both factions win about equally often, and most games reach flying units. Your skirmish wins per level are saved in this browser.

## How it is built
- Maps are random blobs of rock, trees and water, mirrored through the centre so both sides are fair; a flood fill carves a path if any base gets cut off. Meadow, desert and snow maps use their own colors, trees (round trees, cacti and palms, snowy pines) and water.
- Units find their way with A* on the tile grid and smooth the path with line-of-sight checks. Flyers go straight. Units push each other apart; mining workers slip past each other so mineral lines don't jam.
- The simulation runs at a fixed 30 steps per second and units are drawn between steps, so motion stays smooth on 60 and 120 Hz screens. Fog of war is a per-tile visibility grid shared by your side, blurred when drawn.
- Teams sit on two sides, so 2 vs 2 uses the same rules as 1 vs 1. Each faction maps its buildings onto the same roles (main building, supply, gas, barracks, factory, air, tower, tech), which lets one computer player play either faction.
- All art is drawn in code on a canvas, the HUD icons reuse the same drawing code, and sounds are synthesized with the Web Audio API. Autosaves are JSON in `localStorage`.
