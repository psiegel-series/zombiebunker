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

## Phase 4 — Row/Column Slide Input (REWORK)

~~Original: tap-to-swap. Replaced with 10000000-style slide mechanic.~~

Replace the tap-to-swap input with drag-to-slide. The player drags a row horizontally or a column vertically. Tiles wrap around. Matches are previewed while dragging and confirmed on release.

### Tasks

- [x] ~~(Old) Tap-to-swap implementation~~ — to be replaced
- [x] On pointer down on a tile, begin tracking drag direction (horizontal = row slide, vertical = column slide). Lock to one axis after a small threshold.
- [x] While dragging, shift the entire row or column by the drag delta. Tiles wrap around: a tile sliding off one edge appears on the opposite edge.
- [x] Update tile display positions in real time as the player drags (smooth, pixel-level movement)
- [x] While dragging, run match detection on the current board state and highlight matched tiles (pulsing glow or bright border)
- [x] Snap tiles to the nearest whole-cell position on release
- [x] On release, if matches exist at the snapped position, commit the board state and trigger match clearing
- [x] On release, if no matches exist, animate tiles snapping back to their original positions (invalid move)
- [x] Remove the old tap-to-swap and selection highlight code

### Tests

- [x] Dragging a tile horizontally shifts the entire row, with tiles wrapping around the edges
- [x] Dragging a tile vertically shifts the entire column, with tiles wrapping around the edges
- [x] While dragging, matched tiles are visually highlighted in real time
- [x] On release, tiles snap to the nearest cell position
- [x] If matches exist on release, they clear and cascade as normal
- [x] If no matches exist on release, tiles snap back to their original positions
- [x] Dragging feels smooth and responsive — tiles follow the pointer in real time

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

- [x] After clearing, make remaining tiles fall down to fill empty cells below them (animate the fall)
- [x] Fill empty cells at the top of each column with new random tiles (animate them dropping in)
- [x] After refill, re-run match detection on the full board
- [x] If new matches exist, clear them and repeat the gravity/refill cycle
- [x] Continue cascading until the board stabilizes with no matches
- [x] Add a brief delay between each cascade step so the player can see what's happening

### Tests

- [x] After a match clears, tiles above the gap slide down smoothly
- [x] New tiles appear at the top of columns and fall into empty spaces
- [x] If falling tiles create new 3+ matches, those matches auto-clear without player input
- [x] Cascades can chain multiple times (create a scenario where this happens — may take several tries)
- [x] The board always ends in a stable state with no remaining matches and no empty cells

---

## Phase 7 — Match Effect Dispatch

Wire up the match-clearing system to dispatch tile effects. No battlefield targets yet (that comes with zombies), but the framework for handling each tile type's effect is in place.

### Tasks

- [x] After each match clears, identify the tile type and log the effect that would fire (e.g., "Bullet N fired", "Grenade launched", "Gasoline burst", "Medkit heal")
- [x] Create an event emitter or callback system so GameScene can react to match effects
- [x] Distinguish between the 4 bullet directions in the effect dispatch
- [x] Grenade effect should note "targets densest cluster" (actual targeting comes in phase 10)
- [x] Gasoline effect should note "damages nearby zombies" (actual damage comes in phase 11)
- [x] Medkit effect is wired into bunker HP (implemented in phase 8)

### Tests

- [x] Making a match of any tile type logs the correct effect name in the browser console
- [x] Bullet N, S, E, W matches each log their specific direction
- [x] Multiple matches in a single cascade each log their own effect independently

---

## Phase 8 — Bunker HP & Medkit Healing

Add bunker health. Medkit matches heal the bunker. Display an HP bar.

### Tasks

- [x] Add bunker HP state (e.g., max 100, starts at 100)
- [x] Draw an HP bar above or below the bunker in the battlefield
- [x] When a Medkit match clears, restore HP (e.g., +10 per match)
- [x] Cap healing at max HP
- [x] Add a temporary debug button or keyboard shortcut to deal damage to the bunker (for testing healing)

### Tests

- [x] An HP bar is visible near the bunker, initially full
- [x] Pressing the debug damage key reduces the HP bar visibly
- [x] Making a Medkit match increases the HP bar
- [x] HP does not exceed the maximum (heal when already full — bar stays full)
- [x] HP bar color or appearance reflects current health (e.g., green → yellow → red)

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

Directional bullet matches fire at zombies in that direction. Grenade matches auto-target the densest zombie cluster.

### Tasks

- [ ] When a Bullet N/S/E/W match clears, find the nearest zombie(s) in that fixed direction from the bunker and deal damage
- [ ] Animate a bullet projectile or flash effect from the bunker in the bullet's direction
- [ ] When a Grenade match clears, find the densest cluster of zombies on the battlefield and launch a grenade at that area
- [ ] Animate a grenade arc or explosion effect at the target area
- [ ] When a zombie's HP reaches 0, play a death animation and remove it

### Tests

- [ ] Making a Bullet N match fires northward and damages/kills the nearest zombie to the north
- [ ] Making a Bullet E match fires eastward — confirming each direction works independently
- [ ] Making a Bullet match in a direction with no zombies fires into empty space (no crash, visual still plays)
- [ ] Making a Grenade match shows an explosion at the densest group of zombies
- [ ] Grenade explosion damages multiple zombies if they are clustered together
- [ ] Killed zombies visually disappear from the battlefield

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

---

## Phase 12 — Bonus Tiles (4-Match & Airstrike)

Implement powered-up tiles from 4-matches and Airstrike tiles from 5-match/T/L shapes.

### Tasks

- [ ] Detect 4-in-a-row matches: instead of clearing all 4, clear 3 and leave behind a powered-up tile in the 4th position
- [ ] Visually distinguish powered-up tiles (glow, border, or different shade)
- [ ] Implement powered-up effects when a powered-up tile is later matched: Heavy Ammo (piercing shot hitting multiple zombies in that direction), Rocket (bigger explosion radius), Napalm (lingering fire — visual only for now, damage over time can be simplified), Mega-Medkit (large heal)
- [ ] Detect 5-in-a-row, T-shape, and L-shape formations
- [ ] When these special shapes match, clear the tiles and leave behind an Airstrike tile
- [ ] Visually distinguish Airstrike tiles (unique color or icon)
- [ ] When an Airstrike tile is matched, damage all zombies on the battlefield
- [ ] Animate a screen-wide airstrike effect

### Tests

- [ ] Making a 4-in-a-row match leaves behind a special powered-up tile instead of clearing all 4
- [ ] Powered-up tiles look visually distinct from normal tiles
- [ ] Matching a powered-up Bullet tile fires a piercing shot that hits multiple zombies in that direction
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

- [ ] Create or source pixel art sprites for: bunker, 7 tile types (4 directional bullets + grenade + gasoline + medkit), powered-up tile variants, airstrike tile
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
