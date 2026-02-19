import Phaser from 'phaser'
import { initRundot } from '../rundot'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' })
  }

  create() {
    initRundot()
    console.log('[ZombieBunker] BootScene ready')
    this.scene.start('Title')
  }
}
