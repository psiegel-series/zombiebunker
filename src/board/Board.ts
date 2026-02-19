import { TileType, ALL_TILE_TYPES } from './TileType'

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

  /** Check if swapping two cells would produce a match involving either cell. Does not mutate the board. */
  wouldMatch(r1: number, c1: number, r2: number, c2: number): boolean {
    this.swap(r1, c1, r2, c2)
    const hasMatch = this.findMatchesAt(r1, c1) || this.findMatchesAt(r2, c2)
    this.swap(r1, c1, r2, c2)
    return hasMatch
  }

  /** Check if a specific cell is part of a 3+ run horizontally or vertically. */
  private findMatchesAt(row: number, col: number): boolean {
    const t = this.get(row, col)
    if (!t) return false

    // Horizontal run through (row, col)
    let left = col
    while (left > 0 && this.get(row, left - 1) === t) left--
    let right = col
    while (right < GRID_COLS - 1 && this.get(row, right + 1) === t) right++
    if (right - left + 1 >= 3) return true

    // Vertical run through (row, col)
    let top = row
    while (top > 0 && this.get(top - 1, col) === t) top--
    let bottom = row
    while (bottom < GRID_ROWS - 1 && this.get(bottom + 1, col) === t) bottom++
    if (bottom - top + 1 >= 3) return true

    return false
  }

  /** Find all horizontal and vertical runs of 3+ matching tiles. */
  findMatches(): Match[] {
    const matches: Match[] = []

    // Horizontal runs
    for (let row = 0; row < GRID_ROWS; row++) {
      let col = 0
      while (col < GRID_COLS) {
        const t = this.get(row, col)
        if (!t) { col++; continue }
        let end = col + 1
        while (end < GRID_COLS && this.get(row, end) === t) end++
        if (end - col >= 3) {
          const cells = []
          for (let c = col; c < end; c++) cells.push({ row, col: c })
          matches.push({ type: t, cells })
        }
        col = end
      }
    }

    // Vertical runs
    for (let col = 0; col < GRID_COLS; col++) {
      let row = 0
      while (row < GRID_ROWS) {
        const t = this.get(row, col)
        if (!t) { row++; continue }
        let end = row + 1
        while (end < GRID_ROWS && this.get(end, col) === t) end++
        if (end - row >= 3) {
          const cells = []
          for (let r = row; r < end; r++) cells.push({ row: r, col })
          matches.push({ type: t, cells })
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
