import { TileType } from './TileType'
import { Match } from './Board'

export interface MatchEffect {
  type: TileType
  count: number
  powered: boolean
  airstrike: boolean
}

const EFFECT_NAMES: Partial<Record<TileType, string>> = {
  [TileType.BulletN]: 'Bullet N fired',
  [TileType.BulletS]: 'Bullet S fired',
  [TileType.BulletE]: 'Bullet E fired',
  [TileType.BulletW]: 'Bullet W fired',
  [TileType.Grenade]: 'Grenade launched (targets densest cluster)',
  [TileType.Gasoline]: 'Gasoline burst (damages nearby zombies)',
  [TileType.Medkit]: 'Medkit heal',
  [TileType.Airstrike]: 'Airstrike (damages all zombies)',
}

export function dispatchMatchEffects(
  matches: Match[],
  containsPowered: (match: Match) => boolean,
  containsAirstrike: (match: Match) => boolean,
  onEffect?: (effect: MatchEffect) => void,
) {
  for (const match of matches) {
    const powered = containsPowered(match)
    const airstrike = containsAirstrike(match)
    const effect: MatchEffect = {
      type: match.type,
      count: match.cells.length,
      powered,
      airstrike,
    }
    const name = EFFECT_NAMES[match.type] ?? match.type
    const suffix = airstrike ? ' [AIRSTRIKE]' : powered ? ' [POWERED]' : ''
    console.log(`[Effect] ${name} (x${match.cells.length})${suffix}`)
    onEffect?.(effect)
  }
}
