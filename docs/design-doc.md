# Zombie Bunker - Game Design Document

## Overview

**Zombie Bunker** is a match-3 / tower-defense hybrid where the player defends a bunker from endless waves of zombies by matching tiles on a puzzle board to fire weapons, trigger explosions, and heal damage. Zombies move in real time, creating constant pressure to match quickly and strategically.

**Platform:** run.game (rundot SDK)
**Engine:** Phaser 3
**Build tool:** Vite
**Art style:** Pixel art
**Orientation:** Portrait
**Game ID:** RyRcXVnE4sChsoVv5PBL

---

## Screen Layout

The screen is divided into two halves in portrait orientation:

```
┌─────────────────────┐
│                     │
│     BATTLEFIELD     │
│                     │
│   Zombies approach  │
│   from all edges    │
│                     │
│      [BUNKER]       │
│                     │
├─────────────────────┤
│                     │
│    7x7 MATCH-3      │
│       GRID          │
│                     │
│                     │
└─────────────────────┘
```

- **Top half:** Battlefield. The bunker sits at the center. Zombies spawn at the edges and march toward it.
- **Bottom half:** 7x7 match-3 grid. The player swaps tiles here to trigger actions on the battlefield.

---

## Tile Types

There are **7 tile types** on the board. Four are directional bullets, and three are special actions:

| Tile | Icon Concept | Effect |
|------|-------------|--------|
| **Bullet N** | Up arrow | Fires bullets northward from the bunker. Damages the nearest zombies to the north. |
| **Bullet S** | Down arrow | Fires bullets southward from the bunker. Damages the nearest zombies to the south. |
| **Bullet E** | Right arrow | Fires bullets eastward from the bunker. Damages the nearest zombies to the east. |
| **Bullet W** | Left arrow | Fires bullets westward from the bunker. Damages the nearest zombies to the west. |
| **Grenade** | Grenade | Launches a grenade at the densest cluster of zombies on the battlefield. Explodes on impact, dealing area damage. |
| **Gasoline** | Gas can | Creates a burst of flames around the bunker, damaging all zombies in melee range. |
| **Medkit** | Red cross | Heals the bunker. |

The four bullet tiles each fire in a fixed direction -- the player must match the correct directional bullet to hit zombies in that area. Grenade auto-targets the densest group. Gasoline and Medkit are non-directional.

---

## Bonus Tiles

### 4-Match (Powered-Up Versions)

Matching 4 of the same tile in a row produces a **powered-up tile** that stays on the board. When that powered-up tile is later matched in a 3+, it triggers its enhanced effect:

| Base Tile | 4-Match Result | Enhanced Effect |
|-----------|---------------|-----------------|
| Any Bullet | **Heavy Ammo** | Piercing shot that hits multiple zombies in that direction |
| Grenade | **Rocket** | Bigger explosion radius |
| Gasoline | **Napalm** | Lingering fire that burns over time |
| Medkit | **Mega-Medkit** | Much larger heal |

### 5-Match, T-Shape, and L-Shape (Airstrike)

Any of these special formations -- regardless of tile type -- produces an **Airstrike** tile. When matched, the airstrike damages **all zombies on the battlefield**.

---

## Board Mechanics

- **Grid size:** 7 columns x 7 rows.
- **Slide mechanic (10000000-style):** Touch a tile and drag horizontally to shift its entire row, or vertically to shift its entire column. Tiles wrap around -- a tile pushed off one edge reappears on the opposite edge. While dragging, any matches that would form at the current position are highlighted (pulsing/glowing) as a preview. On release, tiles snap to the nearest cell position. If matches exist, they are cleared. If no matches exist at the release position, the tiles snap back to their original positions (invalid move).
- **Refill:** Top-fill. After tiles are cleared, remaining tiles fall down and new random tiles fill in from the top.
- **Cascades:** When falling tiles form new matches, those matches resolve and trigger their effects automatically. Cascades chain until the board stabilizes. No combo damage multiplier -- each match in a cascade triggers its normal effect.

---

## Timing

**Real-time.** Zombies move continuously, even while matches are resolving and cascades are playing out. The player is never safe to sit and think -- there is always urgency. This creates the core tension between careful puzzle-solving and the pressure of incoming threats.

---

## Zombies

### Types

| Type | Speed | HP | Notes |
|------|-------|----|-------|
| **Walker** | Normal | Normal | Baseline zombie. |
| **Runner** | Fast | Low | Quick but fragile. |
| **Tank** | Slow | High | Tough, soaks up damage. |
| **Boss** | Slow | Huge | Appears every 5 waves. Special attack (TBD). |

### Behavior

- Zombies spawn at the edges of the battlefield.
- They march toward the bunker at the center.
- When a zombie reaches the bunker, it deals damage.
- If the bunker's HP reaches zero, the game is over.

---

## Wave System

- **Structure:** Discrete waves with breaks between them. Each break gives the player a brief respite to set up the board.
- **Escalation:** Each wave introduces more zombies, faster zombies, and tougher zombies.
- **Boss waves:** Every 5th wave includes a Boss zombie alongside the regular horde.
- **Endless:** There is no final wave. The game continues until the bunker is destroyed.

---

## Scoring and Progression

- **Score** is based on zombies killed and waves survived.
- **Win condition:** None -- this is endless survival.
- **Loss condition:** Bunker HP reaches zero.
- **Leaderboard:** High scores are tracked via the rundot Leaderboard API. This is the primary progression hook.

---

## Summary of Key Parameters

| Parameter | Value |
|-----------|-------|
| Grid size | 7x7 |
| Tile types | 7 (4 directional bullets + grenade + gasoline + medkit) |
| Zombie types | 3 + Boss |
| Boss frequency | Every 5 waves |
| Timing | Real-time |
| Input | Slide row/column with wrapping (10000000-style) |
| Cascade multiplier | None |
| End condition | Endless (death) |
