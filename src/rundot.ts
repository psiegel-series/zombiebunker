import { game } from './main'

let initialized = false

export function initRundot() {
  if (initialized) return
  initialized = true

  try {
    // Dynamic import so the game still runs outside the run.game host
    import('@series-inc/rundot-game-sdk/api')
      .then((module) => {
        const RundotGameAPI = module.default

        RundotGameAPI.lifecycles.onPause(() => {
          game.pause()
          console.log('[Rundot] Game paused')
        })

        RundotGameAPI.lifecycles.onResume(() => {
          game.resume()
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
