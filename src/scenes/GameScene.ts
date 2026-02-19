import Phaser from 'phaser'

const GAME_WIDTH = 390
const GAME_HEIGHT = 844
const MID_Y = Math.floor(GAME_HEIGHT / 2)

const GRID_COLS = 7
const GRID_ROWS = 7
const CELL_SIZE = 44
const CELL_GAP = 4
const GRID_TOTAL = CELL_SIZE + CELL_GAP

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' })
  }

  create() {
    this.drawBattlefield()
    this.drawBunker()
    this.drawGrid()
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

  private drawGrid() {
    const gridWidth = GRID_COLS * GRID_TOTAL - CELL_GAP
    const gridHeight = GRID_ROWS * GRID_TOTAL - CELL_GAP
    const startX = (GAME_WIDTH - gridWidth) / 2 + CELL_SIZE / 2
    const startY = MID_Y + (MID_Y - gridHeight) / 2 + CELL_SIZE / 2

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * GRID_TOTAL
        const y = startY + row * GRID_TOTAL
        this.add
          .rectangle(x, y, CELL_SIZE, CELL_SIZE)
          .setStrokeStyle(1, 0x3a506b)
      }
    }
  }
}
