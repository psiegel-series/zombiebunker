import { TileType, ALL_TILE_TYPES } from './TileType'

export const GRID_COLS = 7
export const GRID_ROWS = 7

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
