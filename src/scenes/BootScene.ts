import Phaser from 'phaser'
import { initRundot } from '../rundot'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' })
  }

  preload() {
    // Tile sprites
    const tileKeys = [
      'tile_bullet_n', 'tile_bullet_s', 'tile_bullet_e', 'tile_bullet_w',
      'tile_grenade', 'tile_gasoline', 'tile_medkit',
      'tile_heavy_n', 'tile_heavy_s', 'tile_heavy_e', 'tile_heavy_w',
      'tile_rocket', 'tile_napalm', 'tile_mega_medkit', 'tile_airstrike',
    ]
    for (const key of tileKeys) {
      this.load.image(key, `sprites/${key}.png`)
    }

    // Splash screen
    this.load.image('splash', 'splash.png')

    // Entity sprites
    this.load.image('bunker', 'sprites/bunker.png')
    this.load.image('zombie_walker', 'sprites/zombie_walker.png')
    this.load.image('zombie_runner', 'sprites/zombie_runner.png')
    this.load.image('zombie_tank', 'sprites/zombie_tank.png')
    this.load.image('zombie_boss', 'sprites/zombie_boss.png')

    // Effect sprites
    this.load.image('bullet_trail', 'sprites/bullet_trail.png')
    this.load.image('particle_explosion', 'sprites/particle_explosion.png')

    // Audio
    const sfxKeys = [
      'sfx_match', 'sfx_bullet', 'sfx_explosion', 'sfx_fire',
      'sfx_airstrike', 'sfx_heal', 'sfx_damage', 'sfx_zombie_death',
      'sfx_wave_start',
    ]
    for (const key of sfxKeys) {
      this.load.audio(key, `audio/${key}.mp3`)
    }
    this.load.audio('music_loop', 'audio/music_loop.mp3')
  }

  create() {
    initRundot()
    console.log('[ZombieBunker] BootScene ready')
    this.scene.start('Title')
  }
}
