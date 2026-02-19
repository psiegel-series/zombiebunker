import Phaser from 'phaser'
import { Board, GRID_COLS, GRID_ROWS } from '../board/Board'
import { TileType, TILE_COLORS, TILE_LABELS } from '../board/TileType'
import { MatchEffect, dispatchMatchEffects } from '../board/MatchEffects'

export const GAME_WIDTH = 390
export const GAME_HEIGHT = 844
export const MID_Y = Math.floor(GAME_HEIGHT / 2)

export const CELL_SIZE = 44
export const CELL_GAP = 4
export const GRID_TOTAL = CELL_SIZE + CELL_GAP

const BUNKER_MAX_HP = 100
const MEDKIT_HEAL = 10
const SWAP_DURATION = 150
const CLEAR_DURATION = 200
const FALL_DURATION_PER_ROW = 80
const CASCADE_PAUSE = 150

interface TileSprite {
  bg: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

export class GameScene extends Phaser.Scene {
  private board!: Board
  private tiles: (TileSprite | null)[][] = []
  private selected: { row: number; col: number } | null = null
  private selectionHighlight!: Phaser.GameObjects.Rectangle
  private animating = false
  private bunkerHp = BUNKER_MAX_HP
  private hpBarFill!: Phaser.GameObjects.Rectangle
  private hpBarBg!: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: 'Game' })
  }

  create() {
    this.board = new Board()
    this.animating = false
    this.selected = null
    this.bunkerHp = BUNKER_MAX_HP
    this.drawBattlefield()
    this.drawBunker()
    this.drawHpBar()
    this.createTiles()

    this.selectionHighlight = this.add
      .rectangle(0, 0, CELL_SIZE + 4, CELL_SIZE + 4)
      .setStrokeStyle(3, 0xffffff)
      .setVisible(false)
      .setDepth(10)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cell = pointerToGrid(pointer.x, pointer.y)
      if (cell) this.onTileClick(cell.row, cell.col)
    })

    // Debug: press D to deal 15 damage to the bunker
    this.input.keyboard!.on('keydown-D', () => {
      this.applyDamage(15)
    })
  }

  private drawBattlefield() {
    this.add.rectangle(GAME_WIDTH / 2, MID_Y / 2, GAME_WIDTH, MID_Y, 0x0f0f23)
    this.add.rectangle(GAME_WIDTH / 2, MID_Y + MID_Y / 2, GAME_WIDTH, MID_Y, 0x16213e)
    this.add.rectangle(GAME_WIDTH / 2, MID_Y, GAME_WIDTH, 2, 0x3a506b)
  }

  private drawBunker() {
    const cx = GAME_WIDTH / 2
    const cy = MID_Y / 2

    this.add.rectangle(cx, cy, 48, 48, 0x4a4a6a).setStrokeStyle(2, 0x8888aa)
  }

  private drawHpBar() {
    const cx = GAME_WIDTH / 2
    const cy = MID_Y / 2
    const barWidth = 80
    const barHeight = 10
    const barY = cy + 34

    this.hpBarBg = this.add
      .rectangle(cx, barY, barWidth, barHeight, 0x333333)
      .setStrokeStyle(1, 0x666666)

    const fillLeft = cx - barWidth / 2 + 1
    this.hpBarFill = this.add
      .rectangle(fillLeft, barY, barWidth - 2, barHeight - 2, 0x40d070)
      .setOrigin(0, 0.5)
  }

  private updateHpBar() {
    const fraction = Math.max(0, this.bunkerHp / BUNKER_MAX_HP)
    const maxWidth = this.hpBarBg.width - 2
    this.hpBarFill.width = maxWidth * fraction

    if (fraction > 0.6) {
      this.hpBarFill.fillColor = 0x40d070 // green
    } else if (fraction > 0.3) {
      this.hpBarFill.fillColor = 0xd0d040 // yellow
    } else {
      this.hpBarFill.fillColor = 0xd04040 // red
    }
  }

  applyDamage(amount: number) {
    this.bunkerHp = Math.max(0, this.bunkerHp - amount)
    this.updateHpBar()
    console.log(`[Bunker] Took ${amount} damage, HP: ${this.bunkerHp}/${BUNKER_MAX_HP}`)
  }

  private applyHeal(amount: number) {
    this.bunkerHp = Math.min(BUNKER_MAX_HP, this.bunkerHp + amount)
    this.updateHpBar()
    console.log(`[Bunker] Healed ${amount}, HP: ${this.bunkerHp}/${BUNKER_MAX_HP}`)
  }

  private createTiles() {
    this.tiles = Array.from({ length: GRID_ROWS }, () =>
      Array.from<TileSprite | null>({ length: GRID_COLS }).fill(null),
    )

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const type = this.board.get(row, col)
        if (!type) continue
        this.tiles[row]![col] = this.createTileAt(row, col, type)
      }
    }
  }

  private createTileAt(row: number, col: number, type: TileType): TileSprite {
    const { x, y } = gridPos(row, col)

    const bg = this.add
      .rectangle(x, y, CELL_SIZE, CELL_SIZE, TILE_COLORS[type])
      .setStrokeStyle(1, 0x222222)

    const label = this.add
      .text(x, y, TILE_LABELS[type], {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#000000',
      })
      .setOrigin(0.5)

    return { bg, label }
  }

  private onTileClick(row: number, col: number) {
    if (this.animating) return

    if (!this.selected) {
      this.select(row, col)
      return
    }

    const { row: sr, col: sc } = this.selected
    const isAdjacent =
      (Math.abs(sr - row) === 1 && sc === col) ||
      (Math.abs(sc - col) === 1 && sr === row)

    if (!isAdjacent) {
      this.select(row, col)
      return
    }

    // Adjacent tile clicked — attempt swap
    this.selectionHighlight.setVisible(false)
    this.selected = null

    if (this.board.wouldMatch(sr, sc, row, col)) {
      this.doSwap(sr, sc, row, col)
    } else {
      this.doRejectSwap(sr, sc, row, col)
    }
  }

  private select(row: number, col: number) {
    this.selected = { row, col }
    const { x, y } = gridPos(row, col)
    this.selectionHighlight.setPosition(x, y).setVisible(true)
  }

  private doSwap(r1: number, c1: number, r2: number, c2: number) {
    this.animating = true
    this.board.swap(r1, c1, r2, c2)

    const tile1 = this.tiles[r1]![c1]!
    const tile2 = this.tiles[r2]![c2]!

    // Swap tile references in the display grid
    this.tiles[r1]![c1] = tile2
    this.tiles[r2]![c2] = tile1

    const pos1 = gridPos(r1, c1)
    const pos2 = gridPos(r2, c2)

    this.tweens.add({
      targets: [tile1.bg, tile1.label],
      x: pos2.x,
      y: pos2.y,
      duration: SWAP_DURATION,
      ease: 'Power2',
    })

    this.tweens.add({
      targets: [tile2.bg, tile2.label],
      x: pos1.x,
      y: pos1.y,
      duration: SWAP_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.clearMatches()
      },
    })
  }

  private clearMatches() {
    const matches = this.board.findMatches()
    if (matches.length === 0) {
      this.animating = false
      return
    }

    // Dispatch effects for each match
    dispatchMatchEffects(matches, (effect: MatchEffect) => {
      if (effect.type === TileType.Medkit) {
        this.applyHeal(MEDKIT_HEAL)
      }
    })

    // Deduplicate cells across overlapping matches
    const toClear = new Set<string>()
    for (const match of matches) {
      for (const cell of match.cells) {
        toClear.add(`${cell.row},${cell.col}`)
      }
    }

    const clearTargets: Phaser.GameObjects.GameObject[] = []
    for (const key of toClear) {
      const [row, col] = key.split(',').map(Number) as [number, number]
      const tile = this.tiles[row]![col]
      if (tile) {
        clearTargets.push(tile.bg, tile.label)
      }
    }

    this.tweens.add({
      targets: clearTargets,
      alpha: 0,
      scale: 0.3,
      duration: CLEAR_DURATION,
      ease: 'Power2',
      onComplete: () => {
        // Remove from board data and destroy display objects
        for (const key of toClear) {
          const [row, col] = key.split(',').map(Number) as [number, number]
          this.board.set(row, col, null)
          const tile = this.tiles[row]![col]
          if (tile) {
            tile.bg.destroy()
            tile.label.destroy()
            this.tiles[row]![col] = null
          }
        }
        this.doGravityAndRefill()
      },
    })
  }

  private doGravityAndRefill() {
    const moves = this.board.applyGravity()

    // Animate existing tiles falling down
    let maxFallDuration = 0
    for (const move of moves) {
      const tile = this.tiles[move.fromRow]![move.col]!
      this.tiles[move.fromRow]![move.col] = null
      this.tiles[move.toRow]![move.col] = tile

      const target = gridPos(move.toRow, move.col)
      const duration = (move.toRow - move.fromRow) * FALL_DURATION_PER_ROW
      maxFallDuration = Math.max(maxFallDuration, duration)

      this.tweens.add({
        targets: [tile.bg, tile.label],
        y: target.y,
        duration,
        ease: 'Bounce.easeOut',
      })
    }

    // After gravity, fill empty cells at the top
    this.time.delayedCall(maxFallDuration, () => {
      this.spawnNewTiles()
    })
  }

  private spawnNewTiles() {
    const fills = this.board.fillEmpty()

    let maxDuration = 0
    for (const fill of fills) {
      const tile = this.createTileAt(fill.row, fill.col, fill.type)
      this.tiles[fill.row]![fill.col] = tile

      // Start above the grid and fall into place
      const target = gridPos(fill.row, fill.col)
      const spawnY = gridPos(0, fill.col).y - GRID_TOTAL
      tile.bg.setY(spawnY)
      tile.label.setY(spawnY)

      const duration = (fill.row + 1) * FALL_DURATION_PER_ROW
      maxDuration = Math.max(maxDuration, duration)

      this.tweens.add({
        targets: [tile.bg, tile.label],
        y: target.y,
        duration,
        ease: 'Bounce.easeOut',
      })
    }

    // After refill, check for cascades
    this.time.delayedCall(maxDuration + CASCADE_PAUSE, () => {
      this.clearMatches()
    })
  }

  private doRejectSwap(r1: number, c1: number, r2: number, c2: number) {
    this.animating = true

    const tile1 = this.tiles[r1]![c1]!
    const tile2 = this.tiles[r2]![c2]!
    const pos1 = gridPos(r1, c1)
    const pos2 = gridPos(r2, c2)

    // Slide toward each other then back
    this.tweens.add({
      targets: [tile1.bg, tile1.label],
      x: pos2.x,
      y: pos2.y,
      duration: SWAP_DURATION,
      ease: 'Power2',
      yoyo: true,
    })

    this.tweens.add({
      targets: [tile2.bg, tile2.label],
      x: pos1.x,
      y: pos1.y,
      duration: SWAP_DURATION,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.animating = false
      },
    })
  }
}

export function gridOrigin() {
  const gridWidth = GRID_COLS * GRID_TOTAL - CELL_GAP
  const gridHeight = GRID_ROWS * GRID_TOTAL - CELL_GAP
  const startX = (GAME_WIDTH - gridWidth) / 2 + CELL_SIZE / 2
  const startY = MID_Y + (MID_Y - gridHeight) / 2 + CELL_SIZE / 2
  return { startX, startY }
}

export function gridPos(row: number, col: number) {
  const { startX, startY } = gridOrigin()
  return {
    x: startX + col * GRID_TOTAL,
    y: startY + row * GRID_TOTAL,
  }
}

function pointerToGrid(px: number, py: number): { row: number; col: number } | null {
  const { startX, startY } = gridOrigin()
  const halfCell = CELL_SIZE / 2

  const col = Math.round((px - startX) / GRID_TOTAL)
  const row = Math.round((py - startY) / GRID_TOTAL)

  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null

  // Check that the pointer is actually within the cell bounds (not in a gap)
  const cellCenter = gridPos(row, col)
  if (Math.abs(px - cellCenter.x) > halfCell || Math.abs(py - cellCenter.y) > halfCell) return null

  return { row, col }
}
