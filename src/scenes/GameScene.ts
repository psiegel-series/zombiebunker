import Phaser from 'phaser'
import { Board, GRID_COLS, GRID_ROWS } from '../board/Board'
import { TileType, TILE_COLORS, TILE_LABELS } from '../board/TileType'
import { MatchEffect, dispatchMatchEffects } from '../board/MatchEffects'
import { Zombie, ZombieType } from '../entities/Zombie'

export const GAME_WIDTH = 390
export const GAME_HEIGHT = 844
export const MID_Y = Math.floor(GAME_HEIGHT / 2)

export const CELL_SIZE = 44
export const CELL_GAP = 4
export const GRID_TOTAL = CELL_SIZE + CELL_GAP

const BUNKER_MAX_HP = 100
const MEDKIT_HEAL = 10
const SNAP_DURATION = 120
const CLEAR_DURATION = 200
const FALL_DURATION_PER_ROW = 80
const CASCADE_PAUSE = 150
const DRAG_LOCK_THRESHOLD = 6
const ZOMBIE_SPAWN_MARGIN = 10
const DEBUG_SPAWN_INTERVAL = 2000

interface TileSprite {
  bg: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

type DragAxis = 'row' | 'col' | null

export class GameScene extends Phaser.Scene {
  private board!: Board
  private tiles: (TileSprite | null)[][] = []
  private animating = false
  private bunkerHp = BUNKER_MAX_HP
  private hpBarFill!: Phaser.GameObjects.Rectangle
  private hpBarBg!: Phaser.GameObjects.Rectangle

  // Zombie state
  private zombies: Zombie[] = []
  private bunkerX = GAME_WIDTH / 2
  private bunkerY = MID_Y / 2

  // Drag state
  private dragging = false
  private dragAxis: DragAxis = null
  private dragRow = -1
  private dragCol = -1
  private dragStartX = 0
  private dragStartY = 0
  private boardSnapshot: (TileType | null)[][] | null = null
  private highlightedCells: Set<string> = new Set()
  private lastWholeOffset = 0

  constructor() {
    super({ key: 'Game' })
  }

  create() {
    this.board = new Board()
    this.animating = false
    this.bunkerHp = BUNKER_MAX_HP
    this.drawBattlefield()
    this.drawBunker()
    this.drawHpBar()
    this.createTiles()

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onDragStart(pointer)
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.onDragMove(pointer)
    })
    this.input.on('pointerup', () => {
      this.onDragEnd()
    })

    // Debug: press D to deal 15 damage to the bunker
    this.input.keyboard!.on('keydown-D', () => {
      this.applyDamage(15)
    })

    // Debug: press Z to spawn a zombie at a random edge
    this.input.keyboard!.on('keydown-Z', () => {
      this.spawnZombie()
    })

    // Auto-spawn zombies on a timer for testing
    this.time.addEvent({
      delay: DEBUG_SPAWN_INTERVAL,
      callback: () => this.spawnZombie(),
      loop: true,
    })
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000
    this.updateZombies(dt)
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
      this.hpBarFill.fillColor = 0x40d070
    } else if (fraction > 0.3) {
      this.hpBarFill.fillColor = 0xd0d040
    } else {
      this.hpBarFill.fillColor = 0xd04040
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

  // ── Drag input ──────────────────────────────────────────────

  private onDragStart(pointer: Phaser.Input.Pointer) {
    if (this.animating || this.dragging) return

    const cell = pointerToGrid(pointer.x, pointer.y)
    if (!cell) return

    this.dragging = true
    this.dragAxis = null
    this.dragRow = cell.row
    this.dragCol = cell.col
    this.dragStartX = pointer.x
    this.dragStartY = pointer.y
    this.boardSnapshot = this.board.snapshot()
  }

  private onDragMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragging || this.animating) return

    const dx = pointer.x - this.dragStartX
    const dy = pointer.y - this.dragStartY

    // Lock axis after threshold
    if (!this.dragAxis) {
      if (Math.abs(dx) > DRAG_LOCK_THRESHOLD) {
        this.dragAxis = 'row'
      } else if (Math.abs(dy) > DRAG_LOCK_THRESHOLD) {
        this.dragAxis = 'col'
      } else {
        return
      }
    }

    // Restore board to snapshot before applying new shift
    this.board.restore(this.boardSnapshot!)

    if (this.dragAxis === 'row') {
      const cellOffset = dx / GRID_TOTAL
      const wholeOffset = Math.round(cellOffset)
      const fractional = cellOffset - wholeOffset
      this.lastWholeOffset = wholeOffset

      // Apply whole-cell shift to board data
      this.board.shiftRow(this.dragRow, wholeOffset)

      // Update tile sprites to match shifted board, with fractional pixel offset
      this.updateRowVisuals(this.dragRow, fractional * GRID_TOTAL)
    } else {
      const cellOffset = dy / GRID_TOTAL
      const wholeOffset = Math.round(cellOffset)
      const fractional = cellOffset - wholeOffset
      this.lastWholeOffset = wholeOffset

      this.board.shiftColumn(this.dragCol, wholeOffset)
      this.updateColVisuals(this.dragCol, fractional * GRID_TOTAL)
    }

    this.updateMatchPreview()
  }

  private onDragEnd() {
    if (!this.dragging) return
    this.dragging = false
    this.clearMatchPreview()

    if (!this.dragAxis) {
      // No meaningful drag happened
      this.boardSnapshot = null
      return
    }

    // Board is already snapped to whole-cell positions (from the rounded shift in onDragMove).
    // Check if current state has matches.
    const matches = this.board.findMatches()

    if (matches.length > 0) {
      // Valid move: rebuild tile sprites to match board state, then clear matches
      this.animating = true
      this.snapTilesToGrid(() => {
        this.boardSnapshot = null
        this.clearMatches()
      })
    } else {
      // Invalid move: restore board and animate sprites back to original positions.
      // The sprites are currently at shifted positions. We need to remap them
      // using the offset so each sprite slides back to its original grid slot.
      this.animating = true
      const offset = this.lastWholeOffset

      this.board.restore(this.boardSnapshot!)
      this.boardSnapshot = null

      if (this.dragAxis === 'row') {
        const n = GRID_COLS
        // Collect current sprites (they are indexed by shifted position)
        const shiftedSprites: (TileSprite | null)[] = []
        for (let col = 0; col < n; col++) {
          shiftedSprites.push(this.tiles[this.dragRow]![col]!)
        }
        // Remap: sprite at shifted col `c` belongs to original col `(c - offset + n) % n`
        for (let c = 0; c < n; c++) {
          const origCol = ((c - offset) % n + n) % n
          this.tiles[this.dragRow]![origCol] = shiftedSprites[c]!
        }
      } else {
        const n = GRID_ROWS
        const shiftedSprites: (TileSprite | null)[] = []
        for (let row = 0; row < n; row++) {
          shiftedSprites.push(this.tiles[row]![this.dragCol]!)
        }
        for (let r = 0; r < n; r++) {
          const origRow = ((r - offset) % n + n) % n
          this.tiles[origRow]![this.dragCol] = shiftedSprites[r]!
        }
      }

      this.snapTilesToGrid(() => {
        this.animating = false
      })
    }
  }

  private updateRowVisuals(row: number, pixelOffset: number) {
    // Destroy old sprites for this row and create new ones from board data
    for (let col = 0; col < GRID_COLS; col++) {
      const old = this.tiles[row]![col]
      if (old) {
        old.bg.destroy()
        old.label.destroy()
      }

      const type = this.board.get(row, col)
      if (type) {
        const tile = this.createTileAt(row, col, type)
        tile.bg.x += pixelOffset
        tile.label.x += pixelOffset
        this.tiles[row]![col] = tile
      } else {
        this.tiles[row]![col] = null
      }
    }
  }

  private updateColVisuals(col: number, pixelOffset: number) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const old = this.tiles[row]![col]
      if (old) {
        old.bg.destroy()
        old.label.destroy()
      }

      const type = this.board.get(row, col)
      if (type) {
        const tile = this.createTileAt(row, col, type)
        tile.bg.y += pixelOffset
        tile.label.y += pixelOffset
        this.tiles[row]![col] = tile
      } else {
        this.tiles[row]![col] = null
      }
    }
  }

  private snapTilesToGrid(onComplete: () => void) {
    // Rebuild all tile sprites to match current board state, animate to correct positions
    let tweenCount = 0
    let completedCount = 0

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.tiles[row]![col]
        if (!tile) continue

        const target = gridPos(row, col)
        const needsMove = tile.bg.x !== target.x || tile.bg.y !== target.y

        if (needsMove) {
          tweenCount++
          this.tweens.add({
            targets: [tile.bg, tile.label],
            x: target.x,
            y: target.y,
            duration: SNAP_DURATION,
            ease: 'Power2',
            onComplete: () => {
              completedCount++
              if (completedCount === tweenCount) onComplete()
            },
          })
        }
      }
    }

    if (tweenCount === 0) onComplete()
  }

  // ── Match preview highlighting ──────────────────────────────

  private updateMatchPreview() {
    this.clearMatchPreview()

    const matches = this.board.findMatches()
    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell.row},${cell.col}`
        this.highlightedCells.add(key)
        const tile = this.tiles[cell.row]![cell.col]
        if (tile) {
          tile.bg.setStrokeStyle(3, 0xffffff)
        }
      }
    }
  }

  private clearMatchPreview() {
    for (const key of this.highlightedCells) {
      const [row, col] = key.split(',').map(Number) as [number, number]
      const tile = this.tiles[row]![col]
      if (tile) {
        tile.bg.setStrokeStyle(1, 0x222222)
      }
    }
    this.highlightedCells.clear()
  }

  // ── Match clearing & cascade ────────────────────────────────

  private clearMatches() {
    const matches = this.board.findMatches()
    if (matches.length === 0) {
      this.animating = false
      return
    }

    dispatchMatchEffects(matches, (effect: MatchEffect) => {
      if (effect.type === TileType.Medkit) {
        this.applyHeal(MEDKIT_HEAL)
      }
    })

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

    this.time.delayedCall(maxDuration + CASCADE_PAUSE, () => {
      this.clearMatches()
    })
  }

  // ── Zombies ─────────────────────────────────────────────────

  private spawnZombie() {
    const edge = Math.floor(Math.random() * 4) // 0=top, 1=bottom, 2=left, 3=right
    let x: number
    let y: number

    switch (edge) {
      case 0: // top
        x = ZOMBIE_SPAWN_MARGIN + Math.random() * (GAME_WIDTH - ZOMBIE_SPAWN_MARGIN * 2)
        y = ZOMBIE_SPAWN_MARGIN
        break
      case 1: // bottom of battlefield (just above divider)
        x = ZOMBIE_SPAWN_MARGIN + Math.random() * (GAME_WIDTH - ZOMBIE_SPAWN_MARGIN * 2)
        y = MID_Y - ZOMBIE_SPAWN_MARGIN
        break
      case 2: // left
        x = ZOMBIE_SPAWN_MARGIN
        y = ZOMBIE_SPAWN_MARGIN + Math.random() * (MID_Y - ZOMBIE_SPAWN_MARGIN * 2)
        break
      default: // right
        x = GAME_WIDTH - ZOMBIE_SPAWN_MARGIN
        y = ZOMBIE_SPAWN_MARGIN + Math.random() * (MID_Y - ZOMBIE_SPAWN_MARGIN * 2)
        break
    }

    const zombie = new Zombie(this, x, y, ZombieType.Walker)
    this.zombies.push(zombie)
  }

  private updateZombies(dt: number) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]!

      if (zombie.isDead) {
        zombie.destroy()
        this.zombies.splice(i, 1)
        continue
      }

      const bunkerHalf = 24 // bunker is 48x48
      const reached = zombie.moveToward(this.bunkerX, this.bunkerY, dt, bunkerHalf)
      if (reached) {
        this.applyDamage(zombie.damage)
        console.log(`[Zombie] ${zombie.type} reached bunker, dealt ${zombie.damage} damage`)
        zombie.destroy()
        this.zombies.splice(i, 1)
      }
    }
  }

  getZombies(): Zombie[] {
    return this.zombies
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

  const cellCenter = gridPos(row, col)
  if (Math.abs(px - cellCenter.x) > halfCell || Math.abs(py - cellCenter.y) > halfCell) return null

  return { row, col }
}
