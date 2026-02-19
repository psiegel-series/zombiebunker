export enum TileType {
  BulletN = 'bullet_n',
  BulletS = 'bullet_s',
  BulletE = 'bullet_e',
  BulletW = 'bullet_w',
  Grenade = 'grenade',
  Gasoline = 'gasoline',
  Medkit = 'medkit',
}

export const ALL_TILE_TYPES: readonly TileType[] = Object.values(TileType)

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.BulletN]: 0xf0c040, // yellow
  [TileType.BulletS]: 0xd4a830, // dark yellow
  [TileType.BulletE]: 0x40a0f0, // blue
  [TileType.BulletW]: 0x8060e0, // purple
  [TileType.Grenade]: 0xe05040, // red
  [TileType.Gasoline]: 0xf08030, // orange
  [TileType.Medkit]: 0x40d070, // green
}

export const TILE_LABELS: Record<TileType, string> = {
  [TileType.BulletN]: '^',
  [TileType.BulletS]: 'v',
  [TileType.BulletE]: '>',
  [TileType.BulletW]: '<',
  [TileType.Grenade]: 'G',
  [TileType.Gasoline]: 'F',
  [TileType.Medkit]: '+',
}
