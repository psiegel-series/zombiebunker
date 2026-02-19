import Phaser from 'phaser'

export enum ZombieType {
  Walker = 'walker',
  Runner = 'runner',
  Tank = 'tank',
  Boss = 'boss',
}

interface ZombieConfig {
  hp: number
  speed: number
  radius: number
  damage: number
  textureKey: string
}

const ZOMBIE_CONFIGS: Record<ZombieType, ZombieConfig> = {
  [ZombieType.Walker]: {
    hp: 20,
    speed: 5,
    textureKey: 'zombie_walker',
    radius: 10,
    damage: 10,
  },
  [ZombieType.Runner]: {
    hp: 12,
    speed: 18,
    textureKey: 'zombie_runner',
    radius: 8,
    damage: 8,
  },
  [ZombieType.Tank]: {
    hp: 80,
    speed: 5,
    textureKey: 'zombie_tank',
    radius: 14,
    damage: 20,
  },
  [ZombieType.Boss]: {
    hp: 250,
    speed: 10,
    textureKey: 'zombie_boss',
    radius: 20,
    damage: 35,
  },
}

export class Zombie {
  readonly type: ZombieType
  hp: number
  readonly maxHp: number
  readonly speed: number
  readonly damage: number
  readonly radius: number
  x: number
  y: number
  readonly body: Phaser.GameObjects.Sprite
  readonly hpBar: Phaser.GameObjects.Rectangle
  readonly hpBarBg: Phaser.GameObjects.Rectangle
  private dead = false

  constructor(scene: Phaser.Scene, x: number, y: number, type: ZombieType) {
    const cfg = ZOMBIE_CONFIGS[type]
    this.type = type
    this.hp = cfg.hp
    this.maxHp = cfg.hp
    this.speed = cfg.speed
    this.damage = cfg.damage
    this.radius = cfg.radius
    this.x = x
    this.y = y

    this.body = scene.add.sprite(x, y, cfg.textureKey)
      .setDisplaySize(cfg.radius * 2, cfg.radius * 2)

    const barW = cfg.radius * 2.5
    const barH = 3
    const barY = y - cfg.radius - 4
    this.hpBarBg = scene.add.rectangle(x, barY, barW, barH, 0x333333)
    this.hpBar = scene.add
      .rectangle(x - barW / 2, barY, barW, barH, 0xcc3333)
      .setOrigin(0, 0.5)
  }

  get isDead() {
    return this.dead
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp <= 0) {
      this.dead = true
    }
    this.updateHpBar()
  }

  /** Move toward (tx, ty) by speed * dt. Returns true if within contactRadius of target. */
  moveToward(tx: number, ty: number, dt: number, targetRadius = 0): boolean {
    const dx = tx - this.x
    const dy = ty - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const touchDist = targetRadius + this.radius

    // Rotate sprite to face target (sprites face south/down by default)
    this.body.rotation = Math.atan2(dy, dx) - Math.PI / 2

    if (dist <= touchDist) return true

    const step = this.speed * dt
    this.setPosition(this.x + (dx / dist) * step, this.y + (dy / dist) * step)

    const newDx = tx - this.x
    const newDy = ty - this.y
    const newDist = Math.sqrt(newDx * newDx + newDy * newDy)
    return newDist <= touchDist
  }

  private setPosition(x: number, y: number) {
    this.x = x
    this.y = y
    this.body.setPosition(x, y)
    const barW = this.radius * 2.5
    const barY = y - this.radius - 4
    this.hpBarBg.setPosition(x, barY)
    this.hpBar.setPosition(x - barW / 2, barY)
  }

  private updateHpBar() {
    const fraction = this.hp / this.maxHp
    const maxWidth = this.hpBarBg.width
    this.hpBar.width = maxWidth * fraction
  }

  destroy() {
    this.body.destroy()
    this.hpBar.destroy()
    this.hpBarBg.destroy()
  }
}
