import { TileType, ALL_TILE_TYPES, baseType } from './TileType'

export const GRID_COLS = 7
export const GRID_ROWS = 7

export interface Match {
  type: TileType
  cells: { row: number; col: number }[]
}

export class Board {
  readonly cells: (TileType | null)[][]

  constructor() {
    this.cells = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null as TileType | null),
    )
    this.fillWithoutMatches()
  }

  get(row: number, col: number): TileType | null {
    return this.cells[row]?.[col] ?? null
  }

  set(row: number, col: number, type: TileType | null) {
    this.cells[row]![col] = type
  }

  swap(r1: number, c1: number, r2: number, c2: number) {
    const tmp = this.get(r1, c1)
    this.set(r1, c1, this.get(r2, c2))
    this.set(r2, c2, tmp)
  }

  /** Shift a row by `offset` positions (positive = right, negative = left). Wraps around. */
  shiftRow(row: number, offset: number) {
    // Normalize to positive modulo
    const n = GRID_COLS
    const shift = ((offset % n) + n) % n
    if (shift === 0) return

    const original = this.cells[row]!.slice()
    for (let col = 0; col < n; col++) {
      this.cells[row]![(col + shift) % n] = original[col]!
    }
  }

  /** Shift a column by `offset` positions (positive = down, negative = up). Wraps around. */
  shiftColumn(col: number, offset: number) {
    const n = GRID_ROWS
    const shift = ((offset % n) + n) % n
    if (shift === 0) return

    const original: (TileType | null)[] = []
    for (let row = 0; row < n; row++) {
      original.push(this.get(row, col))
    }
    for (let row = 0; row < n; row++) {
      this.set((row + shift) % n, col, original[row]!)
    }
  }

  /** Get a snapshot of the current board state for later restoration. */
  snapshot(): (TileType | null)[][] {
    return this.cells.map((row) => row.slice())
  }

  /** Restore the board to a previous snapshot. */
  restore(snapshot: (TileType | null)[][]) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.cells[row]![col] = snapshot[row]![col]!
      }
    }
  }

  /**
   * Find all horizontal and vertical runs of 3+ matching tiles.
   * Powered-up tiles match their base type (e.g. HeavyN matches BulletN).
   * Airstrike is wild — it continues any run but cannot bridge different types.
   * A run of only Airstrikes does not count as a match.
   */
  findMatches(): Match[] {
    const matches: Match[] = []

    // Horizontal runs
    for (let row = 0; row < GRID_ROWS; row++) {
      let col = 0
      while (col < GRID_COLS) {
        const raw = this.get(row, col)
        if (!raw) { col++; continue }

        // Track the locked base type for this run (null until a non-airstrike tile is seen)
        let locked: TileType | null = raw === TileType.Airstrike ? null : baseType(raw)
        let end = col + 1

        while (end < GRID_COLS) {
          const next = this.get(row, end)
          if (!next) break

          if (next === TileType.Airstrike) {
            // Airstrike continues any run
            end++
          } else if (locked === null) {
            // First non-airstrike tile locks the run type
            locked = baseType(next)
            end++
          } else if (baseType(next) === locked) {
            end++
          } else {
            break
          }
        }

        if (end - col >= 3 && locked !== null) {
          const cells = []
          for (let c = col; c < end; c++) cells.push({ row, col: c })
          matches.push({ type: locked, cells })
        }
        col = end
      }
    }

    // Vertical runs
    for (let col = 0; col < GRID_COLS; col++) {
      let row = 0
      while (row < GRID_ROWS) {
        const raw = this.get(row, col)
        if (!raw) { row++; continue }

        let locked: TileType | null = raw === TileType.Airstrike ? null : baseType(raw)
        let end = row + 1

        while (end < GRID_ROWS) {
          const next = this.get(end, col)
          if (!next) break

          if (next === TileType.Airstrike) {
            end++
          } else if (locked === null) {
            locked = baseType(next)
            end++
          } else if (baseType(next) === locked) {
            end++
          } else {
            break
          }
        }

        if (end - row >= 3 && locked !== null) {
          const cells = []
          for (let r = row; r < end; r++) cells.push({ row: r, col })
          matches.push({ type: locked, cells })
        }
        row = end
      }
    }

    return matches
  }

  /**
   * Apply gravity: for each column, shift tiles down to fill nulls.
   * Returns a list of moves: { col, fromRow, toRow } for animation.
   */
  applyGravity(): { col: number; fromRow: number; toRow: number }[] {
    const moves: { col: number; fromRow: number; toRow: number }[] = []

    for (let col = 0; col < GRID_COLS; col++) {
      let writeRow = GRID_ROWS - 1
      for (let readRow = GRID_ROWS - 1; readRow >= 0; readRow--) {
        if (this.get(readRow, col) !== null) {
          if (readRow !== writeRow) {
            this.set(writeRow, col, this.get(readRow, col))
            this.set(readRow, col, null)
            moves.push({ col, fromRow: readRow, toRow: writeRow })
          }
          writeRow--
        }
      }
    }

    return moves
  }

  /**
   * Fill null cells at the top of each column with random tiles.
   * Returns a list of { row, col, type } for animation.
   */
  fillEmpty(): { row: number; col: number; type: TileType }[] {
    const fills: { row: number; col: number; type: TileType }[] = []

    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (this.get(row, col) === null) {
          const type = ALL_TILE_TYPES[Math.floor(Math.random() * ALL_TILE_TYPES.length)]!
          this.set(row, col, type)
          fills.push({ row, col, type })
        }
      }
    }

    return fills
  }

  private fillWithoutMatches() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const forbidden = new Set<TileType>()

        // Check horizontal: if two to the left are the same, forbid that type
        if (col >= 2 && this.get(row, col - 1) === this.get(row, col - 2)) {
          const t = this.get(row, col - 1)
          if (t) forbidden.add(t)
        }

        // Check vertical: if two above are the same, forbid that type
        if (row >= 2 && this.get(row - 1, col) === this.get(row - 2, col)) {
          const t = this.get(row - 1, col)
          if (t) forbidden.add(t)
        }

        const allowed = ALL_TILE_TYPES.filter((t) => !forbidden.has(t))
        this.set(row, col, allowed[Math.floor(Math.random() * allowed.length)]!)
      }
    }
  }
}
