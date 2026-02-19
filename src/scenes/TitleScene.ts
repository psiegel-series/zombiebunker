import Phaser from 'phaser'

const GAME_WIDTH = 390
const GAME_HEIGHT = 844

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' })
  }

  create() {
    // Cover-fit the splash image: scale uniformly to fill the screen, crop overflow
    const splash = this.add.sprite(GAME_WIDTH / 2, 0, 'splash').setOrigin(0.5, 0)
    const scale = Math.max(GAME_WIDTH / splash.width, GAME_HEIGHT / splash.height)
    splash.setScale(scale)

    const btnY = GAME_HEIGHT * 0.78
    const btnBg = this.add
      .rectangle(GAME_WIDTH / 2, btnY, 160, 50, 0x336633)
      .setStrokeStyle(2, 0x66cc66)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(GAME_WIDTH / 2, btnY, 'Play', {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x448844))
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x336633))
    btnBg.on('pointerdown', () => {
      this.scene.start('Game')
    })
  }
}
