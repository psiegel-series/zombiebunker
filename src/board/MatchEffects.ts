import { TileType } from './TileType'
import { Match } from './Board'

export interface MatchEffect {
  type: TileType
  count: number
}

const EFFECT_NAMES: Record<TileType, string> = {
  [TileType.BulletN]: 'Bullet N fired',
  [TileType.BulletS]: 'Bullet S fired',
  [TileType.BulletE]: 'Bullet E fired',
  [TileType.BulletW]: 'Bullet W fired',
  [TileType.Grenade]: 'Grenade launched (targets densest cluster)',
  [TileType.Gasoline]: 'Gasoline burst (damages nearby zombies)',
  [TileType.Medkit]: 'Medkit heal',
}

export function dispatchMatchEffects(
  matches: Match[],
  onEffect?: (effect: MatchEffect) => void,
) {
  for (const match of matches) {
    const effect: MatchEffect = { type: match.type, count: match.cells.length }
    console.log(`[Effect] ${EFFECT_NAMES[match.type]} (x${match.cells.length})`)
    onEffect?.(effect)
  }
}
