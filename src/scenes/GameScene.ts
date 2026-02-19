import Phaser from 'phaser'
import { Board, GRID_COLS, GRID_ROWS } from '../board/Board'
import { TILE_COLORS, TILE_LABELS } from '../board/TileType'

export const GAME_WIDTH = 390
export const GAME_HEIGHT = 844
export const MID_Y = Math.floor(GAME_HEIGHT / 2)

export const CELL_SIZE = 44
export const CELL_GAP = 4
export const GRID_TOTAL = CELL_SIZE + CELL_GAP

export class GameScene extends Phaser.Scene {
  private board!: Board

  constructor() {
    super({ key: 'Game' })
  }

  create() {
    this.board = new Board()
    this.drawBattlefield()
    this.drawBunker()
    this.drawTiles()
  }

  private drawBattlefield() {
    // Top half: darker background for battlefield
    this.add.rectangle(GAME_WIDTH / 2, MID_Y / 2, GAME_WIDTH, MID_Y, 0x0f0f23)

    // Bottom half: slightly lighter for the grid area
    this.add.rectangle(GAME_WIDTH / 2, MID_Y + MID_Y / 2, GAME_WIDTH, MID_Y, 0x16213e)

    // Divider line
    this.add.rectangle(GAME_WIDTH / 2, MID_Y, GAME_WIDTH, 2, 0x3a506b)
  }

  private drawBunker() {
    const cx = GAME_WIDTH / 2
    const cy = MID_Y / 2

    // Bunker body
    this.add.rectangle(cx, cy, 48, 48, 0x4a4a6a).setStrokeStyle(2, 0x8888aa)

    // Turret: triangle pointing North, drawn with graphics for precise positioning
    const g = this.add.graphics()
    const tipY = cy - 24 - 28  // above bunker top edge
    g.fillStyle(0xcc4444)
    g.lineStyle(1, 0xff6666)
    g.beginPath()
    g.moveTo(cx, tipY)           // top point
    g.lineTo(cx + 10, cy - 24)  // bottom right (bunker top edge)
    g.lineTo(cx - 10, cy - 24)  // bottom left (bunker top edge)
    g.closePath()
    g.fillPath()
    g.strokePath()
  }

  private drawTiles() {
    const { startX, startY } = gridOrigin()

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.board.get(row, col)
        if (!tile) continue

        const x = startX + col * GRID_TOTAL
        const y = startY + row * GRID_TOTAL

        this.add
          .rectangle(x, y, CELL_SIZE, CELL_SIZE, TILE_COLORS[tile])
          .setStrokeStyle(1, 0x222222)

        this.add
          .text(x, y, TILE_LABELS[tile], {
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#000000',
          })
          .setOrigin(0.5)
      }
    }
  }
}

export function gridOrigin() {
  const gridWidth = GRID_COLS * GRID_TOTAL - CELL_GAP
  const gridHeight = GRID_ROWS * GRID_TOTAL - CELL_GAP
  const startX = (GAME_WIDTH - gridWidth) / 2 + CELL_SIZE / 2
  const startY = MID_Y + (MID_Y - gridHeight) / 2 + CELL_SIZE / 2
  return { startX, startY }
}
