import type { ItemId } from "./blocks";
import type { Dim } from "./world";

export type MobType = "blaze" | "enderman" | "dragon";

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Pickaxe tier: 1 wood, 2 stone, 3 iron, 4 diamond. */
  tier: number;
  faceX: number;
  faceY: number;
  walk: number;
  hurt: number;
  invuln: number;
  attackCd: number;
  swing: number;
  lavaTick: number;
}

export interface Mob {
  id: number;
  type: MobType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hurt: number;
  atkCd: number;
  shootCd: number;
  wander: number;
  dirX: number;
  dirY: number;
  phase: number;
  seed: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  color: string;
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  dim: Dim;
  player: Player;
  inv: Partial<Record<ItemId, number>>;
  mobs: Mob[];
  projectiles: Projectile[];
  particles: Particle[];
  discovered: Set<string>;
  /** Tile position of the portal the player built, if any. */
  overworldPortal: Point | null;
  endActivated: boolean;
  blocksMined: number;
  travel: number;
  startedAt: number;
  started: boolean;
  paused: boolean;
  dead: boolean;
  won: boolean;
  deathCause: string;
  dragonSpawned: boolean;
  /** Timer between ambient Nether mob spawns. */
  spawnCd: number;
}

export function emptyState(): GameState {
  return {
    dim: "overworld",
    player: {
      x: 0,
      y: 0,
      hp: 20,
      maxHp: 20,
      tier: 1,
      faceX: 0,
      faceY: 1,
      walk: 0,
      hurt: 0,
      invuln: 0,
      attackCd: 0,
      swing: 0,
      lavaTick: 0,
    },
    inv: {},
    mobs: [],
    projectiles: [],
    particles: [],
    discovered: new Set(),
    overworldPortal: null,
    endActivated: false,
    blocksMined: 0,
    travel: 0,
    startedAt: 0,
    started: false,
    paused: false,
    dead: false,
    won: false,
    deathCause: "",
    dragonSpawned: false,
    spawnCd: 0,
  };
}
