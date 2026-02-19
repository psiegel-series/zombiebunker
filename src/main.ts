import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
})
