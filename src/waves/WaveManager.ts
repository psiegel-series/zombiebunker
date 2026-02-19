import { ZombieType } from '../entities/Zombie'

export interface WaveSpawn {
  type: ZombieType
  count: number
}

export interface WaveData {
  number: number
  spawns: WaveSpawn[]
  spawnInterval: number // ms between individual spawns
}

const WAVE_BREAK_MS = 5000
const BASE_SPAWN_INTERVAL = 1200

export function generateWave(waveNum: number): WaveData {
  const spawns: WaveSpawn[] = []

  // Walkers: start at 3, grow each wave
  const walkerCount = 2 + waveNum
  spawns.push({ type: ZombieType.Walker, count: walkerCount })

  // Runners from wave 3+
  if (waveNum >= 3) {
    const runnerCount = Math.floor((waveNum - 2) * 1.5)
    spawns.push({ type: ZombieType.Runner, count: runnerCount })
  }

  // Tanks from wave 5+
  if (waveNum >= 5) {
    const tankCount = Math.floor((waveNum - 4) * 0.8)
    spawns.push({ type: ZombieType.Tank, count: tankCount })
  }

  // Boss every 5 waves
  if (waveNum % 5 === 0) {
    spawns.push({ type: ZombieType.Boss, count: 1 })
  }

  // Speed up spawning as waves progress
  const spawnInterval = Math.max(400, BASE_SPAWN_INTERVAL - waveNum * 50)

  return { number: waveNum, spawns, spawnInterval }
}

export type WaveState = 'spawning' | 'active' | 'break' | 'idle'

export class WaveManager {
  private waveNum = 0
  private state: WaveState = 'idle'
  private spawnQueue: ZombieType[] = []
  private spawnTimer = 0
  private spawnInterval = BASE_SPAWN_INTERVAL
  private breakTimer = 0
  private totalSpawnedThisWave = 0
  private onSpawn: (type: ZombieType) => void
  private onWaveStart: (waveNum: number) => void
  private onWaveComplete: (waveNum: number) => void

  constructor(callbacks: {
    onSpawn: (type: ZombieType) => void
    onWaveStart: (waveNum: number) => void
    onWaveComplete: (waveNum: number) => void
  }) {
    this.onSpawn = callbacks.onSpawn
    this.onWaveStart = callbacks.onWaveStart
    this.onWaveComplete = callbacks.onWaveComplete
  }

  get currentWave() {
    return this.waveNum
  }

  get currentState() {
    return this.state
  }

  /** Start the first wave. */
  start() {
    this.startNextWave()
  }

  /** Call every frame with delta in ms and the current zombie count on field. */
  update(deltaMs: number, aliveZombieCount: number) {
    switch (this.state) {
      case 'spawning':
        this.spawnTimer -= deltaMs
        if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
          const type = this.spawnQueue.shift()!
          this.onSpawn(type)
          this.totalSpawnedThisWave++
          this.spawnTimer = this.spawnInterval
        }
        // When queue is empty, switch to active (waiting for all zombies to die)
        if (this.spawnQueue.length === 0) {
          this.state = 'active'
        }
        break

      case 'active':
        // All zombies spawned; wait for them all to be killed
        if (aliveZombieCount === 0) {
          this.onWaveComplete(this.waveNum)
          this.state = 'break'
          this.breakTimer = WAVE_BREAK_MS
        }
        break

      case 'break':
        this.breakTimer -= deltaMs
        if (this.breakTimer <= 0) {
          this.startNextWave()
        }
        break
    }
  }

  private startNextWave() {
    this.waveNum++
    const wave = generateWave(this.waveNum)
    this.spawnInterval = wave.spawnInterval
    this.totalSpawnedThisWave = 0

    // Build a shuffled spawn queue
    this.spawnQueue = []
    for (const spawn of wave.spawns) {
      for (let i = 0; i < spawn.count; i++) {
        this.spawnQueue.push(spawn.type)
      }
    }
    // Shuffle so types are interleaved
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j]!, this.spawnQueue[i]!]
    }

    this.spawnTimer = 0
    this.state = 'spawning'
    this.onWaveStart(this.waveNum)
  }
}
