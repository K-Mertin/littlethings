# Crystal Outpost

A bright little real-time strategy game in the spirit of StarCraft. Mine crystals and gas, build a base, train an army and destroy every building of the red computer team. Everything is in one file (`index.html`): no build step, no image or sound files, no libraries.

## Play
Open `index.html` in a browser, pick **Easy**, **Normal** or **Hard** and press **Start battle** (or Enter). A computer-vs-computer match plays behind the title screen.

You start in the bottom-left corner with a Command Center and five workers. The red team starts in the top-right corner. Every map is randomly generated, and both sides always get the same layout (it is mirrored).

### Mouse and keyboard
| Input | Action |
|---|---|
| Left-click a unit / drag a box | select. A box with soldiers in it leaves the workers out. Shift adds, double-click or Ctrl+click selects that type on screen |
| Left-click or right-click the ground | soldiers attack-move there (they fight whatever they meet), workers walk |
| Left-click or right-click an enemy / crystals | attack it / mine them. On a building being built: help build. On a building: set its rally point |
| Esc or ✕ | deselect (Esc again pauses) |
| M / S / H / A | move without fighting / stop / hold position / attack (then click) |
| F2 or ⚔ Army | select the whole army |
| ` (backtick) | select the next idle worker |
| B | build menu for workers, then a building key and click to place. Hold Shift to place several |
| R / E | Trooper Rush / Tank Siege mode, once researched |
| Ctrl + 1–9 | make a group. Press the number to select it, twice to jump to it |
| Space | jump to the last "under attack" alert |
| Arrows, screen edge, mouse wheel, middle-drag, minimap | scroll and zoom (scrolling eases in and out) |
| Esc / P | cancel, or pause |

If you prefer classic StarCraft clicks (left-click only selects), turn off **Left-click / tap on the ground gives orders** in the pause menu.

Every button on the command card shows its hotkey, and hovering it shows the cost. The panels at the bottom only appear when something is selected, so the map stays clear.

### Phones and tablets
Tap a unit or building to select it. With units selected, tap the ground to move (soldiers fight on the way) or an enemy to attack. Drag with one finger to scroll (it glides when you flick), pinch to zoom, and **press and hold, then drag** to box-select. **⚔ Army** in the top bar selects every soldier. Landscape works best.

## Economy
- **Crystals**: workers mine them (5 per trip) and carry them back to a Command Center.
- **Gas**: build a Refinery on a green geyser. One worker at a time goes inside (4 per trip); three per Refinery is plenty.
- **Supply**: every unit takes supply. The Command Center gives 10 and each Supply Depot 8, up to 200.

## Buildings
| Building | Cost | Needs | Does |
|---|---|---|---|
| Command Center | 400 | – | trains Workers, takes resources, +10 supply. Can be built at other bases (expansions) |
| Supply Depot | 100 | – | +8 supply |
| Refinery | 75 | a gas geyser | lets workers collect gas |
| Barracks | 150 | Supply Depot | trains Troopers and Guardians, researches Rush |
| Factory | 150 + 100 gas | Barracks | builds Buggies and Tanks, researches Siege tech |
| Turret | 100 | Barracks | defensive gun tower, hits air and ground |
| Armory | 150 + 50 gas | Barracks | researches Weapons and Armor upgrades |
| Starport | 150 + 100 gas | Factory | builds Hornets and Gunships |

## Units
| Unit | Cost | Supply | Notes |
|---|---|---|---|
| Worker | 50 | 1 | mines, builds, weak melee attack |
| Trooper | 50 | 1 | ranged infantry, range 4, hits air and ground |
| Guardian | 100 | 2 | tough melee fighter with a shield, armor 1 |
| Buggy | 75 | 2 | very fast raider, short range |
| Tank | 150 + 100 gas | 3 | long range (6.5) with splash damage, armor 1 |
| Hornet | 125 + 50 gas | 2 | fast flying fighter, hits air and ground |
| Gunship | 200 + 150 gas | 4 | slow flying bomber with splash damage, ground only, armor 1 |

Flying units go straight over rocks, water and buildings. Only Troopers, Turrets and Hornets can shoot at them.

## Upgrades and abilities
| Research | Where | Cost | Effect |
|---|---|---|---|
| Weapons 1 / 2 | Armory | 100 + 100 / 175 + 175 gas | +1 damage for all units and turrets (Guardians and Gunships +2, Tanks +3, sieged Tanks +4). Level 2 needs a Factory |
| Armor 1 / 2 | Armory | 100 + 100 / 175 + 175 gas | +1 armor for all units. Level 2 needs a Factory |
| Rush training | Barracks | 100 + 100 gas | unlocks **Rush (R)**: Troopers run and shoot 50% faster for 8 seconds, at the cost of 10 health |
| Siege tech | Factory | 150 + 150 gas | unlocks **Siege mode (E)**: the Tank anchors down for range 10 and 40-damage shells, but can't move or hit anything right next to it. A move order packs it up again |

## The computer
The red team builds the same way you do: workers, depots, barracks, a refinery and factory, turrets, an armory, a starport and later an expansion. It researches upgrades, uses Rush and Siege mode in fights, and builds more Turrets, Troopers and Hornets when you send in air units. It attacks in waves that grow over time, defends its base when you get close, and pulls back if a wave is mostly destroyed.

| Level | Income | First attack | Waves |
|---|---|---|---|
| Easy | 75% | about 6:00 | small, grow slowly |
| Normal | 100% | about 4:30 | medium |
| Hard | 125% | about 3:30 | large, grow quickly; more turrets |

Your wins per level are saved in this browser.

## How it is built
- The map is 80×80 tiles of 32 px. Rocks, trees and water are random blobs, mirrored through the centre so both sides are fair; a flood fill carves a path if any base gets cut off.
- Units find their way with A* on the tile grid (8 directions, no corner cutting), and the path is smoothed with line-of-sight checks. Units push each other apart; mining workers slip past each other so mineral lines don't jam.
- The simulation runs at a fixed 30 steps per second, and units and shots are drawn between the last two steps so motion stays smooth on 60 and 120 Hz screens. Fog of war is a per-tile visibility grid, blurred when drawn.
- All art is drawn in code on a canvas: the terrain is baked once per game, units and buildings are drawn every frame, and the HUD icons reuse the same drawing code. Sounds are synthesized with the Web Audio API.
