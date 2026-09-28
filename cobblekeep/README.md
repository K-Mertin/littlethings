# Cobble Keep

A DOOM-style first-person shooter with blocky 16×16 pixel textures. Runs in the browser from one file (`index.html`), with no build step and no assets.

## Play
Open `index.html` in Chrome, Safari or Firefox and click **Click to play**. Clicking inside the view captures the mouse; press Esc to release it and pause.

| Key | Action |
|---|---|
| WASD | move (Shift to run) |
| Mouse | look; left click to fire (F or Ctrl also fire) |
| E / Space | open doors, use the exit switch |
| 1 2 3 / wheel | pickaxe, blaster, scattergun |
| Tab / M | automap |
| Arrow keys | turn and move without a mouse |
| P | pause |

## Level 1: The Undercroft
Start room → library (scattergun) → open-sky courtyard → lava hall (the red key sits on an island, reached by a stone bridge) → red door → obsidian vault with a stone brute guarding the exit switch. There is one secret wall near the start.

Enemies: **ghouls** (melee), **bone mages** (throw fire orbs; they hold position at range), **stone brute** (slow, heavy hits).

## Tech notes
- Raycaster at 400×225, scaled up with `image-rendering: pixelated`
- Textured walls, floor and ceiling; sky wraps a full 360°; lava floor animates and is fullbright
- Sliding doors, secret door, per-cell floor and ceiling types
- Enemies path with a BFS flow field toward the player, avoid lava, and stay idle until they see you or hear gunfire
- All textures, sprites, weapon art, face and HUD font are generated in code; sound effects use WebAudio

## Editing the level
The map is the `MAP` array in `index.html` (32 columns per row).
Walls: `C` cobble, `M` mossy, `K` bookshelf, `B` brick, `O` obsidian, `T` leaves. `D` door, `R` red door, `S` secret, `X` exit.
Floors: `.` stone, `,` planks, `~` grass (open sky), `=` lava.
Things: `p` player start, `z` ghoul, `s` mage, `b` brute, `h` health, `A` armor, `a` cells, `e` shells, `g` scattergun, `k` red key, `t` torch.
