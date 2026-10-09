# Crystal Outpost

A bright little real-time strategy game in the spirit of StarCraft. Mine crystals and gas, build a base, train an army and destroy every building of the red computer team. Everything is in one file (`index.html`): no build step, no image or sound files, no libraries.

## Play
Open `index.html` in a browser, pick **Easy**, **Normal** or **Hard** and press **Start battle** (or Enter). A computer-vs-computer match plays behind the title screen.

You start in the bottom-left corner with a Command Center and five workers. The red team starts in the top-right corner. Every map is randomly generated, and both sides always get the same layout (it is mirrored).

### Mouse and keyboard
| Input | Action |
|---|---|
| Left-click / drag a box | select (Shift adds, double-click or Ctrl+click selects that type on screen) |
| Right-click | move, attack, mine, help build, or set a building's rally point |
| A, then click | attack-move: fight anything met on the way (click an enemy to attack it) |
| M / S / H | move only / stop / hold position |
| B | build menu for workers, then a building key and click to place. Hold Shift to place several |
| Ctrl + 1–9 | make a group. Press the number to select it, twice to jump to it |
| ` (backtick) | select the next idle worker |
| Space | jump to the last "under attack" alert |
| Arrows, screen edge, middle-drag, minimap | scroll. The mouse wheel zooms |
| Esc / P | cancel, or pause |

Every button on the command card shows its hotkey, and hovering it shows the cost.

### Phones and tablets
Tap a unit or building to select it. With units selected, tap the ground to move or an enemy to attack. Drag with one finger to scroll and pinch to zoom. Press ⬚ in the top bar, then drag, to box-select. Landscape works best.

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
| Barracks | 150 | Supply Depot | trains Troopers and Guardians |
| Factory | 150 + 100 gas | Barracks | builds Buggies and Tanks |
| Turret | 100 | Barracks | defensive gun tower |

## Units
| Unit | Cost | Supply | Notes |
|---|---|---|---|
| Worker | 50 | 1 | mines, builds, weak melee attack |
| Trooper | 50 | 1 | ranged infantry, range 4 |
| Guardian | 100 | 2 | tough melee fighter with a shield, armor 1 |
| Buggy | 75 | 2 | very fast raider, short range |
| Tank | 150 + 100 gas | 3 | long range (6.5) with splash damage, armor 1 |

## The computer
The red team builds the same way you do: workers, depots, barracks, a refinery and factory, turrets, and later an expansion. It attacks in waves that grow over time, defends its base when you get close, and pulls back if a wave is mostly destroyed.

| Level | Income | First attack | Waves |
|---|---|---|---|
| Easy | 75% | about 6:00 | small, grow slowly |
| Normal | 100% | about 4:30 | medium |
| Hard | 125% | about 3:30 | large, grow quickly; more turrets |

Your wins per level are saved in this browser.

## How it is built
- The map is 80×80 tiles of 32 px. Rocks, trees and water are random blobs, mirrored through the centre so both sides are fair; a flood fill carves a path if any base gets cut off.
- Units find their way with A* on the tile grid (8 directions, no corner cutting), and the path is smoothed with line-of-sight checks. Units push each other apart; mining workers slip past each other so mineral lines don't jam.
- The simulation runs at a fixed 30 steps per second. Fog of war is a per-tile visibility grid, blurred when drawn.
- All art is drawn in code on a canvas: the terrain is baked once per game, units and buildings are drawn every frame, and the HUD icons reuse the same drawing code. Sounds are synthesized with the Web Audio API.
