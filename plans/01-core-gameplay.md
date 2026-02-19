# Plan 01: Core Gameplay

Build the game from zero to a playable prototype, phase by phase. Each phase produces something visually verifiable in the browser.

Reference: `docs/design-doc.md` for all game design decisions.

---

## Phase 1 — Project Scaffolding & Empty Screen

Set up the Vite + Phaser 3 project, integrate the rundot SDK, and get a blank game canvas rendering in portrait orientation.

### Tasks

- [x] Initialize a Vite project with TypeScript in the repo root
- [x] Install Phaser 3 and the rundot game SDK (`@series-inc/rundot-game-sdk`)
- [x] Configure `vite.config.ts` with `base: './'` for rundot compatibility
- [x] Create the Phaser game config: portrait dimensions (e.g. 390x844), pixel art rendering settings (`pixelArt: true`, `roundPixels: true`), transparent or solid background
- [x] Create a `BootScene` that imports the rundot SDK and logs a message to confirm SDK init
- [x] Register rundot lifecycle hooks (onPause/onResume) to pause/resume the Phaser game loop
- [x] Verify `npm run dev` launches the game in a browser with a colored background filling the canvas

### Tests

- [x] Running `npm run dev` opens a browser tab with a solid-colored Phaser canvas in portrait aspect ratio
- [x] Browser console shows the rundot SDK init log message (or no SDK errors if running outside run.game)
- [x] No errors in the browser console

---

## Phase 2 — Split Screen Layout

Divide the canvas into two regions: battlefield (top half) and match-3 grid area (bottom half). Use placeholder graphics.

### Tasks

- [x] Create a `GameScene` that Phaser transitions to after `BootScene`
- [x] Draw a visible divider line or color difference at the vertical midpoint of the canvas
- [x] In the top half, draw a placeholder rectangle for the bunker at center
- [x] In the top half, draw a placeholder line or triangle on the bunker to represent the turret facing North
- [x] In the bottom half, draw a 7x7 grid of empty cell outlines, evenly spaced and centered

### Tests

- [x] The screen is clearly split into two halves with different background colors or a visible divider
- [x] A rectangle representing the bunker is visible at the center of the top half
- [x] A line or triangle on the bunker indicates the turret's facing direction (North)
- [x] A 7x7 grid of cell outlines is visible in the bottom half, evenly spaced

---

## Phase 3 — Match-3 Board with Tiles

Populate the 7x7 grid with colored tiles representing the 7 tile types. No interaction yet.

### Tasks

- [x] Define the 7 tile types as an enum/constant (Bullets, CW, CCW, Grenade, Gasoline, Medkit, Boxes)
- [x] Assign each tile type a distinct color (placeholder — no sprites yet)
- [x] Create a `Board` class that holds a 7x7 2D array of tile types
- [x] Implement board generation: fill randomly while ensuring no initial 3-in-a-row matches exist
- [x] Render each tile as a colored square in its grid cell
- [x] Add a small icon or letter label on each tile to distinguish types beyond just color

### Tests

- [x] The 7x7 grid is filled with colored tiles — no empty cells
- [x] At least 5 different colors are visible (7 types means variety on any board)
- [x] No three-in-a-row matches are present on the initial board (count manually in a few rows/columns)
- [x] Each tile has a visible letter or icon making its type identifiable

---

## Phase 4 — Tile Selection & Swapping

Allow the player to tap two adjacent tiles to swap them. Only valid swaps (those that create a match) execute.

### Tasks

- [x] Add tap/click input handling on the grid: first tap selects a tile (highlight it), second tap on an adjacent tile attempts a swap
- [x] If the second tap is not adjacent, deselect and select the new tile instead
- [x] Before executing a swap, check if it would create at least one 3+ match
- [x] If the swap is invalid, play a brief "reject" animation (tiles bounce back)
- [x] If the swap is valid, animate the two tiles sliding into each other's positions and update the board data

### Tests

- [x] Tapping a tile highlights it visually (border, glow, or scale change)
- [x] Tapping an adjacent tile causes them to swap with a visible animation
- [x] Tapping a non-adjacent tile after selecting one changes the selection to the new tile
- [x] Attempting a swap that doesn't create a match causes tiles to bounce back to their original positions
- [x] After a valid swap, the two tiles are in their new positions on the board

---

## Phase 5 — Match Detection & Clearing

After a valid swap, detect all matches (3+), clear matched tiles with an animation, and leave gaps.

### Tasks

- [x] Implement match detection: scan all rows and columns for runs of 3+ identical tile types
- [x] After a valid swap, run match detection on the entire board
- [x] Animate matched tiles disappearing (fade out, shrink, or flash)
- [x] Remove matched tiles from the board data (leave empty cells)
- [x] Handle overlapping matches (e.g., a tile is part of both a row and column match) — clear all of them

### Tests

- [x] After a valid swap, matched tiles (3+ in a row/column) visually disappear
- [x] Tiles not part of a match remain in place
- [x] If a swap creates matches in both a row and column simultaneously (cross match), all matched tiles clear
- [x] After clearing, there are visible empty gaps in the grid

---

## Phase 6 — Gravity & Refill with Cascades

After matches clear, tiles fall down to fill gaps and new tiles spawn at the top. Cascading matches resolve automatically.

### Tasks

- [ ] After clearing, make remaining tiles fall down to fill empty cells below them (animate the fall)
- [ ] Fill empty cells at the top of each column with new random tiles (animate them dropping in)
- [ ] After refill, re-run match detection on the full board
- [ ] If new matches exist, clear them and repeat the gravity/refill cycle
- [ ] Continue cascading until the board stabilizes with no matches
- [ ] Add a brief delay between each cascade step so the player can see what's happening

### Tests

- [ ] After a match clears, tiles above the gap slide down smoothly
- [ ] New tiles appear at the top of columns and fall into empty spaces
- [ ] If falling tiles create new 3+ matches, those matches auto-clear without player input
- [ ] Cascades can chain multiple times (create a scenario where this happens — may take several tries)
- [ ] The board always ends in a stable state with no remaining matches and no empty cells

---

## Phase 7 — Turret Rotation

CW and CCW tile matches rotate the turret on the battlefield. Turret direction is visually reflected.

### Tasks

- [ ] Add turret direction state to the game (starts facing North)
- [ ] When a CW match clears, rotate the turret 90 degrees clockwise (N→E→S→W→N)
- [ ] When a CCW match clears, rotate the turret 90 degrees counterclockwise (N→W→S→E→N)
- [ ] Animate the turret rotation on the bunker sprite in the top half
- [ ] If multiple CW or CCW matches clear in one cascade, apply each rotation in sequence
- [ ] Display the current turret direction as text (e.g. "N", "E", "S", "W") near the bunker as a debug aid

### Tests

- [ ] Making a match of CW tiles causes the turret indicator on the bunker to rotate clockwise
- [ ] Making a match of CCW tiles causes the turret indicator to rotate counterclockwise
- [ ] The direction label near the bunker updates correctly after each rotation
- [ ] Multiple rotation matches in a cascade compound (e.g., two CW matches = 180 degree turn)

---

## Phase 8 — Bunker HP & Medkit Healing

Add bunker health. Medkit matches heal the bunker. Display an HP bar.

### Tasks

- [ ] Add bunker HP state (e.g., max 100, starts at 100)
- [ ] Draw an HP bar above or below the bunker in the battlefield
- [ ] When a Medkit match clears, restore HP (e.g., +10 per match)
- [ ] Cap healing at max HP
- [ ] Add a temporary debug button or keyboard shortcut to deal damage to the bunker (for testing healing)

### Tests

- [ ] An HP bar is visible near the bunker, initially full
- [ ] Pressing the debug damage key reduces the HP bar visibly
- [ ] Making a Medkit match increases the HP bar
- [ ] HP does not exceed the maximum (heal when already full — bar stays full)
- [ ] HP bar color or appearance reflects current health (e.g., green → yellow → red)

---

## Phase 9 — Zombies: Spawning & Movement

Spawn zombies at the edges of the battlefield and have them walk toward the bunker in real time.

### Tasks

- [ ] Define zombie data: type (Walker for now), HP, speed, position
- [ ] Create a zombie spawner that places a Walker at a random edge position of the battlefield
- [ ] Zombies move toward the bunker center at a constant speed each frame
- [ ] Render zombies as colored circles or simple sprites on the battlefield
- [ ] When a zombie reaches the bunker, it deals damage to bunker HP and is removed
- [ ] Add a debug button or auto-timer to spawn zombies for testing (not wave system yet)
- [ ] Zombies move continuously — they do not pause during match animations or cascades

### Tests

- [ ] Zombies appear at the edges of the battlefield as visible shapes
- [ ] Zombies visibly move toward the bunker over time
- [ ] When a zombie reaches the bunker, the HP bar decreases
- [ ] Zombies disappear after reaching the bunker
- [ ] Zombies keep moving even while the player is making matches and tiles are animating
- [ ] Multiple zombies can be on screen at once, each moving independently

---

## Phase 10 — Bullet & Grenade Combat

Bullet and Grenade matches fire at zombies. Bullets hit the nearest zombie in the turret's direction. Grenades explode in an area.

### Tasks

- [ ] When a Bullet match clears, find the nearest zombie(s) in the turret's facing direction and deal damage
- [ ] Animate a bullet projectile or flash effect from the bunker toward the target
- [ ] When a Grenade match clears, determine the target area (middle of the quadrant the turret faces) and deal area damage to all zombies in a radius
- [ ] Animate a grenade arc or explosion effect at the target area
- [ ] When a zombie's HP reaches 0, play a death animation and remove it
- [ ] Matching Boxes does nothing (confirm this is already the case)

### Tests

- [ ] Making a Bullet match with the turret facing zombies causes a visible projectile effect and damages/kills the nearest zombie
- [ ] Making a Bullet match facing a direction with no zombies fires into empty space (no crash, visual still plays)
- [ ] Making a Grenade match shows an explosion in the turret's facing quadrant
- [ ] Grenade explosion damages multiple zombies if they are clustered in that area
- [ ] Killed zombies visually disappear from the battlefield
- [ ] Box matches clear from the board but produce no battlefield effect

---

## Phase 11 — Gasoline (Melee AoE)

Gasoline matches damage zombies near the bunker, regardless of turret direction.

### Tasks

- [ ] When a Gasoline match clears, deal damage to all zombies within a defined melee radius around the bunker
- [ ] Animate a fire burst effect around the bunker
- [ ] Gasoline effect is non-directional (does not depend on turret facing)

### Tests

- [ ] Making a Gasoline match when zombies are close to the bunker damages/kills them
- [ ] The fire effect appears around the bunker, not in a specific direction
- [ ] Zombies far from the bunker are unaffected by Gasoline
- [ ] Gasoline works the same regardless of which direction the turret is facing

---

## Phase 12 — Bonus Tiles (4-Match & Airstrike)

Implement powered-up tiles from 4-matches and Airstrike tiles from 5-match/T/L shapes.

### Tasks

- [ ] Detect 4-in-a-row matches: instead of clearing all 4, clear 3 and leave behind a powered-up tile in the 4th position
- [ ] Visually distinguish powered-up tiles (glow, border, or different shade)
- [ ] Implement powered-up effects when a powered-up tile is later matched: Heavy Ammo (piercing line), Rocket (big explosion), Napalm (lingering fire — visual only for now, damage over time can be simplified), Mega-Medkit (large heal)
- [ ] Detect 5-in-a-row, T-shape, and L-shape formations
- [ ] When these special shapes match, clear the tiles and leave behind an Airstrike tile
- [ ] Visually distinguish Airstrike tiles (unique color or icon)
- [ ] When an Airstrike tile is matched, damage all zombies on the battlefield
- [ ] Animate a screen-wide airstrike effect

### Tests

- [ ] Making a 4-in-a-row match leaves behind a special powered-up tile instead of clearing all 4
- [ ] Powered-up tiles look visually distinct from normal tiles
- [ ] Matching a powered-up Bullet tile fires a piercing shot that hits multiple zombies
- [ ] Matching a powered-up Grenade tile creates a larger explosion than normal
- [ ] Matching a powered-up Medkit tile heals significantly more than a normal Medkit match
- [ ] Making a 5-in-a-row match produces an Airstrike tile
- [ ] Making a T-shape or L-shape match produces an Airstrike tile
- [ ] Matching an Airstrike tile damages every zombie on the battlefield

---

## Phase 13 — Wave System

Replace the debug spawner with a proper wave system: discrete waves with breaks, escalating difficulty, boss every 5 waves.

### Tasks

- [ ] Define wave data: wave number, zombie counts by type, spawn timing
- [ ] Implement a wave manager: spawn all zombies for the current wave over a period, then wait for all zombies to be cleared
- [ ] Add a break period between waves (e.g., 5 seconds) with a visible "Wave X Complete" / "Wave X+1 Starting" message
- [ ] Escalate difficulty each wave: increase zombie count, mix in Runners (from wave 3+) and Tanks (from wave 5+)
- [ ] Add Runner zombie type: faster speed, lower HP than Walker
- [ ] Add Tank zombie type: slower speed, higher HP than Walker
- [ ] Every 5th wave, spawn a Boss zombie: very high HP, slow, visually larger
- [ ] Display the current wave number on the HUD

### Tests

- [ ] The game starts with "Wave 1" and a small number of Walker zombies
- [ ] After all zombies in a wave are killed, a "Wave Complete" message appears
- [ ] After the break, the next wave starts automatically with more zombies
- [ ] Runner zombies appear in later waves and move noticeably faster
- [ ] Tank zombies appear in later waves and take noticeably more hits to kill
- [ ] Wave 5 includes a visually larger Boss zombie with very high HP
- [ ] The wave counter on the HUD increments correctly

---

## Phase 14 — Scoring, Game Over & Leaderboard

Track score, handle game over when bunker HP hits zero, submit to the rundot leaderboard.

### Tasks

- [ ] Track score: +points per zombie killed (vary by type), +bonus per wave survived
- [ ] Display score on the HUD
- [ ] When bunker HP reaches 0, stop the game loop and show a "Game Over" screen with final score and wave reached
- [ ] Add a "Play Again" button on the game over screen that resets all state and starts fresh
- [ ] Create a `config.json` in project root with leaderboard settings (simple mode, `requiresToken: false`)
- [ ] On game over, submit the score to the rundot Leaderboard API
- [ ] Display the player's rank from the submission response on the game over screen

### Tests

- [ ] Score increases when zombies are killed
- [ ] Score is visible on screen during gameplay
- [ ] When the bunker is destroyed, a Game Over screen appears showing the final score and wave number
- [ ] The "Play Again" button resets everything: full HP, wave 1, score 0, fresh board
- [ ] After game over, the leaderboard submission happens (check console for API call if not on run.game, or verify rank display if on platform)

---

## Phase 15 — Polish & Pixel Art Pass

Replace all placeholder graphics with pixel art, add sound effects, and tune game feel.

### Tasks

- [ ] Create or source pixel art sprites for: bunker, turret (4 directions), 7 tile types, powered-up tile variants, airstrike tile
- [ ] Create or source pixel art sprites for: Walker, Runner, Tank, Boss zombies
- [ ] Create or source pixel art effects for: bullet, grenade explosion, gasoline fire, airstrike, zombie death
- [ ] Replace all placeholder rectangles and circles with sprites
- [ ] Add tile swap, match, and cascade sound effects
- [ ] Add weapon fire and explosion sound effects
- [ ] Add zombie spawn and death sound effects
- [ ] Add background music (looping, low-key tension)
- [ ] Integrate rundot lifecycle hooks to mute audio on pause/sleep
- [ ] Tune game balance: zombie HP/speed values, weapon damage, heal amounts, wave pacing

### Tests

- [ ] All game elements use pixel art sprites, no colored rectangles remain
- [ ] Sound effects play for tile swaps, matches, weapon fires, and zombie deaths
- [ ] Background music plays during gameplay and stops on game over
- [ ] Audio mutes when the game is paused or backgrounded (rundot lifecycle)
- [ ] Game feels balanced: early waves are manageable, difficulty ramps feel fair, player can survive 10+ waves with good play
- [ ] The game runs at a stable frame rate without jank or stuttering
