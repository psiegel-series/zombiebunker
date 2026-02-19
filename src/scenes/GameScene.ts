import Phaser from 'phaser'
import { Board, GRID_COLS, GRID_ROWS, Match } from '../board/Board'
import { TileType, TILE_COLORS, TILE_LABELS, baseType, isPoweredUp, poweredType } from '../board/TileType'
import { MatchEffect, dispatchMatchEffects } from '../board/MatchEffects'
import { Zombie, ZombieType } from '../entities/Zombie'
import { WaveManager } from '../waves/WaveManager'

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
const BULLET_DAMAGE = 15
const GRENADE_DAMAGE = 20
const GRENADE_RADIUS = 60
const GASOLINE_DPS = 15 // damage per second to each overlapping zombie
const GASOLINE_RADIUS = 80
const GASOLINE_DURATION = 3000 // ms the fire zone lasts
const HEAVY_BULLET_DAMAGE = 25
const ROCKET_RADIUS = 100
const ROCKET_DAMAGE = 35
const NAPALM_RADIUS = 100
const NAPALM_DURATION = 4000
const NAPALM_DPS = 20
const MEGA_MEDKIT_HEAL = 40
const AIRSTRIKE_DAMAGE = 50
const DEATH_DURATION = 150

interface TileSprite {
  bg: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

interface FireZone {
  x: number
  y: number
  radius: number
  remaining: number // ms left
  dps: number
  gfx: Phaser.GameObjects.Arc
}

type DragAxis = 'row' | 'col' | null

export class GameScene extends Phaser.Scene {
  private board!: Board
  private tiles: (TileSprite | null)[][] = []
  private animating = false
  private bunkerHp = BUNKER_MAX_HP
  private hpBarFill!: Phaser.GameObjects.Rectangle
  private hpBarBg!: Phaser.GameObjects.Rectangle

  // Zombie & wave state
  private zombies: Zombie[] = []
  private fireZones: FireZone[] = []
  private bunkerX = GAME_WIDTH / 2
  private bunkerY = MID_Y / 2
  private waveManager!: WaveManager
  private waveText!: Phaser.GameObjects.Text
  private waveMessageText!: Phaser.GameObjects.Text

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

    // Wave HUD
    this.waveText = this.add
      .text(10, 10, 'Wave 1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })

    this.waveMessageText = this.add
      .text(GAME_WIDTH / 2, MID_Y / 2 - 60, '', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)

    // Wave manager
    this.waveManager = new WaveManager({
      onSpawn: (type) => this.spawnZombie(type),
      onWaveStart: (num) => {
        this.waveText.setText(`Wave ${num}`)
        this.showWaveMessage(`Wave ${num}`)
      },
      onWaveComplete: (num) => {
        this.showWaveMessage(`Wave ${num} Complete!`)
      },
    })
    this.waveManager.start()
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000
    this.updateZombies(dt)
    this.updateFireZones(delta, dt)
    this.waveManager.update(delta, this.zombies.length)
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

    const strokeColor = type === TileType.Airstrike
      ? 0xff0000
      : isPoweredUp(type) ? 0xffffff : 0x222222
    const strokeWidth = type === TileType.Airstrike ? 3 : isPoweredUp(type) ? 2 : 1

    const bg = this.add
      .rectangle(x, y, CELL_SIZE, CELL_SIZE, TILE_COLORS[type])
      .setStrokeStyle(strokeWidth, strokeColor)

    const labelColor = type === TileType.Airstrike ? '#ff0000' : '#000000'
    const label = this.add
      .text(x, y, TILE_LABELS[type], {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: labelColor,
        fontStyle: isPoweredUp(type) || type === TileType.Airstrike ? 'bold' : 'normal',
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
        const t = this.board.get(row, col)
        if (t === TileType.Airstrike) {
          tile.bg.setStrokeStyle(3, 0xff0000)
        } else if (t && isPoweredUp(t)) {
          tile.bg.setStrokeStyle(2, 0xffffff)
        } else {
          tile.bg.setStrokeStyle(1, 0x222222)
        }
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

    // Determine which cells get bonus tiles instead of being cleared.
    // bonusCells: key -> tile type to place there after clearing.
    const bonusCells = new Map<string, TileType>()

    // Check for T/L/5+ shapes first: merge overlapping matches of the same base type
    // that together form a special shape.
    const isSpecialShape = this.detectSpecialShapes(matches)

    for (const match of matches) {
      if (isSpecialShape.has(match)) {
        // 5-match, T, or L shape → leave an Airstrike tile at the center cell
        const center = match.cells[Math.floor(match.cells.length / 2)]!
        bonusCells.set(`${center.row},${center.col}`, TileType.Airstrike)
      } else if (match.cells.length >= 4) {
        // 4-match → leave a powered-up tile at the last cell
        const last = match.cells[match.cells.length - 1]!
        bonusCells.set(`${last.row},${last.col}`, poweredType(match.type))
      }
    }

    // Check if any match contains a powered-up or airstrike tile (for enhanced effects)
    const matchContainsPowered = (match: Match) =>
      match.cells.some(c => {
        const t = this.board.get(c.row, c.col)
        return t !== null && isPoweredUp(t)
      })
    const matchContainsAirstrike = (match: Match) =>
      match.cells.some(c => this.board.get(c.row, c.col) === TileType.Airstrike)

    // Dispatch effects
    dispatchMatchEffects(matches, matchContainsPowered, matchContainsAirstrike, (effect: MatchEffect) => {
      this.handleMatchEffect(effect)
    })

    // Build the set of cells to clear (excluding bonus positions)
    const toClear = new Set<string>()
    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell.row},${cell.col}`
        if (!bonusCells.has(key)) {
          toClear.add(key)
        }
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

        // Place bonus tiles
        for (const [key, bonusType] of bonusCells) {
          const [row, col] = key.split(',').map(Number) as [number, number]
          this.board.set(row, col, bonusType)
          // Destroy old sprite and create new one
          const old = this.tiles[row]![col]
          if (old) { old.bg.destroy(); old.label.destroy() }
          this.tiles[row]![col] = this.createTileAt(row, col, bonusType)
        }

        this.doGravityAndRefill()
      },
    })
  }

  private handleMatchEffect(effect: MatchEffect) {
    if (effect.airstrike) {
      this.fireAirstrike()
      return
    }

    const bt = baseType(effect.type)
    if (bt === TileType.Medkit) {
      this.applyHeal(effect.powered ? MEGA_MEDKIT_HEAL : MEDKIT_HEAL)
    } else if (
      bt === TileType.BulletN || bt === TileType.BulletS ||
      bt === TileType.BulletE || bt === TileType.BulletW
    ) {
      this.fireBullet(bt, effect.powered)
    } else if (bt === TileType.Grenade) {
      this.fireGrenade(effect.powered)
    } else if (bt === TileType.Gasoline) {
      this.fireGasoline(effect.powered)
    }
  }

  /**
   * Detect special shapes: 5-in-a-row, T-shapes, and L-shapes.
   * Returns a Set of matches that are part of a special shape.
   */
  private detectSpecialShapes(matches: Match[]): Set<Match> {
    const special = new Set<Match>()

    // 5+ in a row is automatically special
    for (const m of matches) {
      if (m.cells.length >= 5) {
        special.add(m)
      }
    }

    // T and L shapes: two matches of the same base type that share exactly one cell
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const a = matches[i]!
        const b = matches[j]!
        if (baseType(a.type) !== baseType(b.type)) continue

        // Check if they share at least one cell (cross/T/L)
        const aKeys = new Set(a.cells.map(c => `${c.row},${c.col}`))
        const shared = b.cells.filter(c => aKeys.has(`${c.row},${c.col}`))
        if (shared.length > 0) {
          special.add(a)
          special.add(b)
        }
      }
    }

    return special
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

  private spawnZombie(type: ZombieType = ZombieType.Walker) {
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

    const zombie = new Zombie(this, x, y, type)
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

  // ── Combat ───────────────────────────────────────────────────

  private fireBullet(type: TileType, powered = false) {
    // Direction vector from bunker
    let dirX = 0
    let dirY = 0
    switch (type) {
      case TileType.BulletN: dirY = -1; break
      case TileType.BulletS: dirY = 1; break
      case TileType.BulletE: dirX = 1; break
      case TileType.BulletW: dirX = -1; break
    }

    // Collect all zombies in this quadrant, sorted nearest-first.
    // Quadrant test: N means |dy|>=|dx| and dy<0, E means |dx|>=|dy| and dx>0, etc.
    const inQuadrant: { zombie: Zombie; dist: number; rx: number; ry: number }[] = []

    for (const z of this.zombies) {
      if (z.isDead) continue
      const rx = z.x - this.bunkerX
      const ry = z.y - this.bunkerY
      const absx = Math.abs(rx)
      const absy = Math.abs(ry)

      let inQ = false
      if (dirX === 0) {
        // N or S quadrant: |dy| >= |dx| and correct sign
        inQ = absy >= absx && Math.sign(ry) === dirY
      } else {
        // E or W quadrant: |dx| >= |dy| and correct sign
        inQ = absx >= absy && Math.sign(rx) === dirX
      }
      if (!inQ) continue

      const dist = Math.sqrt(rx * rx + ry * ry)
      inQuadrant.push({ zombie: z, dist, rx, ry })
    }

    inQuadrant.sort((a, b) => a.dist - b.dist)

    // Fire at all zombies that aren't blocked by a nearer zombie.
    // Heavy ammo (powered) pierces through cover — hits all zombies in the quadrant.
    const hit: Zombie[] = []

    for (const candidate of inQuadrant) {
      if (powered) {
        hit.push(candidate.zombie)
        continue
      }
      let blocked = false
      for (const blocker of hit) {
        const bx = blocker.x - this.bunkerX
        const by = blocker.y - this.bunkerY
        const cross = Math.abs(bx * candidate.ry - by * candidate.rx)
        const perpDist = cross / candidate.dist
        if (perpDist < blocker.body.radius * 2) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        hit.push(candidate.zombie)
      }
    }

    // Animate a spread of bullet lines across the quadrant
    const spread = 0.6
    const bAngle = Math.atan2(dirY, dirX)
    const range = MID_Y / 2
    const lineCount = powered ? 5 : 3
    for (let i = 0; i < lineCount; i++) {
      const angle = bAngle + (i - (lineCount - 1) / 2) * spread / (lineCount - 1)
      const endX = this.bunkerX + Math.cos(angle) * range
      const endY = this.bunkerY + Math.sin(angle) * range
      this.animateBullet(this.bunkerX, this.bunkerY, endX, endY, powered ? 0xff4444 : 0xffff44)
    }

    const dmg = powered ? HEAVY_BULLET_DAMAGE : BULLET_DAMAGE
    for (const z of hit) {
      z.takeDamage(dmg)
      console.log(`[Combat] Bullet ${type}${powered ? ' [HEAVY]' : ''} hit zombie for ${dmg} damage`)
      if (z.isDead) {
        this.playDeathEffect(z)
      }
    }
  }

  private fireGrenade(powered = false) {
    const radius = powered ? ROCKET_RADIUS : GRENADE_RADIUS
    const damage = powered ? ROCKET_DAMAGE : GRENADE_DAMAGE

    if (this.zombies.length === 0) {
      const rx = 40 + Math.random() * (GAME_WIDTH - 80)
      const ry = 20 + Math.random() * (MID_Y - 40)
      this.animateExplosion(rx, ry, radius)
      return
    }

    // Find densest cluster
    let bestCenter: Zombie = this.zombies[0]!
    let bestCount = 0

    for (const z of this.zombies) {
      if (z.isDead) continue
      let count = 0
      for (const other of this.zombies) {
        if (other.isDead) continue
        const dx = z.x - other.x
        const dy = z.y - other.y
        if (Math.sqrt(dx * dx + dy * dy) <= radius) count++
      }
      if (count > bestCount) {
        bestCount = count
        bestCenter = z
      }
    }

    this.animateExplosion(bestCenter.x, bestCenter.y, radius)

    for (const z of this.zombies) {
      if (z.isDead) continue
      const dx = bestCenter.x - z.x
      const dy = bestCenter.y - z.y
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        z.takeDamage(damage)
        if (z.isDead) {
          this.playDeathEffect(z)
        }
      }
    }
  }

  private fireGasoline(powered = false) {
    const radius = powered ? NAPALM_RADIUS : GASOLINE_RADIUS
    const duration = powered ? NAPALM_DURATION : GASOLINE_DURATION
    const dps = powered ? NAPALM_DPS : GASOLINE_DPS
    const color = powered ? 0xff2200 : 0xff4400

    const gfx = this.add
      .circle(this.bunkerX, this.bunkerY, radius, color, 0.25)
      .setStrokeStyle(powered ? 3 : 2, 0xff6600, 0.6)

    this.fireZones.push({
      x: this.bunkerX,
      y: this.bunkerY,
      radius,
      remaining: duration,
      dps,
      gfx,
    })
  }

  private fireAirstrike() {
    // Damage all zombies on the battlefield
    for (const z of this.zombies) {
      if (z.isDead) continue
      z.takeDamage(AIRSTRIKE_DAMAGE)
      if (z.isDead) {
        this.playDeathEffect(z)
      }
    }

    // Screen-wide flash effect
    const flash = this.add.rectangle(GAME_WIDTH / 2, MID_Y / 2, GAME_WIDTH, MID_Y, 0xffffff, 0.6)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    })

    // Scatter explosion effects across the battlefield
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 80, () => {
        const ex = 30 + Math.random() * (GAME_WIDTH - 60)
        const ey = 20 + Math.random() * (MID_Y - 40)
        this.animateExplosion(ex, ey, 40)
      })
    }
  }

  private updateFireZones(deltaMs: number, dt: number) {
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const zone = this.fireZones[i]!
      zone.remaining -= deltaMs

      if (zone.remaining <= 0) {
        zone.gfx.destroy()
        this.fireZones.splice(i, 1)
        continue
      }

      // Fade out over the last 500ms
      const fadeStart = 500
      if (zone.remaining < fadeStart) {
        zone.gfx.setAlpha(0.25 * (zone.remaining / fadeStart))
      }

      // Pulse the stroke
      const pulse = 0.4 + 0.2 * Math.sin(Date.now() * 0.01)
      zone.gfx.setStrokeStyle(2, 0xff6600, pulse)

      // Damage overlapping zombies
      for (const z of this.zombies) {
        if (z.isDead) continue
        const dx = z.x - zone.x
        const dy = z.y - zone.y
        if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) {
          z.takeDamage(zone.dps * dt)
          if (z.isDead) {
            this.playDeathEffect(z)
          }
        }
      }
    }
  }

  private animateBullet(fromX: number, fromY: number, toX: number, toY: number, color = 0xffff44) {
    const line = this.add.line(0, 0, fromX, fromY, toX, toY, color, 1).setOrigin(0, 0)
    line.setLineWidth(2)

    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 200,
      onComplete: () => line.destroy(),
    })
  }

  private animateExplosion(x: number, y: number, radius: number) {
    const circle = this.add.circle(x, y, radius * 0.3, 0xff6600, 0.8)
    const ring = this.add.circle(x, y, radius * 0.3, 0x000000, 0).setStrokeStyle(3, 0xff4400)

    this.tweens.add({
      targets: circle,
      scale: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => circle.destroy(),
    })

    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power1',
      onComplete: () => ring.destroy(),
    })
  }

  private playDeathEffect(zombie: Zombie) {
    // Flash and shrink the zombie body before it gets cleaned up in updateZombies
    this.tweens.add({
      targets: [zombie.body],
      alpha: 0,
      scale: 1.8,
      duration: DEATH_DURATION,
      ease: 'Power2',
    })
    this.tweens.add({
      targets: [zombie.hpBar, zombie.hpBarBg],
      alpha: 0,
      duration: DEATH_DURATION,
    })
  }

  private showWaveMessage(text: string) {
    this.waveMessageText.setText(text).setAlpha(1)
    this.tweens.killTweensOf(this.waveMessageText)
    this.tweens.add({
      targets: this.waveMessageText,
      alpha: 0,
      delay: 1500,
      duration: 500,
      ease: 'Power2',
    })
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
