import Phaser from 'phaser'
import { Board, GRID_COLS, GRID_ROWS, Match } from '../board/Board'
import { TileType, TILE_TEXTURE_KEYS, baseType, isPoweredUp, poweredType } from '../board/TileType'
import { MatchEffect, dispatchMatchEffects } from '../board/MatchEffects'
import { Zombie, ZombieType } from '../entities/Zombie'
import { WaveManager } from '../waves/WaveManager'
import { submitScore } from '../rundot'

export const GAME_WIDTH = 390
export const GAME_HEIGHT = 844
export const MID_Y = Math.floor(GAME_HEIGHT / 2)

export const CELL_SIZE = 44
export const CELL_GAP = 4
export const GRID_TOTAL = CELL_SIZE + CELL_GAP

const BUNKER_MAX_HP = 150
const MEDKIT_HEAL = 15
const MEGA_MEDKIT_HEAL = 50
const SNAP_DURATION = 120
const CLEAR_DURATION = 200
const FALL_DURATION_PER_ROW = 80
const CASCADE_PAUSE = 150
const DRAG_LOCK_THRESHOLD = 6
const ZOMBIE_SPAWN_MARGIN = 10
const BULLET_DAMAGE = 20
const GRENADE_DAMAGE = 20
const GRENADE_RADIUS = 60
const GASOLINE_DPS = 20 // damage per second to each overlapping zombie
const GASOLINE_RADIUS = 80
const GASOLINE_DURATION = 3000 // ms the fire zone lasts
const HEAVY_BULLET_DAMAGE = 25
const ROCKET_RADIUS = 100
const ROCKET_DAMAGE = 35
const NAPALM_RADIUS = 100
const NAPALM_DURATION = 4000
const NAPALM_DPS = 20
const AIRSTRIKE_DAMAGE = 50
const DEATH_DURATION = 150

const SCORE_PER_ZOMBIE: Record<ZombieType, number> = {
  [ZombieType.Walker]: 10,
  [ZombieType.Runner]: 15,
  [ZombieType.Tank]: 30,
  [ZombieType.Boss]: 100,
}
const SCORE_PER_WAVE = 50

interface TileSprite {
  bg: Phaser.GameObjects.Sprite
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
  private score = 0
  private scoreText!: Phaser.GameObjects.Text
  private gameOver = false
  private gameStartTime = 0

  // Drag state
  private dragging = false
  private dragAxis: DragAxis = null
  private dragRow = -1
  private dragCol = -1
  private dragStartX = 0
  private dragStartY = 0
  private boardSnapshot: (TileType | null)[][] | null = null
  private highlightedCells: Map<string, Phaser.GameObjects.Rectangle> = new Map()
  private lastWholeOffset = 0

  // Audio
  private sfxMatch!: Phaser.Sound.BaseSound
  private sfxBullet!: Phaser.Sound.BaseSound
  private sfxExplosion!: Phaser.Sound.BaseSound
  private sfxFire!: Phaser.Sound.BaseSound
  private sfxAirstrike!: Phaser.Sound.BaseSound
  private sfxHeal!: Phaser.Sound.BaseSound
  private sfxDamage!: Phaser.Sound.BaseSound
  private sfxZombieDeath!: Phaser.Sound.BaseSound
  private sfxWaveStart!: Phaser.Sound.BaseSound
  private music!: Phaser.Sound.BaseSound
  private sfxMuted = false
  private musicMuted = false

  constructor() {
    super({ key: 'Game' })
  }

  create() {
    this.board = new Board()
    this.animating = false
    this.bunkerHp = BUNKER_MAX_HP
    this.score = 0
    this.gameOver = false
    this.gameStartTime = Date.now()
    this.zombies = []
    this.fireZones = []
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

    // HUD
    this.scoreText = this.add
      .text(GAME_WIDTH - 10, 10, '0', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setDepth(100)

    this.waveText = this.add
      .text(10, 10, 'Wave 1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setDepth(100)

    this.waveMessageText = this.add
      .text(GAME_WIDTH / 2, MID_Y / 2 - 60, '', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100)

    // Audio
    this.sfxMatch = this.sound.add('sfx_match')
    this.sfxBullet = this.sound.add('sfx_bullet')
    this.sfxExplosion = this.sound.add('sfx_explosion')
    this.sfxFire = this.sound.add('sfx_fire')
    this.sfxAirstrike = this.sound.add('sfx_airstrike')
    this.sfxHeal = this.sound.add('sfx_heal')
    this.sfxDamage = this.sound.add('sfx_damage')
    this.sfxZombieDeath = this.sound.add('sfx_zombie_death')
    this.sfxWaveStart = this.sound.add('sfx_wave_start')
    this.music = this.sound.add('music_loop', { loop: true, volume: 0.3 })
    this.music.play()

    // Mute buttons
    const btnSize = 28
    const btnY = 14 + btnSize / 2
    const btnGap = 6
    const sfxBtnX = GAME_WIDTH / 2 - (btnGap / 2 + btnSize / 2)
    const musicBtnX = GAME_WIDTH / 2 + (btnGap / 2 + btnSize / 2)

    const sfxBtnBg = this.add
      .rectangle(sfxBtnX, btnY, btnSize, btnSize, 0x556677, 0.9)
      .setStrokeStyle(1, 0x88aacc)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    const sfxBtnLabel = this.add
      .text(sfxBtnX, btnY, '\u{1F50A}', { fontSize: '16px' })
      .setOrigin(0.5)
      .setDepth(100)
    sfxBtnBg.on('pointerover', () => sfxBtnBg.setFillStyle(0x667788, 1))
    sfxBtnBg.on('pointerout', () => sfxBtnBg.setFillStyle(0x556677, 0.9))
    sfxBtnBg.on('pointerdown', () => {
      this.sfxMuted = !this.sfxMuted
      sfxBtnLabel.setAlpha(this.sfxMuted ? 0.3 : 1)
      sfxBtnBg.setStrokeStyle(1, this.sfxMuted ? 0x444444 : 0x88aacc)
      sfxBtnBg.setFillStyle(this.sfxMuted ? 0x2a2a3a : 0x556677, this.sfxMuted ? 0.6 : 0.9)
    })

    const musicBtnBg = this.add
      .rectangle(musicBtnX, btnY, btnSize, btnSize, 0x556677, 0.9)
      .setStrokeStyle(1, 0x88aacc)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
    const musicBtnLabel = this.add
      .text(musicBtnX, btnY, '\u{1F3B5}', { fontSize: '16px' })
      .setOrigin(0.5)
      .setDepth(100)
    musicBtnBg.on('pointerover', () => musicBtnBg.setFillStyle(0x667788, 1))
    musicBtnBg.on('pointerout', () => musicBtnBg.setFillStyle(0x556677, 0.9))
    musicBtnBg.on('pointerdown', () => {
      this.musicMuted = !this.musicMuted
      musicBtnLabel.setAlpha(this.musicMuted ? 0.3 : 1)
      musicBtnBg.setStrokeStyle(1, this.musicMuted ? 0x444444 : 0x88aacc)
      musicBtnBg.setFillStyle(this.musicMuted ? 0x2a2a3a : 0x556677, this.musicMuted ? 0.6 : 0.9)
      if (this.musicMuted) {
        this.music.pause()
      } else {
        this.music.resume()
      }
    })

    // Wave manager
    this.waveManager = new WaveManager({
      onSpawn: (type) => this.spawnZombie(type),
      onWaveStart: (num) => {
        this.waveText.setText(`Wave ${num}`)
        this.showWaveMessage(`Wave ${num}`)
        this.playSfx(this.sfxWaveStart)
      },
      onWaveComplete: (num) => {
        this.addScore(SCORE_PER_WAVE)
        this.showWaveMessage(`Wave ${num} Complete!`)
      },
    })
    this.waveManager.start()
  }

  private playSfx(sound: Phaser.Sound.BaseSound) {
    if (!this.sfxMuted) sound.play()
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return
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

    this.add.sprite(cx, cy, 'bunker').setDisplaySize(48, 48)
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
    if (this.gameOver) return
    this.bunkerHp = Math.max(0, this.bunkerHp - amount)
    this.updateHpBar()
    this.playSfx(this.sfxDamage)
    console.log(`[Bunker] Took ${amount} damage, HP: ${this.bunkerHp}/${BUNKER_MAX_HP}`)
    if (this.bunkerHp <= 0) {
      this.triggerGameOver()
    }
  }

  private applyHeal(amount: number) {
    this.bunkerHp = Math.min(BUNKER_MAX_HP, this.bunkerHp + amount)
    this.updateHpBar()
    this.playSfx(this.sfxHeal)
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
    const textureKey = TILE_TEXTURE_KEYS[type]

    const bg = this.add
      .sprite(x, y, textureKey)
      .setDisplaySize(CELL_SIZE, CELL_SIZE)

    return { bg }
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
      }

      const type = this.board.get(row, col)
      if (type) {
        const tile = this.createTileAt(row, col, type)
        tile.bg.x += pixelOffset
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
      }

      const type = this.board.get(row, col)
      if (type) {
        const tile = this.createTileAt(row, col, type)
        tile.bg.y += pixelOffset
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
            targets: [tile.bg],
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
        if (this.highlightedCells.has(key)) continue
        const tile = this.tiles[cell.row]![cell.col]
        if (tile) {
          const overlay = this.add
            .rectangle(tile.bg.x, tile.bg.y, CELL_SIZE, CELL_SIZE)
            .setStrokeStyle(3, 0xffffff)
            .setFillStyle(0xffffff, 0.15)
          this.highlightedCells.set(key, overlay)
        }
      }
    }
  }

  private clearMatchPreview() {
    for (const overlay of this.highlightedCells.values()) {
      overlay.destroy()
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

    this.playSfx(this.sfxMatch)

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
        clearTargets.push(tile.bg)
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
            this.tiles[row]![col] = null
          }
        }

        // Place bonus tiles
        for (const [key, bonusType] of bonusCells) {
          const [row, col] = key.split(',').map(Number) as [number, number]
          this.board.set(row, col, bonusType)
          // Destroy old sprite and create new one
          const old = this.tiles[row]![col]
          if (old) { old.bg.destroy() }
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
        targets: [tile.bg],
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

      const duration = (fill.row + 1) * FALL_DURATION_PER_ROW
      maxDuration = Math.max(maxDuration, duration)

      this.tweens.add({
        targets: [tile.bg],
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
      if (this.gameOver) return
      const zombie = this.zombies[i]!

      if (zombie.isDead) {
        this.addScore(SCORE_PER_ZOMBIE[zombie.type])
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
    this.playSfx(this.sfxBullet)

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
        if (perpDist < blocker.radius * 2) {
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
    this.playSfx(this.sfxFire)
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
    this.playSfx(this.sfxAirstrike)

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
    this.playSfx(this.sfxExplosion)

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
    this.playSfx(this.sfxZombieDeath)

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

  private addScore(points: number) {
    this.score += points
    this.scoreText.setText(String(this.score))
  }

  private triggerGameOver() {
    if (this.gameOver) return
    this.gameOver = true
    this.animating = true // block input

    // Stop music
    this.music.stop()

    // Clean up remaining zombies visually
    for (const z of this.zombies) z.destroy()
    this.zombies = []
    for (const fz of this.fireZones) fz.gfx.destroy()
    this.fireZones = []

    const duration = Math.floor((Date.now() - this.gameStartTime) / 1000)
    const wave = this.waveManager.currentWave

    // Brief pause, then show game over screen
    this.time.delayedCall(500, () => {
      this.showGameOverScreen(wave, duration)
    })
  }

  private showGameOverScreen(wave: number, duration: number) {
    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'GAME OVER', {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: '#ff4444',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, [
        `Score: ${this.score}`,
        `Wave: ${wave}`,
      ].join('\n'), {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)

    const rankText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'Submitting score...', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        align: 'center',
      })
      .setOrigin(0.5)

    // Submit score
    submitScore(this.score, duration, { wave }).then((result) => {
      if (result.rank) {
        rankText.setText(`Rank: #${result.rank}`)
        rankText.setColor('#ffcc00')
      } else {
        rankText.setText('Play on run.game for leaderboard!')
      }
    })

    // Play Again button
    const btnBg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 180, 44, 0x336633)
      .setStrokeStyle(2, 0x66cc66)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Play Again', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x448844))
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x336633))
    btnBg.on('pointerdown', () => {
      this.scene.restart()
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
