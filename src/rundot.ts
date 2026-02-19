import { game } from './main'

let initialized = false
let api: any = null

export function initRundot() {
  if (initialized) return
  initialized = true

  try {
    // Dynamic import so the game still runs outside the run.game host
    import('@series-inc/rundot-game-sdk/api')
      .then((module) => {
        const RundotGameAPI = module.default
        api = RundotGameAPI

        RundotGameAPI.lifecycles.onPause(() => {
          game.pause()
          game.sound.mute = true
          console.log('[Rundot] Game paused')
        })

        RundotGameAPI.lifecycles.onResume(() => {
          game.resume()
          game.sound.mute = false
          console.log('[Rundot] Game resumed')
        })

        console.log('[Rundot] SDK initialized, lifecycle hooks registered')
      })
      .catch(() => {
        console.log('[Rundot] SDK not available (running outside run.game host)')
      })
  } catch {
    console.log('[Rundot] SDK not available (running outside run.game host)')
  }
}

export async function submitScore(
  score: number,
  duration: number,
  metadata?: Record<string, unknown>,
): Promise<{ rank?: number }> {
  if (!api) {
    console.log(`[Rundot] Score submission skipped (no SDK). Score: ${score}, Duration: ${duration}s`)
    return {}
  }

  try {
    const result = await api.leaderboard.submitScore({ score, duration, metadata })
    console.log(`[Rundot] Score submitted. Rank: ${result.rank}`)
    return { rank: result.rank }
  } catch (err) {
    console.error('[Rundot] Score submission failed:', err)
    return {}
  }
}
