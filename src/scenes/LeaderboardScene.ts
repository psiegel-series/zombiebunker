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
      const hasWaves = scores.some((s) => s.wave !== null)

      // Column positions
      const colRank = 20
      const colName = 50
      const colWave = GAME_WIDTH - 110
      const colScore = GAME_WIDTH - 20

      // Header
      this.add.text(colRank, startY, '#', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#666666',
      })
      this.add.text(colName, startY, 'PLAYER', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#666666',
      })
      if (hasWaves) {
        this.add
          .text(colWave, startY, 'WAVE', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#666666',
          })
          .setOrigin(1, 0)
      }
      this.add
        .text(colScore, startY, 'SCORE', {
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

        this.add.text(colRank, y, String(entry.rank), {
          fontSize: '14px',
          fontFamily: 'monospace',
          color,
        })

        const maxNameLen = hasWaves ? 12 : 16
        const name = entry.username.length > maxNameLen
          ? entry.username.slice(0, maxNameLen - 1) + '…'
          : entry.username
        this.add.text(colName, y, name, {
          fontSize: '14px',
          fontFamily: 'monospace',
          color,
        })

        if (hasWaves && entry.wave !== null) {
          this.add
            .text(colWave, y, String(entry.wave), {
              fontSize: '14px',
              fontFamily: 'monospace',
              color,
            })
            .setOrigin(1, 0)
        }

        this.add
          .text(colScore, y, String(entry.score), {
            fontSize: '14px',
            fontFamily: 'monospace',
            color,
          })
          .setOrigin(1, 0)
      }
    })
  }
}
