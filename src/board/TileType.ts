export enum TileType {
  Bullets = 'bullets',
  CW = 'cw',
  CCW = 'ccw',
  Grenade = 'grenade',
  Gasoline = 'gasoline',
  Medkit = 'medkit',
  Boxes = 'boxes',
}

export const ALL_TILE_TYPES: readonly TileType[] = Object.values(TileType)

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.Bullets]:  0xf0c040, // yellow
  [TileType.CW]:       0x40a0f0, // blue
  [TileType.CCW]:      0x8060e0, // purple
  [TileType.Grenade]:  0xe05040, // red
  [TileType.Gasoline]: 0xf08030, // orange
  [TileType.Medkit]:   0x40d070, // green
  [TileType.Boxes]:    0x8a7060, // brown
}

export const TILE_LABELS: Record<TileType, string> = {
  [TileType.Bullets]:  'B',
  [TileType.CW]:       '>',
  [TileType.CCW]:      '<',
  [TileType.Grenade]:  'G',
  [TileType.Gasoline]: 'F',
  [TileType.Medkit]:   '+',
  [TileType.Boxes]:    '#',
}
