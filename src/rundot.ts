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

export async function getLeaderboardScores(): Promise<{
  scores: { rank: number; username: string; score: number; wave: number | null }[]
  myRank: number | null
}> {
  if (!api) {
    console.log('[Rundot] Leaderboard fetch skipped (no SDK)')
    return { scores: [], myRank: null }
  }

  try {
    const [pagedResult, rankResult] = await Promise.all([
      api.leaderboard.getPagedScores({ limit: 20 }),
      api.leaderboard.getMyRank().catch(() => null),
    ])

    const scores = (pagedResult?.entries ?? []).map(
      (entry: any, i: number) => ({
        rank: entry.rank ?? i + 1,
        username: entry.username ?? entry.displayName ?? 'Unknown',
        score: entry.score ?? 0,
        wave: entry.metadata?.wave ?? null,
      }),
    )

    const myRank = rankResult?.rank ?? null
    console.log(`[Rundot] Leaderboard fetched: ${scores.length} entries, my rank: ${myRank}`)
    return { scores, myRank }
  } catch (err) {
    console.error('[Rundot] Leaderboard fetch failed:', err)
    return { scores: [], myRank: null }
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
