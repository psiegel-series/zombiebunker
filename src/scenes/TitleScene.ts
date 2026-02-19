import Phaser from 'phaser'

const GAME_WIDTH = 390
const GAME_HEIGHT = 844

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' })
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f0f23)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'ZOMBIE\nBUNKER', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#cc4444',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5)

    const btnBg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 160, 50, 0x336633)
      .setStrokeStyle(2, 0x66cc66)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'Play', {
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
