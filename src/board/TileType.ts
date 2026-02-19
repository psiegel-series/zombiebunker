export enum TileType {
  BulletN = 'bullet_n',
  BulletS = 'bullet_s',
  BulletE = 'bullet_e',
  BulletW = 'bullet_w',
  Grenade = 'grenade',
  Gasoline = 'gasoline',
  Medkit = 'medkit',
  // Powered-up versions (from 4-matches)
  HeavyN = 'heavy_n',
  HeavyS = 'heavy_s',
  HeavyE = 'heavy_e',
  HeavyW = 'heavy_w',
  Rocket = 'rocket',
  Napalm = 'napalm',
  MegaMedkit = 'mega_medkit',
  // Special (from 5-match / T / L shapes)
  Airstrike = 'airstrike',
}

/** The 7 base tile types that spawn naturally on the board. */
export const ALL_TILE_TYPES: readonly TileType[] = [
  TileType.BulletN,
  TileType.BulletS,
  TileType.BulletE,
  TileType.BulletW,
  TileType.Grenade,
  TileType.Gasoline,
  TileType.Medkit,
]

/** Map a powered-up tile to its base type for match detection. */
export function baseType(t: TileType): TileType {
  switch (t) {
    case TileType.HeavyN: return TileType.BulletN
    case TileType.HeavyS: return TileType.BulletS
    case TileType.HeavyE: return TileType.BulletE
    case TileType.HeavyW: return TileType.BulletW
    case TileType.Rocket: return TileType.Grenade
    case TileType.Napalm: return TileType.Gasoline
    case TileType.MegaMedkit: return TileType.Medkit
    default: return t
  }
}

/** Map a base tile type to its powered-up version. */
export function poweredType(t: TileType): TileType {
  switch (t) {
    case TileType.BulletN: return TileType.HeavyN
    case TileType.BulletS: return TileType.HeavyS
    case TileType.BulletE: return TileType.HeavyE
    case TileType.BulletW: return TileType.HeavyW
    case TileType.Grenade: return TileType.Rocket
    case TileType.Gasoline: return TileType.Napalm
    case TileType.Medkit: return TileType.MegaMedkit
    default: return t
  }
}

export function isPoweredUp(t: TileType): boolean {
  return t !== baseType(t)
}

export const TILE_COLORS: Record<TileType, number> = {
  [TileType.BulletN]: 0xf0c040,
  [TileType.BulletS]: 0xd4a830,
  [TileType.BulletE]: 0x40a0f0,
  [TileType.BulletW]: 0x8060e0,
  [TileType.Grenade]: 0xe05040,
  [TileType.Gasoline]: 0xf08030,
  [TileType.Medkit]: 0x40d070,
  [TileType.HeavyN]: 0xf0c040,
  [TileType.HeavyS]: 0xd4a830,
  [TileType.HeavyE]: 0x40a0f0,
  [TileType.HeavyW]: 0x8060e0,
  [TileType.Rocket]: 0xe05040,
  [TileType.Napalm]: 0xf08030,
  [TileType.MegaMedkit]: 0x40d070,
  [TileType.Airstrike]: 0xffffff,
}

export const TILE_LABELS: Record<TileType, string> = {
  [TileType.BulletN]: '^',
  [TileType.BulletS]: 'v',
  [TileType.BulletE]: '>',
  [TileType.BulletW]: '<',
  [TileType.Grenade]: 'G',
  [TileType.Gasoline]: 'F',
  [TileType.Medkit]: '+',
  [TileType.HeavyN]: '⊼',
  [TileType.HeavyS]: '⊽',
  [TileType.HeavyE]: '⊳',
  [TileType.HeavyW]: '⊲',
  [TileType.Rocket]: 'R',
  [TileType.Napalm]: 'N',
  [TileType.MegaMedkit]: '✚',
  [TileType.Airstrike]: '★',
}
