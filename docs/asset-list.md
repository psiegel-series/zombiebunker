# Asset List — Zombie Bunker

All sprites should be PNG with transparent backgrounds. All audio should be MP3 or OGG (Phaser supports both).

## Sprites — put in `public/sprites/`

### Tiles (should all be the same square size, e.g. 16x16 or 32x32, will be scaled to 44px)

| File | Description | Notes |
|---|---|---|
| `tile_bullet_n.png` | Bullet North tile | Yellow, upward arrow |
| `tile_bullet_s.png` | Bullet South tile | Amber, downward arrow |
| `tile_bullet_e.png` | Bullet East tile | Blue, right arrow |
| `tile_bullet_w.png` | Bullet West tile | Purple, left arrow |
| `tile_grenade.png` | Grenade tile | Red, grenade/bomb icon |
| `tile_gasoline.png` | Gasoline tile | Orange, flame/gas can icon |
| `tile_medkit.png` | Medkit tile | Green, red cross icon |
| `tile_heavy_n.png` | Powered-up Bullet N | Same as bullet_n but visually enhanced (glow/border) |
| `tile_heavy_s.png` | Powered-up Bullet S | Same as bullet_s but enhanced |
| `tile_heavy_e.png` | Powered-up Bullet E | Same as bullet_e but enhanced |
| `tile_heavy_w.png` | Powered-up Bullet W | Same as bullet_w but enhanced |
| `tile_rocket.png` | Powered-up Grenade | Enhanced grenade/rocket icon |
| `tile_napalm.png` | Powered-up Gasoline | Enhanced flame icon |
| `tile_mega_medkit.png` | Powered-up Medkit | Enhanced medkit icon |
| `tile_airstrike.png` | Airstrike tile | White/bright, star or crosshair icon |

### Bunker (any size, will be scaled to 48x48)

| File | Description |
|---|---|
| `bunker.png` | Top-down bunker/fortress |

### Zombies (same size, e.g. 16x16 or 32x32, will be scaled per type)

| File | Description | Notes |
|---|---|---|
| `zombie_walker.png` | Walker zombie | Green, standard humanoid, top-down |
| `zombie_runner.png` | Runner zombie | Yellow-green, thinner/smaller |
| `zombie_tank.png` | Tank zombie | Dark green, bulkier/wider |
| `zombie_boss.png` | Boss zombie | Purple, largest, menacing |

### Effects (small, e.g. 8x8 or 16x16)

| File | Description | Notes |
|---|---|---|
| `particle_explosion.png` | Explosion particle | Small orange/red dot, used in particle emitters |
| `bullet_trail.png` | Bullet projectile | Small elongated yellow shape |

## Audio — put in `public/audio/`

| File | Description | Notes |
|---|---|---|
| `sfx_match.mp3` | Tile match clear | Short rising chime, ~0.3s |
| `sfx_bullet.mp3` | Bullet fire | Short pew/snap, ~0.2s |
| `sfx_explosion.mp3` | Grenade/rocket explosion | Boom with decay, ~0.5s |
| `sfx_fire.mp3` | Gasoline/napalm ignition | Whoosh/crackle, ~0.4s |
| `sfx_airstrike.mp3` | Airstrike | Loud descending sweep + boom, ~0.8s |
| `sfx_heal.mp3` | Medkit heal | Soft ascending tone, ~0.3s |
| `sfx_damage.mp3` | Bunker takes damage | Impact thud, ~0.3s |
| `sfx_zombie_death.mp3` | Zombie killed | Short low splat/thud, ~0.2s |
| `sfx_wave_start.mp3` | New wave beginning | Alert horn/klaxon, ~0.5s |
| `music_loop.mp3` | Background music | Looping tension/ambient track, 8-30s, must loop cleanly |

## Constraints

- **Pixel art style** for all sprites — the game config has `pixelArt: true` so they'll render with nearest-neighbor scaling (crisp pixels, no blur)
- **Top-down perspective** for bunker and zombies (battlefield is viewed from above)
- **Transparent backgrounds** on all PNGs
- **Square tiles** — all 15 tile sprites should be the same dimensions
- **All 4 zombie sprites** should be the same dimensions
- Audio should be relatively quiet/normalized — they'll all play at the same volume initially
