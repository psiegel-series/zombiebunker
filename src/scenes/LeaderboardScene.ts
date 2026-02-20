import Phaser from 'phaser'
import { getLeaderboardScores } from '../rundot'

const GAME_WIDTH = 390
const GAME_HEIGHT = 844

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Leaderboard' })
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f0f23)

    this.add
      .text(GAME_WIDTH / 2, 50, 'LEADERBOARD', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    const loadingText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)

    // Close button
    const closeBtnY = GAME_HEIGHT - 60
    const closeBtnBg = this.add
      .rectangle(GAME_WIDTH / 2, closeBtnY, 160, 44, 0x336633)
      .setStrokeStyle(2, 0x66cc66)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(GAME_WIDTH / 2, closeBtnY, 'Close', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0x448844))
    closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0x336633))
    closeBtnBg.on('pointerdown', () => {
      this.scene.start('Title')
    })

    // Fetch scores
    getLeaderboardScores().then(({ scores, myRank }) => {
      loadingText.destroy()

      if (scores.length === 0) {
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Leaderboard available\non run.game!', {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#aaaaaa',
            align: 'center',
          })
          .setOrigin(0.5)
        return
      }

      const startY = 100
      const rowHeight = 28

      // Header
      this.add
        .text(30, startY, '#', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#666666',
        })
      this.add
        .text(60, startY, 'PLAYER', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#666666',
        })
      this.add
        .text(GAME_WIDTH - 30, startY, 'SCORE', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#666666',
        })
        .setOrigin(1, 0)

      for (let i = 0; i < scores.length; i++) {
        const entry = scores[i]!
        const y = startY + 30 + i * rowHeight
        const isMyRank = myRank !== null && entry.rank === myRank
        const color = isMyRank ? '#ffcc00' : '#cccccc'

        this.add.text(30, y, String(entry.rank), {
          fontSize: '14px',
          fontFamily: 'monospace',
          color,
        })

        const name = entry.username.length > 16
          ? entry.username.slice(0, 15) + '…'
          : entry.username
        this.add.text(60, y, name, {
          fontSize: '14px',
          fontFamily: 'monospace',
          color,
        })

        this.add
          .text(GAME_WIDTH - 30, y, String(entry.score), {
            fontSize: '14px',
            fontFamily: 'monospace',
            color,
          })
          .setOrigin(1, 0)
      }
    })
  }
}
